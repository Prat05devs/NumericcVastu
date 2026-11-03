import {sumPaise} from '@sc/contracts';
import type {z} from 'zod';
import type {CheckoutCreate} from '@sc/contracts';
import {AppError} from '../lib/errors.js';
import {publicCode, ulid} from '../lib/ids.js';
import {randomToken, sha256} from '../lib/crypto.js';
import {toPlain} from '../lib/http.js';
import type {IdemHandle} from '../lib/idempotency.js';
import {transaction, affected} from '../lib/tx.js';
import {breakdown, priceCart} from './pricing.js';
import {emailHash} from './affiliates.js';
import {paymentMode} from '../providers/payments/index.js';

type Input = z.infer<typeof CheckoutCreate>;

/**
 * Authoritative checkout (Section 07): price on the server, then in ONE short transaction reserve stock with guarded
 * UPDATEs in stable variant order, write the order + immutable line snapshots + address snapshot + holds + coupon
 * reservation + event + idempotency result, and empty the cart. No provider call happens inside the transaction.
 */
export async function createOrder(input: Input, ctx: {storefrontId: string; userId: string | null; idem: IdemHandle}) {
  if ((await paymentMode()) === 'live') {
    // Live selling needs reviewed tax rules; otherwise totals could be wrong on a real invoice.
    const {getSetting} = await import('../lib/settings.js');
    if (!(await getSetting('tax'))) throw new AppError('CONFLICT', 409, 'Checkout is unavailable: tax settings have not been reviewed yet.');
  }
  return transaction(async (tx) => {
    const cart = await tx.cart.findUnique({where: {id: input.cartId}});
    if (!cart || cart.expiresAt <= new Date()) throw new AppError('NOT_FOUND', 404, 'Cart not found.');
    const p = await priceCart(cart.id, {storefrontId: ctx.storefrontId, couponCode: input.couponCode, shippingMethodId: input.shippingMethodId, ref: input.ref, email: input.email, userId: ctx.userId}, tx);
    if (p.lines.length === 0) throw new AppError('CONFLICT', 409, 'Your cart is empty.');
    const unsellable = p.lines.filter((l) => !l.sellable);
    if (unsellable.length) throw new AppError('CONFLICT', 409, 'Some items are no longer available. Please review your cart.', {variantIds: unsellable.map((l) => l.variantId)});
    if (!p.shippingConfigured) throw new AppError('CONFLICT', 409, 'Delivery options have not been set up yet, so orders cannot be placed.');
    if (!p.shipping) throw new AppError('VALIDATION_FAILED', 422, 'Choose a delivery option.');
    if (input.couponCode && p.coupon && !p.coupon.ok) throw new AppError('COUPON_INVALID', 422, p.coupon.message);
    for (const l of p.lines) if (l.uniqueSpecimen && l.qty > 1) throw new AppError('VALIDATION_FAILED', 422, `${l.productTitle} is a one-of-a-kind piece; the quantity must be 1.`);
    const r = p.result;
    if (input.expectedTotalPaise !== undefined && BigInt(input.expectedTotalPaise) !== r.totalPaise) {
      throw new AppError('PRICE_CHANGED', 409, 'The total changed since you last saw it. Please review the updated amount.', {totalPaise: r.totalPaise.toString()});
    }
    if (r.totalPaise <= 0n) throw new AppError('CONFLICT', 409, 'The order total must be greater than zero.');

    const now = new Date();
    const holdUntil = new Date(now.getTime() + p.holdMinutes * 60_000);
    const orderId = ulid();
    // 1) Guarded stock reservation, sorted by variant id to avoid deadlocks between concurrent checkouts.
    for (const l of [...p.lines].sort((a, b) => (a.variantId < b.variantId ? -1 : 1))) {
      const n = await tx.$executeRaw`UPDATE inventory_items SET reserved_qty=reserved_qty+${l.qty}, version=version+1, updated_at=UTC_TIMESTAMP(3) WHERE variant_id=${l.variantId} AND on_hand_qty-reserved_qty>=${l.qty}`;
      if (affected(n) !== 1) throw new AppError('INSUFFICIENT_STOCK', 409, `Sorry, ${l.productTitle} is no longer available in that quantity.`, {variantId: l.variantId});
    }
    // 2) Coupon cap: guarded increment locks the discount row; then the per-customer limit is re-checked under that lock.
    const customerRef = ctx.userId ?? emailHash(input.email);
    const couponId = r.coupon?.id ?? null;
    if (couponId && p.coupon?.ok) {
      const n = await tx.$executeRaw`UPDATE discounts SET redeemed_count=redeemed_count+1 WHERE id=${couponId} AND active=1 AND (limit_total IS NULL OR redeemed_count<limit_total)`;
      if (affected(n) !== 1) throw new AppError('COUPON_INVALID', 422, 'This code has reached its usage limit.');
      const lim = p.coupon.discount.limitPerCustomer;
      if (lim !== null) {
        const used = await tx.discountRedemption.count({where: {discountId: couponId, customerRef, status: {in: ['RESERVED', 'REDEEMED']}}});
        if (used >= lim) throw new AppError('COUPON_INVALID', 422, 'You have already used this code.');
      }
    }
    // 3) Order, immutable snapshots, holds, redemption, event, idempotency result.
    const accessToken = randomToken(24);
    const code = publicCode('NVC');
    const a = p.attribution;
    await tx.order.create({data: {
      id: orderId, publicCode: code, accessTokenHash: sha256(accessToken), userId: ctx.userId, email: input.email, storefrontId: ctx.storefrontId,
      subtotalPaise: r.subtotalPaise, discountPaise: r.discountPaise, shippingPaise: r.shippingPaise, taxPaise: r.taxPaise, totalPaise: r.totalPaise,
      taxMode: r.taxMode, priceVersion: sha256(p.priceVersion), shippingMethodId: p.shipping.id, pricingSnapshot: toPlain({...breakdown(r), shipping: p.shipping}) as object,
      discountId: couponId, campaignId: r.campaign?.id ?? null, affiliateLinkId: a?.linkId ?? null, affiliateClickId: a?.clickId ?? null, paymentDueAt: holdUntil,
    }});
    await tx.orderLine.createMany({data: p.lines.map((l, i) => {
      const lr = r.lines[i]!;
      return {id: ulid(), orderId, variantId: l.variantId, skuSnapshot: l.sku, titleSnapshot: `${l.productTitle} — ${l.title}`.slice(0, 300), attributesSnapshotJson: toPlain({options: l.options, family: l.family}) as object, qty: l.qty, unitPricePaise: l.pricePaise, discountPaise: lr.discountPaise, taxPaise: lr.taxPaise, totalPaise: lr.totalPaise};
    })});
    const ship = toPlain(input.shippingAddress) as object;
    await tx.orderAddress.createMany({data: [{orderId, type: 'SHIPPING', snapshotJson: ship}, {orderId, type: 'BILLING', snapshotJson: toPlain(input.billingAddress ?? input.shippingAddress) as object}]});
    await tx.inventoryReservation.createMany({data: p.lines.map((l) => ({id: ulid(), orderId, variantId: l.variantId, qty: l.qty, expiresAt: holdUntil}))});
    if (couponId) await tx.discountRedemption.create({data: {id: ulid(), discountId: couponId, orderId, userId: ctx.userId, customerRef}});
    await tx.orderEvent.create({data: {id: ulid(), orderId, actorId: ctx.userId, fromStatus: null, toStatus: 'AWAITING_PAYMENT', reason: 'Order placed; stock held until payment window ends'}});
    // acceptTerms is required by the contract; marketing is a separate, optional opt-in.
    await tx.customerConsent.create({data: {id: ulid(), userId: ctx.userId, subjectRef: emailHash(input.email), purpose: 'OPERATIONAL', version: 'checkout-v1', acceptedAt: now, source: 'checkout'}});
    if (input.marketingConsent) await tx.customerConsent.create({data: {id: ulid(), userId: ctx.userId, subjectRef: emailHash(input.email), purpose: 'MARKETING', version: 'checkout-v1', acceptedAt: now, source: 'checkout'}});
    await tx.cartItem.deleteMany({where: {cartId: cart.id}});
    const body = {orderId, publicCode: code, status: 'AWAITING_PAYMENT', totalPaise: r.totalPaise.toString(), holdExpiresAt: holdUntil.toISOString(), orderAccessToken: accessToken, breakdown: toPlain(breakdown(r))};
    await ctx.idem.complete(tx, {status: 201, body});
    return {status: 201, body};
  });
}

/** Commission basis: merchandise paid after discounts, net of tax (inclusive or exclusive), excluding shipping. */
export const merchandiseNetOfTax = (lines: {totalPaise: bigint; taxPaise: bigint}[]) => sumPaise(lines.map((l) => l.totalPaise - l.taxPaise));
