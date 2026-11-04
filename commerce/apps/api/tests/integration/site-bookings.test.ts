import {describe, expect, it} from 'vitest';
import {Client, staff} from '../support/helpers.js';
import {ulid} from '../../src/lib/ids.js';

const auth = {Authorization: 'Bearer test-site-bookings-secret-0123456789abcdefghij'};
const booking = (orderId: string, paymentStatus: string, extra: Record<string, unknown> = {}) => ({
  offerId: 'consult-blueprint', offerName: 'Personal Numerology Blueprint Session', kind: 'consultation', currency: 'INR', amountMinor: 1499900,
  environment: 'live', providerOrderId: orderId, paymentStatus, ...extra,
});

describe('main-website bookings', () => {
  it('needs the shared secret', async () => {
    const c = await new Client().init();
    expect((await c.post('/internal/bookings', booking(`order_${ulid()}`, 'CREATED'))).status).toBe(401);
    expect((await c.post('/internal/bookings', booking(`order_${ulid()}`, 'CREATED'), {Authorization: 'Bearer wrong'})).status).toBe(401);
  });

  it('records a checkout, marks it paid once, never moves it backwards and shows it to staff', async () => {
    const site = await new Client().init();
    const orderId = `order_${ulid()}`;
    const customer = {name: 'Riya Sharma', email: 'riya@example.test', phone: '+91 98765 43210'};
    const created = await site.post('/internal/bookings', booking(orderId, 'CREATED', {customer, details: {preferredDate: '2026-11-10'}}), auth);
    expect(created.status).toBe(200);
    expect(created.body.data).toMatchObject({paymentStatus: 'CREATED', created: true});

    // The browser's verified return knows only the ids.
    const paid = await site.post('/internal/bookings', {environment: 'live', providerOrderId: orderId, providerPaymentId: 'pay_123', paymentStatus: 'PAID'}, auth);
    expect(paid.body.data).toMatchObject({id: created.body.data.id, paymentStatus: 'PAID', created: false});
    // The webhook arriving after the browser's confirmation, or a stale failure event, changes nothing.
    expect((await site.post('/internal/bookings', booking(orderId, 'PAID'), auth)).body.data.paymentStatus).toBe('PAID');
    expect((await site.post('/internal/bookings', booking(orderId, 'FAILED', {failureReason: 'late'}), auth)).body.data.paymentStatus).toBe('PAID');
    expect((await site.post('/internal/bookings', booking(orderId, 'REFUNDED'), auth)).body.data.paymentStatus).toBe('REFUNDED');

    const support = await staff('SUPPORT');
    const list = await support.get('/admin/bookings?paymentStatus=REFUNDED');
    const row = list.body.data.find((b: {id: string}) => b.id === created.body.data.id);
    expect(row).toMatchObject({offerName: 'Personal Numerology Blueprint Session', amountMinor: '1499900', customerName: 'Riya Sharma', email: 'r***@e***.test', phone: '••••3210', providerPaymentId: 'pay_123'});
    expect(row.contactRef).toBeUndefined();
    const opened = await support.get(`/admin/bookings/${row.id}`);
    expect(opened.body.data.customer.email).toBe('riya@example.test');
    expect(opened.body.data.details.preferredDate).toBe('2026-11-10');
    expect((await support.patch(`/admin/bookings/${row.id}`, {status: 'CONTACTED'})).body.data.status).toBe('CONTACTED');
  });

  it('an id-only update for an unknown order is refused', async () => {
    const site = await new Client().init();
    expect((await site.post('/internal/bookings', {environment: 'live', providerOrderId: `order_${ulid()}`, paymentStatus: 'PAID'}, auth)).status).toBe(422);
  });

  it('a webhook that arrives before the order call still creates the booking with its details', async () => {
    const site = await new Client().init();
    const orderId = `order_${ulid()}`;
    const r = await site.post('/internal/bookings', booking(orderId, 'PAID', {providerPaymentId: 'pay_early', customer: {name: 'Webhook First', email: 'w@example.test'}}), auth);
    expect(r.body.data).toMatchObject({paymentStatus: 'PAID', created: true});
  });
});
