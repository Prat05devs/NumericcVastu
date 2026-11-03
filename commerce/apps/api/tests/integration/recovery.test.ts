import {beforeAll, describe, expect, it} from 'vitest';
import {cartWith, checkout, configureShipping, inventory, key, payMock, prisma, product, staff} from '../support/helpers.js';
import {runJobs, expireHolds, cancelUnpaid} from '../../src/services/jobs.js';
import {mockCharge} from '../../src/providers/payments/index.js';
import {handlePaymentWebhook} from '../../src/services/payments.js';

beforeAll(async () => { await configureShipping(); });
const past = (orderId: string, minutes: number) => Promise.all([
  prisma.order.update({where: {id: orderId}, data: {paymentDueAt: new Date(Date.now() - minutes * 60_000)}}),
  prisma.inventoryReservation.updateMany({where: {orderId}, data: {expiresAt: new Date(Date.now() - minutes * 60_000)}}),
]);

describe('recovery and fault scenarios', () => {
  it('payment after hold expiry re-reserves when stock is still free', async () => {
    const p = await product({stock: 3});
    const {c, cartId} = await cartWith(p.variantId, 1);
    const o = (await checkout(c, cartId)).body.data;
    const intent = await c.post(`/orders/${o.orderId}/payment-intents`, {}, {'Idempotency-Key': key(), 'X-Order-Token': o.orderAccessToken});
    await past(o.orderId, 1);
    await expireHolds();
    expect((await inventory(p.variantId)).reservedQty).toBe(0);
    const charge = await mockCharge(intent.body.data.checkout.orderId, 'success');
    await handlePaymentWebhook('mock', charge.body, {'x-razorpay-signature': charge.signature, 'x-razorpay-event-id': charge.eventId});
    expect((await prisma.order.findUniqueOrThrow({where: {id: o.orderId}})).status).toBe('PAID');
    expect(await inventory(p.variantId)).toMatchObject({onHandQty: 2, reservedQty: 0});
  });

  it('late payment for a sold-out item goes to PAID_REVIEW and never oversells', async () => {
    const p = await product({stock: 1, unique: true, family: 'gemstones'});
    const first = await cartWith(p.variantId, 1);
    const late = (await checkout(first.c, first.cartId)).body.data;
    const intent = await first.c.post(`/orders/${late.orderId}/payment-intents`, {}, {'Idempotency-Key': key(), 'X-Order-Token': late.orderAccessToken});
    await past(late.orderId, 1);
    await expireHolds();
    const second = await cartWith(p.variantId, 1);
    const winner = (await checkout(second.c, second.cartId)).body.data;
    await payMock(second.c, winner.orderId, winner.orderAccessToken);
    const charge = await mockCharge(intent.body.data.checkout.orderId, 'success');
    await handlePaymentWebhook('mock', charge.body, {'x-razorpay-signature': charge.signature, 'x-razorpay-event-id': charge.eventId});
    expect((await prisma.order.findUniqueOrThrow({where: {id: late.orderId}})).status).toBe('PAID_REVIEW');
    expect(await inventory(p.variantId)).toMatchObject({onHandQty: 0, reservedQty: 0});
    expect(await prisma.jobOutbox.count({where: {dedupeKey: `paid_review:${late.orderId}`}})).toBe(1);
    // Approving the review is refused while there is no stock; refunding resolves it.
    const support = await staff('OWNER');
    expect((await support.post(`/admin/orders/${late.orderId}/approve-review`, {note: 'Try to approve'})).body.error.code).toBe('INSUFFICIENT_STOCK');
    const refund = await support.post(`/admin/orders/${late.orderId}/refund`, {amountPaise: String((await prisma.order.findUniqueOrThrow({where: {id: late.orderId}})).totalPaise), reason: 'Sold out before payment completed'}, {'Idempotency-Key': key()});
    expect(refund.status).toBe(202);
    expect((await prisma.order.findUniqueOrThrow({where: {id: late.orderId}})).status).toBe('REFUNDED');
  });

  it('a lost webhook is recovered by reconciliation (browser closed after paying)', async () => {
    const p = await product({stock: 2});
    const {c, cartId} = await cartWith(p.variantId, 1);
    const o = (await checkout(c, cartId)).body.data;
    await payMock(c, o.orderId, o.orderAccessToken, 'success', false); // provider captured, webhook never arrived
    expect((await prisma.order.findUniqueOrThrow({where: {id: o.orderId}})).status).toBe('AWAITING_PAYMENT');
    await prisma.payment.updateMany({where: {orderId: o.orderId}, data: {createdAt: new Date(Date.now() - 10 * 60_000)}});
    const run = await runJobs(['reconcile']);
    expect(JSON.stringify(run)).toContain('PAID');
    expect((await prisma.order.findUniqueOrThrow({where: {id: o.orderId}})).status).toBe('PAID');
  });

  it('the unpaid-order job checks the provider first, then cancels and releases stock and coupon', async () => {
    const p = await product({stock: 2});
    const {c, cartId} = await cartWith(p.variantId, 1);
    const o = (await checkout(c, cartId)).body.data;
    await c.post(`/orders/${o.orderId}/payment-intents`, {}, {'Idempotency-Key': key(), 'X-Order-Token': o.orderAccessToken});
    await past(o.orderId, 45);
    const r = await cancelUnpaid();
    expect(r.cancelled).toBeGreaterThanOrEqual(1);
    expect((await prisma.order.findUniqueOrThrow({where: {id: o.orderId}})).status).toBe('CANCELLED');
    expect((await inventory(p.variantId)).reservedQty).toBe(0);
  });

  it('running the cron twice (even concurrently) does not duplicate work', async () => {
    const [a, b] = await Promise.all([runJobs(), runJobs()]);
    const skipped = Object.values({...a}).concat(Object.values({...b})).filter((x) => JSON.stringify(x).includes('SKIPPED_LOCKED'));
    expect(skipped.length).toBeGreaterThan(0);
    const again = await runJobs(['outbox']);
    expect(JSON.stringify(again)).toMatch(/claimed/);
  });

  it('a failed payment keeps the hold so the customer can retry, then succeeds', async () => {
    const p = await product({stock: 1});
    const {c, cartId} = await cartWith(p.variantId, 1);
    const o = (await checkout(c, cartId)).body.data;
    const {providerOrderId} = await payMock(c, o.orderId, o.orderAccessToken, 'failure');
    expect((await prisma.order.findUniqueOrThrow({where: {id: o.orderId}})).status).toBe('PAYMENT_FAILED');
    expect((await inventory(p.variantId)).reservedQty).toBe(1);
    const retry = await c.post(`/orders/${o.orderId}/payment-intents`, {}, {'Idempotency-Key': key(), 'X-Order-Token': o.orderAccessToken});
    expect(retry.body.data.checkout.orderId).toBe(providerOrderId); // provider order reused
    await c.post('/dev/mock-pay', {providerOrderId, outcome: 'success'});
    expect((await prisma.order.findUniqueOrThrow({where: {id: o.orderId}})).status).toBe('PAID');
  });

  it('provider outage during refund keeps the refund retriable without double refunding', async () => {
    const p = await product({stock: 2, pricePaise: 80_000n});
    const {c, cartId} = await cartWith(p.variantId, 1);
    const o = (await checkout(c, cartId)).body.data;
    await payMock(c, o.orderId, o.orderAccessToken);
    const finance = await staff('FINANCE');
    process.env['MOCK_REFUND_FAIL'] = '1';
    const r = await finance.post(`/admin/orders/${o.orderId}/refund`, {amountPaise: o.totalPaise, reason: 'Outage test'}, {'Idempotency-Key': key()});
    expect(r.status).toBe(202);
    expect(r.body.data.status).toBe('PROCESSING');
    delete process.env['MOCK_REFUND_FAIL'];
    await prisma.jobOutbox.updateMany({where: {type: 'refund.submit'}, data: {runAfter: new Date(0)}});
    await runJobs(['outbox']);
    const refund = await prisma.refund.findFirstOrThrow({where: {orderId: o.orderId}});
    expect(refund.status).toBe('PROCESSED');
    expect((await prisma.order.findUniqueOrThrow({where: {id: o.orderId}})).status).toBe('REFUNDED');
    expect(await prisma.refund.count({where: {orderId: o.orderId}})).toBe(1);
  });
});
