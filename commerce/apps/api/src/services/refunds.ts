import {AppError} from '../lib/errors.js';
import {prisma, type Tx} from '../lib/db.js';
import {ulid} from '../lib/ids.js';
import {enqueue} from '../lib/outbox.js';
import {transaction, affected} from '../lib/tx.js';
import type {IdemHandle} from '../lib/idempotency.js';
import {providerFor} from '../providers/payments/index.js';
import {moveOrder, restock} from './orders.js';
import {reverseCommission} from './affiliates.js';
import type {OrderStatus} from '@sc/contracts';

/**
 * Refunds (FINANCE): the amount is reserved against the payment with a guarded UPDATE (refunded + amount ≤ captured)
 * together with the Refund row and the idempotency result; the provider is called after commit; the order only
 * moves to (PARTIALLY_)REFUNDED once the provider confirms. A replayed key returns the first result.
 */
export async function requestRefund(orderId: string, amountPaise: bigint, reason: string, opts: {actorId: string; restock: boolean; idem: IdemHandle}) {
  if (amountPaise <= 0n) throw new AppError('VALIDATION_FAILED', 422, 'Refund amount must be positive.');
  const refundId = await transaction(async (tx) => {
    const order = await tx.order.findUnique({where: {id: orderId}, include: {payments: true}});
    if (!order) throw new AppError('NOT_FOUND', 404, 'Order not found.');
    const payment = order.payments.find((p) => ['CAPTURED', 'PARTIALLY_REFUNDED'].includes(p.status));
    if (!payment) throw new AppError('CONFLICT', 409, 'There is no captured payment to refund.');
    if (!['PAID', 'PAID_REVIEW', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'RETURN_REQUESTED', 'RETURNED', 'PARTIALLY_REFUNDED', 'CANCELLED'].includes(order.status)) {
      throw new AppError('ILLEGAL_TRANSITION', 409, `Orders in ${order.status} cannot be refunded.`);
    }
    const n = await tx.$executeRaw`UPDATE payments SET refunded_paise=refunded_paise+${amountPaise}, updated_at=UTC_TIMESTAMP(3) WHERE id=${payment.id} AND refunded_paise+${amountPaise}<=amount_paise`;
    if (affected(n) !== 1) throw new AppError('CONFLICT', 409, 'The refund would exceed the amount captured.');
    const id = ulid();
    // Amount in the provider's currency: proportional to the INR amount; the final refund takes exactly what remains.
    const fresh = await tx.payment.findUniqueOrThrow({where: {id: payment.id}});
    const priorMinor = (await tx.refund.aggregate({where: {paymentId: payment.id, status: {in: ['PROCESSING', 'PROCESSED']}}, _sum: {providerAmountMinor: true}}))._sum.providerAmountMinor ?? 0n;
    const providerAmountMinor = fresh.providerCurrency === fresh.currency ? amountPaise
      : fresh.refundedPaise === fresh.amountPaise ? fresh.providerAmountMinor - priorMinor : (amountPaise * fresh.providerAmountMinor) / fresh.amountPaise;
    await tx.refund.create({data: {id, paymentId: payment.id, orderId, amountPaise, providerAmountMinor, reason, requestedBy: opts.actorId, status: 'PROCESSING'}});
    await tx.orderEvent.create({data: {id: ulid(), orderId, actorId: opts.actorId, fromStatus: order.status, toStatus: order.status, reason: `Refund of ${amountPaise} paise requested${opts.restock ? ' (restock)' : ''}: ${reason}`}});
    if (opts.restock) {
      if (['SHIPPED', 'DELIVERED', 'RETURN_REQUESTED'].includes(order.status)) throw new AppError('CONFLICT', 409, 'Shipped items are restocked when the return is received, not at refund time.');
      await restock(tx, orderId, opts.actorId, 'Restocked with refund (items never shipped)');
    }
    await opts.idem.complete(tx, {status: 202, body: {refundId: id, status: 'PROCESSING', amountPaise: amountPaise.toString()}});
    return id;
  });
  // Provider call outside the transaction; the refund id is the provider receipt so retries cannot double refund.
  await submitRefund(refundId);
  const refund = await prisma.refund.findUniqueOrThrow({where: {id: refundId}});
  return {refundId, status: refund.status, amountPaise: refund.amountPaise.toString()};
}

export async function submitRefund(refundId: string) {
  const refund = await prisma.refund.findUniqueOrThrow({where: {id: refundId}, include: {payment: true}});
  if (refund.status !== 'PROCESSING' || refund.providerRef) return;
  try {
    const provider = await providerFor(refund.payment.provider, refund.payment.environment);
    const result = await provider.refund({providerPaymentId: refund.payment.providerPaymentId!, amountMinor: refund.providerAmountMinor, currency: refund.payment.providerCurrency, receipt: refund.id});
    await transaction(async (tx) => {
      await tx.refund.update({where: {id: refundId}, data: {providerRef: result.providerRefundId}});
      if (result.status === 'processed') await finishRefund(tx, refundId, 'PROCESSED');
    });
  } catch (error) {
    // Transient: leave PROCESSING and let the outbox retry the submission (provider receipt keeps it idempotent).
    await transaction((tx) => enqueue(tx, 'refund.submit', {refundId}, `refund_submit:${refundId}:${Date.now()}`, new Date(Date.now() + 60_000)));
    if (error instanceof AppError && error.code !== 'PAYMENT_PROVIDER_UNAVAILABLE') throw error;
  }
}

/** Final refund outcome (provider confirmation or webhook). Idempotent: a refund finishes once. */
export async function finishRefund(tx: Tx, refundId: string, outcome: 'PROCESSED' | 'FAILED'): Promise<string> {
  const claimed = await tx.refund.updateMany({where: {id: refundId, status: 'PROCESSING'}, data: {status: outcome, processedAt: new Date()}});
  if (claimed.count !== 1) return 'DUPLICATE';
  const refund = await tx.refund.findUniqueOrThrow({where: {id: refundId}});
  if (outcome === 'FAILED') {
    await tx.$executeRaw`UPDATE payments SET refunded_paise=refunded_paise-${refund.amountPaise} WHERE id=${refund.paymentId} AND refunded_paise>=${refund.amountPaise}`;
    await tx.orderEvent.create({data: {id: ulid(), orderId: refund.orderId, actorId: null, fromStatus: null, toStatus: 'REFUND_FAILED', reason: 'Provider reported the refund failed'}});
    await enqueue(tx, 'finance.alert', {orderId: refund.orderId, kind: 'REFUND_FAILED', refundId}, `refund_failed:${refundId}`);
    return 'REFUND_FAILED';
  }
  const payment = await tx.payment.findUniqueOrThrow({where: {id: refund.paymentId}});
  await tx.payment.update({where: {id: payment.id}, data: {status: payment.refundedPaise >= payment.amountPaise ? 'REFUNDED' : 'PARTIALLY_REFUNDED'}});
  await tx.$executeRaw`UPDATE orders SET refunded_paise=refunded_paise+${refund.amountPaise} WHERE id=${refund.orderId} AND refunded_paise+${refund.amountPaise}<=total_paise`;
  const order = await tx.order.findUniqueOrThrow({where: {id: refund.orderId}});
  const full = order.refundedPaise >= order.totalPaise;
  // Payment and fulfilment are separate dimensions: a partial refund changes only the payment status, so an order's
  // delivery progress is never overwritten. A full refund closes the order.
  if (full && order.status !== 'REFUNDED') await moveOrder(tx, order.id, order.status as OrderStatus, 'REFUNDED', refund.requestedBy, `Refund ${refund.id} processed (full)`, {paymentStatus: 'REFUNDED'});
  else if (!full) {
    await tx.order.update({where: {id: order.id}, data: {paymentStatus: 'PARTIALLY_REFUNDED'}});
    await tx.orderEvent.create({data: {id: ulid(), orderId: order.id, actorId: refund.requestedBy, fromStatus: order.status, toStatus: order.status, reason: `Partial refund ${refund.id} processed`}});
  }
  await reverseCommission(tx, order.id);
  await enqueue(tx, 'email.refund_processed', {orderId: order.id, refundId}, `refund_mail:${refundId}`);
  return full ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
}
