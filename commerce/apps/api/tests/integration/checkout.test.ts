import {beforeAll, describe, expect, it} from 'vitest';
import {Client, cartWith, checkout, configureShipping, inventory, key, payMock, prisma, product, address} from '../support/helpers.js';
import {putSetting} from '../../src/lib/settings.js';
import {ulid} from '../../src/lib/ids.js';

beforeAll(async () => { await configureShipping(); });

describe('cart and checkout (server-authoritative)', () => {
  it('prices on the server, holds stock, and consumes it exactly once on verified payment', async () => {
    const p = await product({stock: 5, pricePaise: 150_000n});
    const {c, cartId} = await cartWith(p.variantId, 2);
    const cart = await c.get(`/carts/${cartId}`);
    expect(cart.body.data.breakdown.subtotalPaise).toBe('300000');
    expect((await inventory(p.variantId)).reservedQty).toBe(0); // the cart never reserves

    const preview = await c.post('/checkout/preview', {cartId, shippingMethodId: 'standard'});
    expect(preview.body.data.breakdown).toMatchObject({subtotalPaise: '300000', shippingPaise: '0', totalPaise: '300000'}); // free above ₹1,999
    expect(preview.body.data.breakdown.warnings).toContain('TAX_NOT_CONFIGURED');

    const order = await checkout(c, cartId, {expectedTotalPaise: '300000'});
    expect(order.status).toBe(201);
    expect(order.body.data).toMatchObject({status: 'AWAITING_PAYMENT', totalPaise: '300000'});
    expect(await inventory(p.variantId)).toMatchObject({onHandQty: 5, reservedQty: 2});
    const lines = await prisma.orderLine.findMany({where: {orderId: order.body.data.orderId}});
    expect(lines[0]).toMatchObject({skuSnapshot: p.sku, unitPricePaise: 150_000n, qty: 2});

    const {orderId, orderAccessToken} = order.body.data;
    const view = await new Client().get(`/orders/${orderId}`, {'X-Order-Token': orderAccessToken});
    expect(view.body.data).toMatchObject({status: 'AWAITING_PAYMENT', verifyingPayment: false});

    await payMock(c, orderId, orderAccessToken);
    const paid = await prisma.order.findUniqueOrThrow({where: {id: orderId}});
    expect(paid).toMatchObject({status: 'PAID', paymentStatus: 'CAPTURED'});
    expect(await inventory(p.variantId)).toMatchObject({onHandQty: 3, reservedQty: 0});
    expect(await prisma.inventoryMovement.count({where: {variantId: p.variantId, kind: 'SALE'}})).toBe(1);
    expect(await prisma.jobOutbox.count({where: {dedupeKey: `order_paid:${orderId}`}})).toBe(1);
  });

  it('replays an idempotent checkout and rejects key reuse with a different body', async () => {
    const p = await product({stock: 3});
    const {c, cartId} = await cartWith(p.variantId, 1);
    const k = key();
    const body = {cartId, email: 'idem@example.test', shippingAddress: address, shippingMethodId: 'standard', acceptTerms: true};
    const first = await c.post('/checkout/orders', body, {'Idempotency-Key': k});
    const replay = await c.post('/checkout/orders', body, {'Idempotency-Key': k});
    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(replay.body.data.orderId).toBe(first.body.data.orderId);
    expect(await prisma.order.count({where: {email: 'idem@example.test'}})).toBe(1);
    expect((await inventory(p.variantId)).reservedQty).toBe(1);
    const reused = await c.post('/checkout/orders', {...body, email: 'other@example.test'}, {'Idempotency-Key': k});
    expect(reused.status).toBe(422);
    expect(reused.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect((await c.post('/checkout/orders', body)).body.error.code).toBe('VALIDATION_FAILED'); // key required
  });

  it('refuses a stale total, insufficient stock, unknown shipping and unsellable items', async () => {
    const p = await product({stock: 1, pricePaise: 50_000n});
    const {c, cartId} = await cartWith(p.variantId, 1);
    const stale = await checkout(c, cartId, {expectedTotalPaise: '1'});
    expect(stale.status).toBe(409);
    expect(stale.body.error).toMatchObject({code: 'PRICE_CHANGED', details: {totalPaise: '59900'}});
    await prisma.inventoryItem.update({where: {variantId: p.variantId}, data: {onHandQty: 0}});
    const out = await checkout(c, cartId);
    expect(out.status).toBe(409);
    expect(out.body.error.code).toBe('INSUFFICIENT_STOCK');
    await prisma.inventoryItem.update({where: {variantId: p.variantId}, data: {onHandQty: 1}});
    expect((await checkout(c, cartId, {shippingMethodId: 'teleport'})).status).toBe(422);
    await prisma.product.update({where: {id: p.productId}, data: {status: 'DRAFT'}});
    const draft = await checkout(c, cartId);
    expect(draft.status).toBe(409);
    expect(await prisma.order.count({where: {lines: {some: {variantId: p.variantId}}}})).toBe(0);
    expect((await inventory(p.variantId)).reservedQty).toBe(0); // every failure rolled back the hold
  });

  it('applies tax configuration (exclusive) and coupons with per-customer limits', async () => {
    await putSetting('tax', {mode: 'EXCLUSIVE', groups: {TEST_GST: 300}, shippingGroup: null, reviewedBy: 'Test advisor', reviewedOn: '2026-11-01'}, null);
    const p = await product({stock: 10, pricePaise: 100_000n});
    await prisma.product.update({where: {id: p.productId}, data: {taxGroup: 'TEST_GST'}});
    const code = `T${ulid().slice(-8)}`;
    await prisma.discount.create({data: {id: ulid(), code, type: 'PERCENT', value: 1000n, eligibleRulesJson: {}, limitPerCustomer: 1}});
    const {c, cartId} = await cartWith(p.variantId, 1);
    const preview = await c.post('/checkout/preview', {cartId, shippingMethodId: 'standard', couponCode: code});
    // ₹1,000 − 10% = ₹900; shipping ₹99; 3% tax on ₹900 = ₹27 → ₹1,026
    expect(preview.body.data.breakdown).toMatchObject({subtotalPaise: '100000', discountPaise: '10000', shippingPaise: '9900', taxPaise: '2700', totalPaise: '102600', taxMode: 'EXCLUSIVE'});
    const email = `coupon-${ulid().toLowerCase()}@example.test`;
    expect((await checkout(c, cartId, {couponCode: code, email})).status).toBe(201);
    const second = await cartWith(p.variantId, 1);
    const again = await checkout(second.c, second.cartId, {couponCode: code, email});
    expect(again.status).toBe(422);
    expect(again.body.error.code).toBe('COUPON_INVALID');
    await prisma.siteSetting.delete({where: {key: 'tax'}});
  });

  it('keeps carts private: another visitor gets 404', async () => {
    const p = await product({stock: 2});
    const {cartId} = await cartWith(p.variantId);
    const stranger = await new Client().init();
    expect((await stranger.get(`/carts/${cartId}`)).status).toBe(404);
    expect((await stranger.put(`/carts/${cartId}/items/${p.variantId}`, {qty: 2})).status).toBe(404);
    expect((await stranger.post('/checkout/preview', {cartId})).status).toBe(404);
  });
});
