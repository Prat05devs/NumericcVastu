import {beforeAll, describe, expect, it} from 'vitest';
import {cartWith, checkout, configureShipping, inventory, key, payMock, prisma, product, staff} from '../support/helpers.js';
import {handlePaymentWebhook} from '../../src/services/payments.js';
import {mockCharge} from '../../src/providers/payments/index.js';
import {ulid} from '../../src/lib/ids.js';

beforeAll(async () => { await configureShipping(); });

describe('race conditions (Section 07 / 12 gates)', () => {
  it('100 buyers race for one unique gemstone: exactly one hold succeeds', async () => {
    const p = await product({stock: 1, unique: true, family: 'gemstones', pricePaise: 4_500_000n});
    const carts = await Promise.all(Array.from({length: 100}, () => cartWith(p.variantId, 1)));
    const results = await Promise.all(carts.map(({c, cartId}) => checkout(c, cartId)));
    const codes = results.map((r) => r.status);
    expect(codes.filter((s) => s === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409 && r.body.error.code === 'INSUFFICIENT_STOCK')).toHaveLength(99);
    expect(await inventory(p.variantId)).toMatchObject({onHandQty: 1, reservedQty: 1});
    expect(await prisma.inventoryReservation.count({where: {variantId: p.variantId}})).toBe(1);
  });

  it('100 duplicate webhook deliveries capture and consume once', async () => {
    const p = await product({stock: 4});
    const {c, cartId} = await cartWith(p.variantId, 2);
    const o = (await checkout(c, cartId)).body.data;
    const intent = await c.post(`/orders/${o.orderId}/payment-intents`, {}, {'Idempotency-Key': key(), 'X-Order-Token': o.orderAccessToken});
    const charge = await mockCharge(intent.body.data.checkout.orderId, 'success');
    const headers = {'x-razorpay-signature': charge.signature, 'x-razorpay-event-id': charge.eventId};
    const results = await Promise.all(Array.from({length: 100}, () => handlePaymentWebhook('mock', charge.body, headers)));
    expect(results.filter((r) => !r.duplicate)).toHaveLength(1);
    expect(await prisma.webhookEvent.count({where: {eventId: charge.eventId}})).toBe(1);
    expect(await inventory(p.variantId)).toMatchObject({onHandQty: 2, reservedQty: 0});
    expect(await prisma.inventoryMovement.count({where: {variantId: p.variantId, kind: 'SALE'}})).toBe(1);
    // A different event id for the same payment (e.g. order.paid after payment.captured) is also a no-op.
    const second = await handlePaymentWebhook('mock', charge.body, {...headers, 'x-razorpay-event-id': `${charge.eventId}-b`});
    expect(second.outcome).toBe('DUPLICATE');
    expect((await inventory(p.variantId)).onHandQty).toBe(2);
  });

  it('100 double-clicks on "pay" create one provider order', async () => {
    const p = await product({stock: 2});
    const {c, cartId} = await cartWith(p.variantId, 1);
    const o = (await checkout(c, cartId)).body.data;
    const k = key();
    const results = await Promise.all(Array.from({length: 100}, () => c.post(`/orders/${o.orderId}/payment-intents`, {}, {'Idempotency-Key': k, 'X-Order-Token': o.orderAccessToken})));
    const ok = results.filter((r) => r.status === 201);
    expect(ok.length).toBeGreaterThanOrEqual(1);
    expect(results.every((r) => r.status === 201 || (r.status === 409 && r.body.error.code === 'IDEMPOTENCY_IN_PROGRESS'))).toBe(true);
    expect(new Set(ok.map((r) => r.body.data.paymentId)).size).toBe(1);
    expect(await prisma.payment.count({where: {orderId: o.orderId}})).toBe(1);
  });

  it('a refund replayed 100 times refunds once, and refunds can never exceed the capture', async () => {
    const p = await product({stock: 2, pricePaise: 200_000n});
    const {c, cartId} = await cartWith(p.variantId, 1);
    const o = (await checkout(c, cartId)).body.data;
    await payMock(c, o.orderId, o.orderAccessToken);
    const finance = await staff('FINANCE');
    const k = key();
    const results = await Promise.all(Array.from({length: 100}, () => finance.post(`/admin/orders/${o.orderId}/refund`, {amountPaise: '50000', reason: 'Replay test'}, {'Idempotency-Key': k})));
    expect(results.every((r) => r.status === 202 || (r.status === 409 && r.body.error.code === 'IDEMPOTENCY_IN_PROGRESS'))).toBe(true);
    expect(await prisma.refund.count({where: {orderId: o.orderId}})).toBe(1);
    const parallel = await Promise.all(Array.from({length: 10}, () => finance.post(`/admin/orders/${o.orderId}/refund`, {amountPaise: '100000', reason: 'Parallel distinct'}, {'Idempotency-Key': key()})));
    expect(parallel.filter((r) => r.status === 202)).toHaveLength(1); // 500 + 1000 = 1500 ≤ 2000; a second 1000 would exceed
    const payment = await prisma.payment.findFirstOrThrow({where: {orderId: o.orderId}});
    expect(payment.refundedPaise).toBe(150_000n);
    expect((await prisma.order.findUniqueOrThrow({where: {id: o.orderId}})).refundedPaise).toBe(150_000n);
  });

  it('a coupon limited to 5 uses is redeemed at most 5 times under a 30-way race', async () => {
    const p = await product({stock: 100});
    const code = `RACE${ulid().slice(-6)}`;
    await prisma.discount.create({data: {id: ulid(), code, type: 'FIXED', value: 1000n, eligibleRulesJson: {}, limitTotal: 5}});
    const carts = await Promise.all(Array.from({length: 30}, () => cartWith(p.variantId, 1)));
    const results = await Promise.all(carts.map(({c, cartId}) => checkout(c, cartId, {couponCode: code})));
    expect(results.filter((r) => r.status === 201)).toHaveLength(5);
    expect((await prisma.discount.findUniqueOrThrow({where: {code}})).redeemedCount).toBe(5);
    expect((await inventory(p.variantId)).reservedQty).toBe(5); // failed checkouts released their holds
  });

  it('an admin stock edit racing checkouts never breaks the invariants', async () => {
    const p = await product({stock: 10});
    const admin = await staff('CATALOG_MANAGER');
    const carts = await Promise.all(Array.from({length: 20}, () => cartWith(p.variantId, 1)));
    const item = await inventory(p.variantId);
    const [adjust, ...orders] = await Promise.all([
      admin.patch(`/admin/inventory/${p.variantId}`, {delta: -5, reason: 'DAMAGE', expectedVersion: item.version}),
      ...carts.map(({c, cartId}) => checkout(c, cartId)),
    ]);
    const after = await inventory(p.variantId);
    expect(after.reservedQty).toBeLessThanOrEqual(after.onHandQty);
    expect(after.reservedQty).toBe(orders.filter((r) => r.status === 201).length);
    if (adjust.status === 200) expect(after.onHandQty).toBe(5);
    else expect(adjust.body.error.code).toMatch(/STALE_VERSION|CONFLICT/);
  });
});
