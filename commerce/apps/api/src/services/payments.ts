import {env} from '../config/env.js';
import {prisma, type Tx} from '../lib/db.js';
import {AppError} from '../lib/errors.js';
import {ulid} from '../lib/ids.js';
import {sha256} from '../lib/redact.js';
import {enqueue} from '../lib/outbox.js';
import {logger} from '../lib/logger.js';
import {transaction, affected, isUniqueViolation} from '../lib/tx.js';
import {activeProvider, providerFor, PROVIDERS, type CustomerProvider, type ParsedEvent, type ProviderName, type ProviderPayment} from '../providers/payments/index.js';
import {lockOrder, moveOrder, movePayment, noteOrder} from './orders.js';
import {recordCommission} from './affiliates.js';
import {merchandiseNetOfTax} from './checkout.js';
import type {OrderStatus, PaymentStatus} from '@sc/contracts';

/**
 * Create or reuse the provider order for an unpaid order. The provider call happens outside any transaction; if two
 * requests race, the second one adopts the first one's payment row (the stray provider order simply expires unpaid).
 */
export async function paymentIntent(orderId: string, requested?: CustomerProvider) {
  const order = await prisma.order.findUnique({where: {id: orderId}, include: {payments: {orderBy: {createdAt: 'desc'}}}});
  if (!order) throw new AppError('NOT_FOUND', 404, 'Order not found.');
  if (!['AWAITING_PAYMENT', 'PAYMENT_FAILED'].includes(order.status)) throw new AppError('CONFLICT', 409, order.paidAt ? 'This order is already paid.' : 'This order can no longer be paid.');
  if (order.paymentDueAt <= new Date()) throw new AppError('CONFLICT', 409, 'The payment window for this order has ended. Please place the order again.');
  const {module, provider} = await activeProvider(requested);
  const charge = await module.chargeFor(order.totalPaise);
  const params = (providerOrderId: string) => provider.checkoutParams({providerOrderId, charge, email: order.email, publicCode: order.publicCode});
  const same = (p: {provider: string; environment: string; status: string; amountPaise: bigint; providerAmountMinor: bigint; providerCurrency: string}) =>
    p.provider === provider.name && p.environment === provider.environment && ['CREATED', 'FAILED'].includes(p.status) && p.amountPaise === order.totalPaise && p.providerAmountMinor === charge.amountMinor && p.providerCurrency === charge.currency;
  const reusable = order.payments.find(same);
  if (reusable) return {paymentId: reusable.id, checkout: params(reusable.providerOrderId)};

  const {providerOrderId} = await provider.createOrder({charge, receipt: `${order.publicCode}-${order.payments.length + 1}`, orderId: order.id, publicCode: order.publicCode});
  const paymentId = await transaction(async (tx) => {
    await lockOrder(tx, order.id);
    const existing = (await tx.payment.findMany({where: {orderId: order.id}})).find(same);
    if (existing) return existing.id;
    const id = ulid();
    await tx.payment.create({data: {id, orderId: order.id, provider: provider.name, environment: provider.environment, providerOrderId, amountPaise: order.totalPaise, providerCurrency: charge.currency, providerAmountMinor: charge.amountMinor, exchangeRate: charge.exchangeRate}});
    return id;
  });
  const row = await prisma.payment.findUniqueOrThrow({where: {id: paymentId}});
  return {paymentId, checkout: params(row.providerOrderId)};
}

/**
 * Applies one verified provider fact (from a webhook or from reconciliation) exactly once.
 * Capture: payment → CAPTURED; HELD reservations are consumed; RELEASED ones are re-reserved if stock allows,
 * otherwise the order goes to PAID_REVIEW — a late payment never oversells.
 */
export async function applyCapture(tx: Tx, providerName: string, providerOrderId: string, pay: ProviderPayment): Promise<string> {
  const payment = await tx.payment.findUnique({where: {provider_providerOrderId: {provider: providerName, providerOrderId}}});
  if (!payment) return 'IGNORED:unknown provider order';
  await lockOrder(tx, payment.orderId);
  const fresh = await tx.payment.findUniqueOrThrow({where: {id: payment.id}});
  const order = await tx.order.findUniqueOrThrow({where: {id: payment.orderId}, include: {lines: true}});
  const now = new Date();

  if (fresh.providerPaymentId === pay.providerPaymentId && ['CAPTURED', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(fresh.status)) return 'DUPLICATE';
  if (fresh.providerPaymentId && fresh.providerPaymentId !== pay.providerPaymentId && ['CAPTURED', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(fresh.status)) {
    // A second successful charge for the same order: money received twice. Never auto-fulfil twice; finance refunds it.
    await noteOrder(tx, order.id, order.status, null, `Second capture ${pay.providerPaymentId} received for an already paid order — refund required`);
    await enqueue(tx, 'finance.alert', {orderId: order.id, kind: 'DUPLICATE_CAPTURE', providerPaymentId: pay.providerPaymentId, amountMinor: pay.amountMinor, currency: pay.currency}, `dup_capture:${pay.providerPaymentId}`);
    return 'DUPLICATE_CAPTURE_FLAGGED';
  }
  if (pay.amountMinor !== fresh.providerAmountMinor || pay.currency !== fresh.providerCurrency) {
    await movePayment(tx, fresh.id, fresh.status as PaymentStatus, 'CAPTURED', {providerPaymentId: pay.providerPaymentId, failureReason: `Amount mismatch: received ${pay.amountMinor} ${pay.currency}`});
    if (['AWAITING_PAYMENT', 'PAYMENT_FAILED', 'CANCELLED'].includes(order.status)) await moveOrder(tx, order.id, order.status as OrderStatus, 'PAID_REVIEW', null, 'Captured amount does not match the order total', {paymentStatus: 'CAPTURED', paidAt: now});
    await enqueue(tx, 'finance.alert', {orderId: order.id, kind: 'AMOUNT_MISMATCH'}, `mismatch:${pay.providerPaymentId}`);
    return 'AMOUNT_MISMATCH';
  }

  await movePayment(tx, fresh.id, fresh.status as PaymentStatus, 'CAPTURED', {providerPaymentId: pay.providerPaymentId, failureReason: null});
  // Consume stock exactly once.
  let shortfall = false;
  const holds = await tx.inventoryReservation.findMany({where: {orderId: order.id}, orderBy: {variantId: 'asc'}});
  for (const h of holds) {
    if (h.status === 'CONSUMED') continue;
    if (h.status === 'HELD') {
      const claimed = await tx.$executeRaw`UPDATE inventory_reservations SET status='CONSUMED', consumed_at=${now} WHERE id=${h.id} AND status='HELD'`;
      if (affected(claimed) === 1) {
        await tx.$executeRaw`UPDATE inventory_items SET on_hand_qty=on_hand_qty-${h.qty}, reserved_qty=reserved_qty-${h.qty}, version=version+1, updated_at=UTC_TIMESTAMP(3) WHERE variant_id=${h.variantId} AND reserved_qty>=${h.qty}`;
        await tx.inventoryMovement.create({data: {id: ulid(), variantId: h.variantId, kind: 'SALE', qtyDelta: -h.qty, referenceType: 'order', referenceId: order.id}});
        continue;
      }
    }
    // RELEASED (hold expired before payment): take the stock only if it is still free.
    const n = await tx.$executeRaw`UPDATE inventory_items SET on_hand_qty=on_hand_qty-${h.qty}, version=version+1, updated_at=UTC_TIMESTAMP(3) WHERE variant_id=${h.variantId} AND on_hand_qty-reserved_qty>=${h.qty}`;
    if (affected(n) === 1) {
      await tx.inventoryReservation.update({where: {id: h.id}, data: {status: 'CONSUMED', consumedAt: now}});
      await tx.inventoryMovement.create({data: {id: ulid(), variantId: h.variantId, kind: 'SALE', qtyDelta: -h.qty, referenceType: 'order', referenceId: order.id, note: 'Re-reserved after late payment'}});
    } else shortfall = true;
  }

  const from = order.status as OrderStatus;
  const to: OrderStatus = shortfall || from === 'CANCELLED' ? 'PAID_REVIEW' : 'PAID';
  if (['AWAITING_PAYMENT', 'PAYMENT_FAILED', 'CANCELLED'].includes(from)) {
    await moveOrder(tx, order.id, from, to, null, to === 'PAID' ? 'Payment verified with provider' : shortfall ? 'Paid after the stock hold lapsed and the item is no longer free — refund or reallocate' : 'Paid after the order was cancelled — review', {paymentStatus: 'CAPTURED', paidAt: now});
  }
  // Coupon: reserved → redeemed (a released coupon is re-counted because the customer did pay with it).
  const red = await tx.discountRedemption.findUnique({where: {orderId: order.id}});
  if (red && red.status !== 'REDEEMED') {
    if (red.status === 'RELEASED') await tx.$executeRaw`UPDATE discounts SET redeemed_count=redeemed_count+1 WHERE id=${red.discountId}`;
    await tx.discountRedemption.update({where: {id: red.id}, data: {status: 'REDEEMED'}});
  }
  const commission = await recordCommission(tx, {id: order.id, userId: order.userId, email: order.email, affiliateLinkId: order.affiliateLinkId, paidAt: now}, merchandiseNetOfTax(order.lines));
  if (commission > 0n) await tx.order.update({where: {id: order.id}, data: {commissionPaise: commission}});
  if (order.customRequestId) {
    await tx.customRequest.updateMany({where: {id: order.customRequestId, status: 'PAYMENT_PENDING'}, data: {status: 'IN_PROGRESS'}});
  }
  await enqueue(tx, 'email.order_paid', {orderId: order.id}, `order_paid:${order.id}`);
  if (to === 'PAID_REVIEW') await enqueue(tx, 'finance.alert', {orderId: order.id, kind: 'PAID_REVIEW'}, `paid_review:${order.id}`);
  return to;
}

export async function applyFailure(tx: Tx, providerName: string, providerOrderId: string, pay: ProviderPayment): Promise<string> {
  const payment = await tx.payment.findUnique({where: {provider_providerOrderId: {provider: providerName, providerOrderId}}});
  if (!payment) return 'IGNORED:unknown provider order';
  await lockOrder(tx, payment.orderId);
  const fresh = await tx.payment.findUniqueOrThrow({where: {id: payment.id}});
  if (!['CREATED', 'AUTHORIZED'].includes(fresh.status)) return 'IGNORED:payment already final';
  await movePayment(tx, fresh.id, fresh.status as PaymentStatus, 'FAILED', {failureReason: pay.failureReason?.slice(0, 300) ?? 'Payment failed'});
  const order = await tx.order.findUniqueOrThrow({where: {id: fresh.orderId}});
  // Stock stays held until the payment window ends so the customer can retry.
  if (order.status === 'AWAITING_PAYMENT') await moveOrder(tx, order.id, 'AWAITING_PAYMENT', 'PAYMENT_FAILED', null, 'Payment attempt failed', {paymentStatus: 'FAILED'});
  return 'PAYMENT_FAILED';
}

async function applyRefundEvent(tx: Tx, e: Extract<ParsedEvent, {kind: 'refund_processed' | 'refund_failed'}>) {
  const refund = await tx.refund.findUnique({where: {providerRef: e.providerRefundId}});
  if (!refund) return 'IGNORED:unknown refund';
  const {finishRefund} = await import('./refunds.js');
  return finishRefund(tx, refund.id, e.kind === 'refund_processed' ? 'PROCESSED' : 'FAILED');
}

/** Apply provider facts that were verified (by signature or by asking the provider) in one transaction, exactly once. */
async function applyEvent(providerName: string, event: ParsedEvent, payments: ProviderPayment[], bodyHash: string) {
  try {
    return await transaction(async (tx) => {
      const id = ulid();
      await tx.webhookEvent.create({data: {id, provider: providerName, eventId: event.eventId.slice(0, 120), eventType: event.type.slice(0, 80), signatureValid: true, bodyHash}});
      const outcomes: string[] = [];
      if (event.kind === 'captured') outcomes.push(await applyCapture(tx, providerName, event.providerOrderId, event.payment));
      else if (event.kind === 'failed') outcomes.push(await applyFailure(tx, providerName, event.providerOrderId, event.payment));
      else if (event.kind === 'needs_capture') {
        for (const p of payments) {
          if (p.status === 'captured') outcomes.push(await applyCapture(tx, providerName, event.providerOrderId, p));
          else if (p.status === 'failed') outcomes.push(await applyFailure(tx, providerName, event.providerOrderId, p));
        }
        if (!outcomes.length) outcomes.push('IGNORED:not captured yet');
      } else if (event.kind === 'refund_processed' || event.kind === 'refund_failed') outcomes.push(await applyRefundEvent(tx, event));
      else outcomes.push('IGNORED:event type');
      const outcome = outcomes.join(',');
      await tx.webhookEvent.update({where: {id}, data: {status: outcome.startsWith('IGNORED') ? 'IGNORED' : 'PROCESSED', error: outcome.startsWith('IGNORED') ? outcome.slice(0, 500) : null, processedAt: new Date()}});
      return {received: true, duplicate: false, outcome};
    });
  } catch (error) {
    if (isUniqueViolation(error)) return {received: true, duplicate: true, outcome: 'DUPLICATE_EVENT'};
    throw error;
  }
}

/**
 * Webhook pipeline (Section 06): verify authenticity first (HMAC over the raw bytes, or the provider's verification
 * API) → parse → [server-side capture for approved/authorised payments, outside any transaction] → insert
 * UNIQUE(provider, event_id) and apply in one transaction → 2xx only after commit. Duplicates are acknowledged.
 */
export async function handlePaymentWebhook(providerName: string, raw: Buffer, headers: Record<string, string | undefined>) {
  const module = PROVIDERS[providerName as ProviderName];
  if (!module) throw new AppError('NOT_FOUND', 404, 'Not found.');
  const environment = await module.verifyWebhook(raw, headers);
  if (!environment) {
    logger.warn({provider: providerName, bodyHash: sha256(raw.toString('base64'))}, 'webhook authenticity check failed');
    throw new AppError('UNAUTHENTICATED', 401, 'Invalid signature.');
  }
  let event: ParsedEvent;
  try { event = module.parseWebhook(raw, headers); } catch { throw new AppError('VALIDATION_FAILED', 400, 'Unreadable event.'); }
  let payments: ProviderPayment[] = [];
  if (event.kind === 'needs_capture') {
    const payment = await prisma.payment.findUnique({where: {provider_providerOrderId: {provider: providerName, providerOrderId: event.providerOrderId}}});
    if (!payment) return {received: true, duplicate: false, outcome: 'IGNORED:unknown provider order'};
    const provider = await providerFor(providerName, environment);
    payments = await provider.capture(event.providerOrderId, event.providerPaymentId, {amountMinor: payment.providerAmountMinor, currency: payment.providerCurrency, exchangeRate: payment.exchangeRate});
  }
  return applyEvent(providerName, event, payments, sha256(raw.toString('base64')));
}

/**
 * Asks the provider directly about one payment (lost browser, missed webhook, provider outage, PayPal approval that
 * was never captured). Authorised/approved payments are captured server-side first.
 */
export async function reconcilePayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({where: {id: paymentId}});
  if (!payment) return 'NOT_FOUND';
  const provider = await providerFor(payment.provider, payment.environment).catch(() => null);
  if (!provider) return 'PROVIDER_NOT_CONFIGURED';
  const charge = {amountMinor: payment.providerAmountMinor, currency: payment.providerCurrency, exchangeRate: payment.exchangeRate};
  let remote = await provider.fetchPayments(payment.providerOrderId);
  if (!remote.some((p) => p.status === 'captured' || p.status === 'refunded') && remote.some((p) => p.status === 'authorized')) {
    remote = await provider.capture(payment.providerOrderId, remote.find((p) => p.status === 'authorized' && !p.providerPaymentId.startsWith('approval:'))?.providerPaymentId, charge);
  }
  const captured = remote.find((p) => p.status === 'captured' || p.status === 'refunded');
  if (!captured) return 'NOTHING_CAPTURED';
  const event: ParsedEvent = {kind: 'captured', eventId: `reconcile:${captured.providerPaymentId}`, type: 'reconcile.captured', providerOrderId: payment.providerOrderId, payment: {...captured, status: 'captured'}};
  const r = await applyEvent(payment.provider, event, [], sha256(captured.providerPaymentId));
  return r.duplicate ? 'ALREADY_RECONCILED' : r.outcome;
}

export const mockToolsEnabled = () => env().DEV_TOOLS || env().NODE_ENV === 'test';
