import {formatInr} from '@sc/contracts';
import {env} from '../config/env.js';
import {prisma} from '../lib/db.js';
import {ulid} from '../lib/ids.js';
import {logger} from '../lib/logger.js';
import {sendMail} from '../lib/mail.js';
import {transaction, affected} from '../lib/tx.js';
import {releaseHolds, moveOrder, lockOrder} from './orders.js';
import {reconcilePayment} from './payments.js';
import {submitRefund} from './refunds.js';
import {syncShipments} from './shipping.js';
import type {OrderStatus} from '@sc/contracts';
import {customerBookingMail, teamBookingMail} from './site-mail.js';

/**
 * Finite, UTC, idempotent jobs (ADR-0007). Hostinger Cron runs `node dist/scripts/run-jobs.js` (or calls
 * POST /internal/jobs/run) every minute; each job takes a lease, processes a bounded batch and exits. No loops.
 */
const BATCH = 100;
const UNPAID_GRACE_MS = 30 * 60_000; // keep unpaid orders open 30 min past the window for late provider confirmation

/** Per-job lease using a conditional UPDATE on site_settings (works on MySQL 8 and MariaDB; no session locks). */
async function withLease<T>(name: string, ttlMs: number, fn: () => Promise<T>): Promise<T | 'SKIPPED_LOCKED'> {
  const key = `lease:${name}`;
  const owner = ulid();
  const now = Date.now();
  await prisma.$executeRaw`INSERT IGNORE INTO site_settings (\`key\`, value_json, updated_at) VALUES (${key}, JSON_OBJECT('owner', '', 'until', 0), UTC_TIMESTAMP(3))`;
  const got = await prisma.$executeRaw`UPDATE site_settings SET value_json=JSON_OBJECT('owner', ${owner}, 'until', ${now + ttlMs}), updated_at=UTC_TIMESTAMP(3) WHERE \`key\`=${key} AND CAST(JSON_UNQUOTE(JSON_EXTRACT(value_json, '$.until')) AS DECIMAL(20,0)) < ${now}`;
  if (affected(got) !== 1) return 'SKIPPED_LOCKED';
  try { return await fn(); } finally {
    await prisma.$executeRaw`UPDATE site_settings SET value_json=JSON_OBJECT('owner', '', 'until', 0) WHERE \`key\`=${key} AND JSON_UNQUOTE(JSON_EXTRACT(value_json, '$.owner'))=${owner}`;
  }
}

export async function expireHolds(now = new Date()) {
  const due = await prisma.inventoryReservation.findMany({where: {status: 'HELD', expiresAt: {lt: now}}, select: {orderId: true}, distinct: ['orderId'], take: BATCH});
  let released = 0;
  for (const {orderId} of due) {
    await transaction(async (tx) => {
      await lockOrder(tx, orderId);
      const holds = await tx.inventoryReservation.findMany({where: {orderId, status: 'HELD', expiresAt: {lt: now}}});
      for (const h of holds) {
        const n = await tx.$executeRaw`UPDATE inventory_reservations SET status='RELEASED', released_at=${now} WHERE id=${h.id} AND status='HELD'`;
        if (affected(n) === 1) {
          await tx.$executeRaw`UPDATE inventory_items SET reserved_qty=reserved_qty-${h.qty}, version=version+1, updated_at=UTC_TIMESTAMP(3) WHERE variant_id=${h.variantId} AND reserved_qty>=${h.qty}`;
          released++;
        }
      }
    });
  }
  return {released};
}

/** Before cancelling, ask the provider once more; a capture found here is applied instead of cancelling. */
export async function cancelUnpaid(now = new Date()) {
  const orders = await prisma.order.findMany({where: {status: {in: ['AWAITING_PAYMENT', 'PAYMENT_FAILED']}, paymentDueAt: {lt: new Date(now.getTime() - UNPAID_GRACE_MS)}}, include: {payments: true}, take: BATCH});
  let cancelled = 0, rescued = 0;
  for (const order of orders) {
    let paid = false;
    for (const p of order.payments) {
      const r = await reconcilePayment(p.id).catch((e) => { logger.warn({err: e, orderId: order.id}, 'reconcile before cancel failed'); return 'ERROR'; });
      if (r === 'ERROR') { paid = true; break; } // provider unreachable: do not cancel blind, try next run
      if (['PAID', 'PAID_REVIEW', 'ALREADY_RECONCILED', 'DUPLICATE'].includes(r)) { paid = true; rescued++; }
    }
    if (paid) continue;
    await transaction(async (tx) => {
      await lockOrder(tx, order.id);
      const fresh = await tx.order.findUniqueOrThrow({where: {id: order.id}});
      if (!['AWAITING_PAYMENT', 'PAYMENT_FAILED'].includes(fresh.status)) return;
      await moveOrder(tx, order.id, fresh.status as OrderStatus, 'CANCELLED', null, 'Payment not received within the payment window', {cancelledAt: now});
      await releaseHolds(tx, order.id, now);
      if (fresh.customRequestId) await tx.customRequest.updateMany({where: {id: fresh.customRequestId, status: 'PAYMENT_PENDING'}, data: {status: 'EXPIRED'}});
      cancelled++;
    });
  }
  return {cancelled, rescued};
}

/** Payments created 5+ minutes ago that are still not captured: ask the provider (lost browser / missed webhook). */
export async function reconcile(now = new Date()) {
  const stale = await prisma.payment.findMany({
    where: {status: {in: ['CREATED', 'AUTHORIZED', 'FAILED']}, createdAt: {lt: new Date(now.getTime() - 5 * 60_000), gt: new Date(now.getTime() - 3 * 86_400_000)}, order: {status: {in: ['AWAITING_PAYMENT', 'PAYMENT_FAILED', 'CANCELLED']}}},
    select: {id: true}, take: 50, orderBy: {createdAt: 'asc'},
  });
  const results: Record<string, number> = {};
  for (const p of stale) {
    const r = await reconcilePayment(p.id).catch(() => 'ERROR');
    results[r] = (results[r] ?? 0) + 1;
  }
  return results;
}

/** Commissions whose hold period has passed on a delivered (or completed custom) order become APPROVED. */
export async function approveCommissions(now = new Date()) {
  const due = await prisma.affiliateCommission.findMany({where: {status: 'PENDING', approvableAt: {lte: now}}, include: {}, take: BATCH});
  let approved = 0;
  for (const c of due) {
    const order = await prisma.order.findUnique({where: {id: c.orderId}, select: {status: true, customRequestId: true}});
    const custom = order?.customRequestId ? await prisma.customRequest.findUnique({where: {id: order.customRequestId}, select: {status: true}}) : null;
    const settled = order && (order.status === 'DELIVERED' || custom?.status === 'COMPLETED');
    if (!settled) continue;
    const n = await prisma.affiliateCommission.updateMany({where: {id: c.id, status: 'PENDING'}, data: {status: 'APPROVED', decisionNote: 'Approved automatically after the return window'}});
    approved += n.count;
  }
  return {approved};
}

// ---- Outbox
type Job = {id: string; type: string; payloadJson: unknown; attempts: number; maxAttempts: number};
async function orderMail(orderId: string, subject: (code: string) => string, body: (o: {publicCode: string; totalPaise: bigint}) => string, tag: string) {
  const o = await prisma.order.findUnique({where: {id: orderId}, select: {email: true, publicCode: true, totalPaise: true}});
  if (!o) return;
  await sendMail({to: o.email, subject: subject(o.publicCode), text: body(o), tag});
}
const site = () => env().APP_BASE_URL;
const HANDLERS: Record<string, (payload: Record<string, unknown>) => Promise<void>> = {
  'email.site_booking_customer': (p) => customerBookingMail(String(p['bookingId'])),
  'email.site_booking_team': (p) => teamBookingMail(String(p['bookingId'])),
  'email.order_paid': (p) => orderMail(String(p['orderId']), (c) => `Order ${c} confirmed`, (o) => `Thank you. We have received your payment of ${formatInr(o.totalPaise)} for order ${o.publicCode}.\nTrack it at ${site()}/account/orders`, 'order_paid'),
  'email.order_shipped': (p) => orderMail(String(p['orderId']), (c) => `Order ${c} has shipped`, (o) => `Your order ${o.publicCode} is on its way. Tracking: ${String(p['courier'] ?? '')} ${String(p['trackingNo'] ?? '')}`, 'order_shipped'),
  'email.out_for_delivery': (p) => orderMail(String(p['orderId']), (c) => `Order ${c} is out for delivery`, (o) => `Your order ${o.publicCode} is out for delivery today. Track it at ${site()}/track`, 'out_for_delivery'),
  'email.delivery_feedback_request': (p) => orderMail(String(p['orderId']), (c) => `How was the delivery of ${c}?`, (o) => `Your order ${o.publicCode} was delivered. Tell us how the delivery went (one minute): ${site()}/account/orders`, 'delivery_feedback'),
  'email.refund_processed': (p) => orderMail(String(p['orderId']), (c) => `Refund processed for ${c}`, (o) => `A refund for order ${o.publicCode} has been processed. It can take 5–7 working days to reach your account, depending on your bank.`, 'refund'),
  'email.quote_sent': async (p) => { if (p['email']) await sendMail({to: String(p['email']), subject: `Your quotation ${String(p['referenceCode'])}`, text: `Your made-to-order wristwatch quotation is ready. View it at ${site()}/custom-wristwatch/status`, tag: 'quote'}); },
  'email.request_received': async (p) => { if (p['email']) await sendMail({to: String(p['email']), subject: `We received your request ${String(p['referenceCode'])}`, text: `Reference ${String(p['referenceCode'])}. Keep this email: you can check progress at ${site()}/custom-wristwatch/status`, tag: 'request'}); },
  'email.partner_invite': async (p) => { if (p['email']) await sendMail({to: String(p['email']), subject: 'You are invited to the NumericcVaastu partner programme', text: `Sign in with this email address at ${site()}/partner to see your links, clicks, orders and earnings.`, tag: 'partner_invite'}); },
  'finance.alert': async (p) => { logger.warn({alert: p}, 'finance alert'); },
  'refund.submit': async (p) => { await submitRefund(String(p['refundId'])); },
  'web.revalidate': async (p) => {
    const secret = env().WEB_REVALIDATE_SECRET;
    if (!secret) return;
    const res = await fetch(`${site()}/api/revalidate`, {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${secret}`}, body: JSON.stringify(p), signal: AbortSignal.timeout(5000)});
    if (!res.ok) throw new Error(`revalidate ${res.status}`);
  },
};

export async function runOutbox(now = new Date()) {
  const worker = ulid();
  const lockUntil = new Date(now.getTime() + 120_000);
  await prisma.$executeRaw`UPDATE job_outbox SET status='RUNNING', locked_by=${worker}, lock_until=${lockUntil}, attempts=attempts+1 WHERE status IN ('PENDING','RUNNING') AND run_after<=${now} AND (lock_until IS NULL OR lock_until<${now}) ORDER BY run_after LIMIT 50`;
  const jobs = (await prisma.jobOutbox.findMany({where: {lockedBy: worker, status: 'RUNNING'}})) as Job[];
  let done = 0, retried = 0, dead = 0;
  for (const job of jobs) {
    const handler = HANDLERS[job.type];
    try {
      if (!handler) throw new Error(`No handler for ${job.type}`);
      await handler((job.payloadJson ?? {}) as Record<string, unknown>);
      await prisma.jobOutbox.updateMany({where: {id: job.id, lockedBy: worker}, data: {status: 'DONE', completedAt: new Date(), lockUntil: null, lastError: null}});
      done++;
    } catch (error) {
      const final = !handler || job.attempts >= job.maxAttempts;
      const backoff = Math.min(2 ** job.attempts * 30_000, 6 * 3600_000);
      await prisma.jobOutbox.updateMany({where: {id: job.id, lockedBy: worker}, data: {status: final ? 'DEAD' : 'PENDING', lockUntil: null, runAfter: new Date(Date.now() + backoff), lastError: String((error as Error).message ?? error).slice(0, 1000)}});
      if (final) { dead++; logger.error({jobId: job.id, type: job.type}, 'outbox job dead'); } else retried++;
    }
  }
  return {claimed: jobs.length, done, retried, dead};
}

/** Housekeeping: expired idempotency keys, OTPs, sessions, carts, old mock-provider state and finished outbox rows. */
export async function cleanup(now = new Date()) {
  const day = 86_400_000;
  const [keys, otps, sessions, carts, outbox] = await Promise.all([
    prisma.idempotencyKey.deleteMany({where: {expiresAt: {lt: now}}}),
    prisma.otpChallenge.deleteMany({where: {expiresAt: {lt: new Date(now.getTime() - day)}}}),
    prisma.session.deleteMany({where: {OR: [{expiresAt: {lt: now}}, {revokedAt: {lt: new Date(now.getTime() - 7 * day)}}]}}),
    prisma.cart.deleteMany({where: {expiresAt: {lt: now}}}),
    prisma.jobOutbox.deleteMany({where: {status: 'DONE', completedAt: {lt: new Date(now.getTime() - 30 * day)}}}),
  ]);
  return {idempotencyKeys: keys.count, otps: otps.count, sessions: sessions.count, carts: carts.count, outbox: outbox.count};
}

type JobDef = {ttl: number; run: () => Promise<unknown>};
export const JOBS: Record<string, JobDef> = {
  'expire-holds': {ttl: 60_000, run: expireHolds},
  'cancel-unpaid': {ttl: 120_000, run: cancelUnpaid},
  reconcile: {ttl: 120_000, run: reconcile},
  outbox: {ttl: 120_000, run: runOutbox},
  'approve-commissions': {ttl: 120_000, run: approveCommissions},
  'sync-shipments': {ttl: 300_000, run: syncShipments},
  cleanup: {ttl: 300_000, run: cleanup},
} as const;
export type JobName = 'expire-holds' | 'cancel-unpaid' | 'reconcile' | 'outbox' | 'approve-commissions' | 'sync-shipments' | 'cleanup';

export async function runJobs(only?: JobName[]) {
  const results: Record<string, unknown> = {};
  for (const [name, job] of Object.entries(JOBS) as [JobName, JobDef][]) {
    if (only && !only.includes(name)) continue;
    const started = Date.now();
    try {
      results[name] = {result: await withLease(name, job.ttl, () => job.run()), ms: Date.now() - started};
    } catch (error) {
      logger.error({err: error, job: name}, 'job failed');
      results[name] = {error: (error as Error).message, ms: Date.now() - started};
    }
  }
  return results;
}
