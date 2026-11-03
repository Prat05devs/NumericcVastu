import {assertTransition, ORDER_TRANSITIONS, PAYMENT_TRANSITIONS, type OrderStatus, type PaymentStatus} from '@sc/contracts';
import type {Tx} from '../lib/db.js';
import {AppError} from '../lib/errors.js';
import {ulid} from '../lib/ids.js';
import {affected} from '../lib/tx.js';

/**
 * Guarded state change: checks the state machine, then UPDATE ... WHERE status = :from so a concurrent writer that
 * already moved the row makes this one fail instead of overwriting it.
 */
export async function moveOrder(tx: Tx, orderId: string, from: OrderStatus, to: OrderStatus, actorId: string | null, reason: string | null, extra: Record<string, unknown> = {}) {
  assertTransition('order', ORDER_TRANSITIONS, from, to);
  const n = await tx.order.updateMany({where: {id: orderId, status: from}, data: {status: to, ...extra}});
  if (n.count !== 1) throw new AppError('CONFLICT', 409, 'The order changed while you were working on it. Refresh and try again.');
  await tx.orderEvent.create({data: {id: ulid(), orderId, actorId, fromStatus: from, toStatus: to, reason}});
}

export async function movePayment(tx: Tx, paymentId: string, from: PaymentStatus, to: PaymentStatus, extra: Record<string, unknown> = {}) {
  assertTransition('payment', PAYMENT_TRANSITIONS, from, to);
  const n = await tx.payment.updateMany({where: {id: paymentId, status: from}, data: {status: to, ...extra}});
  if (n.count !== 1) throw new AppError('CONFLICT', 409, 'Payment changed concurrently.');
}

export async function noteOrder(tx: Tx, orderId: string, status: string, actorId: string | null, reason: string) {
  await tx.orderEvent.create({data: {id: ulid(), orderId, actorId, fromStatus: status, toStatus: status, reason}});
}

/** Releases every HELD reservation of an order (guarded per row) and the coupon reservation. Idempotent. */
export async function releaseHolds(tx: Tx, orderId: string, now = new Date()) {
  const holds = await tx.inventoryReservation.findMany({where: {orderId, status: 'HELD'}, orderBy: {variantId: 'asc'}});
  for (const h of holds) {
    const claimed = await tx.$executeRaw`UPDATE inventory_reservations SET status='RELEASED', released_at=${now} WHERE id=${h.id} AND status='HELD'`;
    if (affected(claimed) === 1) {
      await tx.$executeRaw`UPDATE inventory_items SET reserved_qty=reserved_qty-${h.qty}, version=version+1, updated_at=UTC_TIMESTAMP(3) WHERE variant_id=${h.variantId} AND reserved_qty>=${h.qty}`;
    }
  }
  await releaseCoupon(tx, orderId);
}

export async function releaseCoupon(tx: Tx, orderId: string) {
  const r = await tx.discountRedemption.findUnique({where: {orderId}});
  if (r && r.status === 'RESERVED') {
    const n = await tx.discountRedemption.updateMany({where: {id: r.id, status: 'RESERVED'}, data: {status: 'RELEASED'}});
    if (n.count === 1) await tx.$executeRaw`UPDATE discounts SET redeemed_count=redeemed_count-1 WHERE id=${r.discountId} AND redeemed_count>0`;
  }
}

/** Puts consumed stock back (cancelled-after-payment, refunds before shipping, received returns). */
export async function restock(tx: Tx, orderId: string, actorId: string | null, note: string) {
  const consumed = await tx.inventoryReservation.findMany({where: {orderId, status: 'CONSUMED'}});
  for (const r of consumed) {
    const dedupe = await tx.inventoryMovement.findFirst({where: {referenceType: 'order_restock', referenceId: r.id}, select: {id: true}});
    if (dedupe) continue;
    await tx.$executeRaw`UPDATE inventory_items SET on_hand_qty=on_hand_qty+${r.qty}, version=version+1, updated_at=UTC_TIMESTAMP(3) WHERE variant_id=${r.variantId}`;
    await tx.inventoryMovement.create({data: {id: ulid(), variantId: r.variantId, kind: 'RETURN_RESTOCK', qtyDelta: r.qty, referenceType: 'order_restock', referenceId: r.id, note, actorId}});
  }
}

/** Locks the order row for the rest of the transaction so concurrent webhooks/jobs for one order run one at a time. */
export async function lockOrder(tx: Tx, orderId: string) {
  await tx.$queryRaw`SELECT id FROM orders WHERE id=${orderId} FOR UPDATE`;
}
