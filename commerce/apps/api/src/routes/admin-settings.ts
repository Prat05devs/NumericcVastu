import {Router} from 'express';
import {z} from 'zod';
import * as C from '@sc/contracts';
import {env} from '../config/env.js';
import {prisma} from '../lib/db.js';
import {AppError, notFound} from '../lib/errors.js';
import {ulid} from '../lib/ids.js';
import {hashPassword} from '../lib/crypto.js';
import {noStore, param, parse, route, send, toPlain, mounted} from '../lib/http.js';
import {audit} from '../lib/audit.js';
import {SETTINGS, getSetting, putSetting, type SettingKey} from '../lib/settings.js';
import {deleteSecret, secretSummary, setSecret} from '../lib/secrets.js';
import {isUniqueViolation} from '../lib/tx.js';
import {auditCtx, requireStaff, staffOf} from '../middleware/auth.js';
import {keyStatus, paymentMode, PROVIDERS, secretName} from '../providers/payments/index.js';
import {runJobs, JOBS, type JobName} from '../services/jobs.js';

export const adminSettingsRouter = mounted(Router(), '/admin');
const r = adminSettingsRouter;
const staff = requireStaff;

// ───────────── Overview & reports
route(r, {method: 'get', path: '/overview', access: 'STAFF:overview.read', tag: 'Admin overview', summary: 'KPI aggregation (finance figures only for permitted roles)'}, staff('overview.read'), async (_req, res) => {
  noStore(res);
  const role = staffOf(res).user.role as C.StaffRole;
  const since = new Date(Date.now() - 30 * 86_400_000);
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  const threshold = (await getSetting('catalogue'))?.lowStockThreshold ?? 2;
  const [awaiting, toShip, review, openRequests, newLeads, newBookings, lowStock, deadJobs, todayOrders, revenue, pendingCommission] = await Promise.all([
    prisma.order.count({where: {status: {in: ['AWAITING_PAYMENT', 'PAYMENT_FAILED']}}}),
    prisma.order.count({where: {status: {in: ['PAID', 'PROCESSING']}}}),
    prisma.order.count({where: {status: 'PAID_REVIEW'}}),
    prisma.customRequest.count({where: {status: {in: ['REQUESTED', 'REVIEWING']}}}),
    prisma.consultationLead.count({where: {status: 'NEW'}}),
    prisma.serviceBooking.count({where: {paymentStatus: 'PAID', status: 'NEW'}}),
    prisma.$queryRaw<{n: bigint}[]>`SELECT COUNT(*) AS n FROM inventory_items i JOIN product_variants v ON v.id=i.variant_id JOIN products p ON p.id=v.product_id WHERE p.status='PUBLISHED' AND i.on_hand_qty-i.reserved_qty<=${threshold}`,
    prisma.jobOutbox.count({where: {status: 'DEAD'}}),
    prisma.order.count({where: {createdAt: {gte: today}}}),
    C.can(role, 'reports.read') ? prisma.order.aggregate({where: {paidAt: {gte: since}}, _sum: {totalPaise: true, refundedPaise: true}, _count: true}) : null,
    C.can(role, 'marketing.write') ? prisma.affiliateCommission.aggregate({where: {status: {in: ['PENDING', 'APPROVED']}}, _sum: {amountPaise: true, reversedPaise: true}}) : null,
  ]);
  send(res, toPlain({
    queues: {awaitingPayment: awaiting, toShip, paidReview: review, openCustomRequests: openRequests, newConsultationLeads: newLeads, newBookings, lowStockVariants: Number(lowStock[0]?.n ?? 0), deadJobs, ordersToday: todayOrders},
    ...(revenue && {last30Days: {paidOrders: revenue._count, grossPaise: revenue._sum.totalPaise ?? 0n, refundedPaise: revenue._sum.refundedPaise ?? 0n}}),
    ...(pendingCommission && {partnerCommissionOwedPaise: (pendingCommission._sum.amountPaise ?? 0n) - (pendingCommission._sum.reversedPaise ?? 0n)}),
    paymentMode: await paymentMode(),
  }));
});
const ReportQuery = z.object({from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), format: z.enum(['json', 'csv']).default('json')});
route(r, {method: 'get', path: '/reports/sales', access: 'STAFF:reports.read', tag: 'Admin reports', summary: 'Daily paid sales, discounts, refunds; CSV export', query: ReportQuery}, staff('reports.read'), async (req, res) => {
  noStore(res);
  const q = parse(ReportQuery, req.query);
  const from = new Date(`${q.from}T00:00:00Z`), to = new Date(`${q.to}T23:59:59.999Z`);
  if (to < from || to.getTime() - from.getTime() > 400 * 86_400_000) throw new AppError('VALIDATION_FAILED', 422, 'Choose a range of up to 400 days.');
  const rows = await prisma.$queryRaw<{day: string; orders: bigint; gross: bigint; discount: bigint; shipping: bigint; tax: bigint; refunded: bigint}[]>`
    SELECT DATE_FORMAT(paid_at, '%Y-%m-%d') AS day, COUNT(*) AS orders, SUM(total_paise) AS gross, SUM(discount_paise) AS discount, SUM(shipping_paise) AS shipping, SUM(tax_paise) AS tax, SUM(refunded_paise) AS refunded
    FROM orders WHERE paid_at BETWEEN ${from} AND ${to} GROUP BY day ORDER BY day`;
  const data = rows.map((r) => ({day: r.day, orders: Number(r.orders), grossPaise: String(r.gross ?? 0), discountPaise: String(r.discount ?? 0), shippingPaise: String(r.shipping ?? 0), taxPaise: String(r.tax ?? 0), refundedPaise: String(r.refunded ?? 0)}));
  await audit(prisma, auditCtx(req, res), 'report.sales', 'report', null, {from: q.from, to: q.to, format: q.format});
  if (q.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="sales-${q.from}-${q.to}.csv"`);
    res.send(['day,orders,gross_paise,discount_paise,shipping_paise,tax_paise,refunded_paise', ...data.map((d) => [d.day, d.orders, d.grossPaise, d.discountPaise, d.shippingPaise, d.taxPaise, d.refundedPaise].join(','))].join('\n'));
    return;
  }
  send(res, data);
});
route(r, {method: 'get', path: '/audit', access: 'STAFF:audit.read', tag: 'Admin audit', summary: 'Audit viewer (redacted)'}, staff('audit.read'), async (req, res) => {
  noStore(res);
  const q = parse(z.object({entityType: z.string().max(60).optional(), entityId: z.string().max(64).optional(), actorId: C.Id.optional(), before: C.Id.optional()}), req.query);
  send(res, await prisma.auditLog.findMany({where: {...(q.entityType && {entityType: q.entityType}), ...(q.entityId && {entityId: q.entityId}), ...(q.actorId && {actorId: q.actorId}), ...(q.before && {id: {lt: q.before}})}, orderBy: {id: 'desc'}, take: 100}));
});

// ───────────── Settings (tax, shipping, returns, invoice, consultation, catalogue, navigation, partner programme)
const OPTIONAL: SettingKey[] = ['international'];
const EDITABLE: SettingKey[] = ['tax', 'shipping', 'returns', 'invoice', 'consultation', 'catalogue', 'navigation', 'affiliates', 'international'];
route(r, {method: 'get', path: '/settings', access: 'STAFF:settings.read', tag: 'Admin settings', summary: 'All configuration; secrets shown only as set/last-4'}, staff('settings.read'), async (_req, res) => {
  noStore(res);
  const values: Record<string, unknown> = {};
  for (const key of [...EDITABLE, 'payments.mode', 'ai'] as SettingKey[]) values[key] = await getSetting(key);
  send(res, {
    // Required before selling; "optional" groups only matter for features that use them (international = PayPal).
    values, missing: EDITABLE.filter((k) => values[k] === null && !OPTIONAL.includes(k)), optional: OPTIONAL.filter((k) => values[k] === null),
    payments: {mode: await paymentMode(), liveUnlockedByServer: env().ALLOW_LIVE_PAYMENTS, keys: await keyStatus(), webhookUrls: {razorpay: `${env().API_BASE_URL}/api/v1/webhooks/payments/razorpay`, paypal: `${env().API_BASE_URL}/api/v1/webhooks/payments/paypal`}},
    aiKeys: await secretSummary('ai.'), storefronts: await prisma.storefront.findMany({select: {id: true, name: true, baseUrl: true, allowedOrigins: true}}),
  });
});
route(r, {method: 'put', path: '/settings/:key', access: 'STAFF:settings.write', tag: 'Admin settings', summary: 'Save one validated settings group (owner)'}, staff('settings.write'), async (req, res) => {
  const key = param(req, 'key') as SettingKey;
  if (!EDITABLE.includes(key)) throw notFound('Setting');
  const value = parse(SETTINGS[key], req.body);
  const before = await getSetting(key);
  await putSetting(key, value as never, staffOf(res).user.id);
  await audit(prisma, auditCtx(req, res), 'settings.update', 'setting', key, {before, after: value});
  send(res, {key, value});
});

// Payment keys: encrypted at rest, never echoed back.
route(r, {method: 'patch', path: '/settings/payment-keys', access: 'STAFF:payments.mode', tag: 'Admin settings', summary: 'Store Razorpay or PayPal test/live credentials (encrypted)', body: C.PaymentKeysPatch}, staff('payments.mode'), async (req, res) => {
  const b = parse(C.PaymentKeysPatch, req.body);
  const actor = staffOf(res).user.id;
  const fields: Record<string, string | undefined> = b.provider === 'razorpay'
    ? {key_id: b.keyId, key_secret: b.keySecret, webhook_secret: b.webhookSecret}
    : {client_id: b.clientId, client_secret: b.clientSecret, webhook_id: b.webhookId};
  if (b.provider === 'razorpay' && b.keyId && !b.keyId.startsWith(`rzp_${b.environment}_`)) throw new AppError('VALIDATION_FAILED', 422, `A ${b.environment} key id starts with rzp_${b.environment}_.`);
  if (b.provider === 'razorpay' && (b.clientId || b.clientSecret || b.webhookId)) throw new AppError('VALIDATION_FAILED', 422, 'Razorpay uses a key id, key secret and webhook secret.');
  if (b.provider === 'paypal' && (b.keyId || b.keySecret || b.webhookSecret)) throw new AppError('VALIDATION_FAILED', 422, 'PayPal uses a client id, client secret and webhook id.');
  for (const [field, value] of Object.entries(fields)) if (value) await setSecret(secretName(b.provider, b.environment, field), value, actor);
  await audit(prisma, auditCtx(req, res), 'payments.keys_updated', 'setting', `payments.${b.provider}.${b.environment}`, Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, Boolean(v)])));
  send(res, {keys: await keyStatus()});
});
/**
 * Mode switch without code changes (mock → test → live). Test needs at least one provider fully configured for test.
 * Live needs: the owner, explicit confirmation, a provider with live credentials, reviewed tax settings, and the
 * server-side ALLOW_LIVE_PAYMENTS approval flag set at deployment.
 */
route(r, {method: 'patch', path: '/settings/payment-mode', access: 'STAFF:payments.mode', tag: 'Admin settings', summary: 'Switch mock / test / live (live is gated)', body: C.PaymentModePatch}, staff('payments.mode'), async (req, res) => {
  const b = parse(C.PaymentModePatch, req.body);
  if (b.mode === 'mock' && env().NODE_ENV === 'production') throw new AppError('CONFLICT', 409, 'The simulator cannot be used in production.');
  if (b.mode !== 'mock') {
    if (b.mode === 'live') {
      if (!env().ALLOW_LIVE_PAYMENTS) throw new AppError('LIVE_PAYMENTS_LOCKED', 409, 'Live payments are locked on the server. They are enabled only after the go-live approval (ALLOW_LIVE_PAYMENTS=true).');
      if (!b.confirmLive) throw new AppError('VALIDATION_FAILED', 422, 'Confirm that you want to take real payments.');
      if (!(await getSetting('tax'))) throw new AppError('CONFLICT', 409, 'Tax settings must be reviewed before taking live payments.');
    }
    const ready = [];
    for (const name of ['razorpay', 'paypal'] as const) if (await PROVIDERS[name].configured(b.mode)) ready.push(name);
    if (!ready.length) throw new AppError('PAYMENT_NOT_CONFIGURED', 409, `Add complete ${b.mode} credentials for Razorpay (key id, key secret, webhook secret) or PayPal (client id, secret, webhook id + exchange rate) first.`);
  }
  const before = await paymentMode();
  await putSetting('payments.mode', {mode: b.mode, changedBy: staffOf(res).user.id, changedAt: new Date().toISOString()}, staffOf(res).user.id);
  await audit(prisma, auditCtx(req, res), 'payments.mode_changed', 'setting', 'payments.mode', {from: before, to: b.mode});
  send(res, {mode: b.mode});
});
route(r, {method: 'patch', path: '/settings/ai', access: 'STAFF:settings.write', tag: 'Admin settings', summary: 'AI provider keys (encrypted) and model choice', body: C.AiKeyPatch}, staff('settings.write'), async (req, res) => {
  const b = parse(C.AiKeyPatch, req.body);
  const name = `ai.${b.provider}.api_key`;
  if (b.removeKey) await deleteSecret(name);
  else if (b.apiKey) await setSecret(name, b.apiKey, staffOf(res).user.id);
  const ai = (await getSetting('ai')) ?? {};
  const cur = ai[b.provider] ?? {model: null, enabled: false};
  ai[b.provider] = {model: b.model ?? cur.model, enabled: b.removeKey ? false : b.enabled ?? cur.enabled};
  await putSetting('ai', ai, staffOf(res).user.id);
  await audit(prisma, auditCtx(req, res), 'ai.updated', 'setting', b.provider, {keyChanged: Boolean(b.apiKey), removed: Boolean(b.removeKey), model: ai[b.provider]!.model, enabled: ai[b.provider]!.enabled});
  send(res, {provider: b.provider, ...ai[b.provider], key: (await secretSummary(name))[name] ?? {set: false}});
});
const StorefrontPatch = z.object({name: z.string().trim().min(2).max(120).optional(), baseUrl: z.string().url().optional(), allowedOrigins: z.array(z.string().url()).max(10).optional()});
route(r, {method: 'patch', path: '/storefronts/:id', access: 'STAFF:settings.write', tag: 'Admin settings', summary: 'Storefront name, URL and allowed origins', body: StorefrontPatch}, staff('settings.write'), async (req, res) => {
  const b = parse(StorefrontPatch, req.body);
  const n = await prisma.storefront.updateMany({where: {id: param(req, 'id')}, data: b});
  if (n.count !== 1) throw notFound('Storefront');
  await audit(prisma, auditCtx(req, res), 'storefront.update', 'storefront', param(req, 'id'), b);
  send(res, {id: param(req, 'id')});
});

// ───────────── Staff (owner)
route(r, {method: 'get', path: '/staff', access: 'STAFF:staff.manage', tag: 'Admin staff', summary: 'Staff accounts'}, staff('staff.manage'), async (_req, res) => {
  noStore(res);
  send(res, await prisma.user.findMany({where: {role: {in: [...C.STAFF_ROLES]}}, select: {id: true, email: true, name: true, role: true, status: true, mfaEnabledAt: true, lastLoginAt: true, createdAt: true}}));
});
route(r, {method: 'post', path: '/staff', access: 'STAFF:staff.manage', tag: 'Admin staff', summary: 'Create a staff account (MFA enrolment required at first sign-in)', body: C.StaffCreate}, staff('staff.manage'), async (req, res) => {
  const b = parse(C.StaffCreate, req.body);
  const id = ulid();
  try { await prisma.user.create({data: {id, email: b.email, name: b.name, role: b.role, passwordHash: await hashPassword(b.temporaryPassword)}}); }
  catch (e) { if (isUniqueViolation(e)) throw new AppError('CONFLICT', 409, 'That email already has an account.'); throw e; }
  await audit(prisma, auditCtx(req, res), 'staff.create', 'user', id, {role: b.role});
  send(res, {id}, 201);
});
const StaffPatch = z.object({role: z.enum(C.STAFF_ROLES).optional(), status: z.enum(['ACTIVE', 'DISABLED']).optional(), resetMfa: z.boolean().optional(), newPassword: z.string().min(12).max(200).optional()});
route(r, {method: 'patch', path: '/staff/:id', access: 'STAFF:staff.manage', tag: 'Admin staff', summary: 'Change role/status, reset MFA or password', body: StaffPatch}, staff('staff.manage'), async (req, res) => {
  const b = parse(StaffPatch, req.body);
  const id = param(req, 'id');
  if (id === staffOf(res).user.id && (b.role || b.status === 'DISABLED')) throw new AppError('CONFLICT', 409, 'You cannot change your own role or disable yourself.');
  const target = await prisma.user.findUnique({where: {id}});
  if (!target || !(C.STAFF_ROLES as readonly string[]).includes(target.role)) throw notFound('Staff member');
  await prisma.user.update({where: {id}, data: {...(b.role && {role: b.role}), ...(b.status && {status: b.status}), ...(b.resetMfa && {mfaEnabledAt: null, mfaSecretEnc: null}), ...(b.newPassword && {passwordHash: await hashPassword(b.newPassword)})}});
  if (b.role || b.status || b.resetMfa || b.newPassword) await prisma.session.updateMany({where: {userId: id, revokedAt: null}, data: {revokedAt: new Date()}});
  await audit(prisma, auditCtx(req, res), 'staff.update', 'user', id, {role: b.role, status: b.status, resetMfa: b.resetMfa, passwordReset: Boolean(b.newPassword)});
  send(res, {id});
});

// ───────────── Operations
route(r, {method: 'get', path: '/jobs', access: 'STAFF:settings.read', tag: 'Admin operations', summary: 'Outbox health and dead jobs'}, staff('settings.read'), async (_req, res) => {
  noStore(res);
  const [counts, dead, webhooks] = await Promise.all([
    prisma.jobOutbox.groupBy({by: ['status'], _count: true}),
    prisma.jobOutbox.findMany({where: {status: 'DEAD'}, orderBy: {createdAt: 'desc'}, take: 50, select: {id: true, type: true, attempts: true, lastError: true, createdAt: true}}),
    prisma.webhookEvent.groupBy({by: ['status'], _count: true, where: {receivedAt: {gt: new Date(Date.now() - 86_400_000)}}}),
  ]);
  send(res, {outbox: Object.fromEntries(counts.map((c) => [c.status, c._count])), dead, webhooksLast24h: Object.fromEntries(webhooks.map((w) => [w.status, w._count]))});
});
route(r, {method: 'post', path: '/jobs/:id/retry', access: 'STAFF:settings.write', tag: 'Admin operations', summary: 'Retry a dead job'}, staff('settings.write'), async (req, res) => {
  const n = await prisma.jobOutbox.updateMany({where: {id: param(req, 'id'), status: 'DEAD'}, data: {status: 'PENDING', attempts: 0, runAfter: new Date(), lastError: null}});
  if (n.count !== 1) throw notFound('Job');
  await audit(prisma, auditCtx(req, res), 'job.retry', 'job', param(req, 'id'));
  send(res, {id: param(req, 'id'), status: 'PENDING'});
});
route(r, {method: 'post', path: '/jobs/run', access: 'STAFF:settings.write', tag: 'Admin operations', summary: 'Run scheduled jobs now (same finite, leased jobs as cron)', body: z.object({jobs: z.array(z.string()).optional()})}, staff('settings.write'), async (req, res) => {
  const {jobs} = parse(z.object({jobs: z.array(z.enum(Object.keys(JOBS) as [JobName, ...JobName[]])).optional()}), req.body);
  await audit(prisma, auditCtx(req, res), 'jobs.run', 'job', null, {jobs});
  send(res, toPlain(await runJobs(jobs)));
});
