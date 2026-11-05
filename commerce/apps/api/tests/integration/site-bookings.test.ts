import {describe, expect, it} from 'vitest';
import {Client, staff, prisma} from '../support/helpers.js';
import {ulid} from '../../src/lib/ids.js';
import {devMailbox} from '../../src/lib/mail.js';
import {runOutbox} from '../../src/services/jobs.js';

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

describe('website coupons and booking emails', () => {
  const quote = (site: Client, body: Record<string, unknown>) => site.post('/internal/coupons/quote', {offerKind: 'report', amountMinor: 39900, currency: 'INR', ...body}, auth);
  const coupon = (code: string, data: Record<string, unknown>) => prisma.discount.create({data: {id: ulid(), code, type: 'PERCENT', value: 1000n, eligibleRulesJson: {families: [], productIds: [], storefronts: []}, active: true, ...data}});

  it('prices percentage and fixed coupons, respects where and what they apply to, and never goes below ₹1', async () => {
    const site = await new Client().init();
    await coupon('WEB10', {});
    await coupon('FLAT500', {type: 'FIXED', value: 50000n, eligibleRulesJson: {families: ['COURSE'], productIds: [], storefronts: ['website']}});
    await coupon('SHOPONLY', {eligibleRulesJson: {families: [], productIds: [], storefronts: ['crystal']}});
    await coupon('OLD', {endsAt: new Date(Date.now() - 1000)});
    expect((await quote(site, {code: 'web10'})).body.data).toMatchObject({valid: true, code: 'WEB10', discountMinor: '3900', finalMinor: '36000'});
    expect((await quote(site, {code: 'FLAT500'})).body.data.valid).toBe(false); // course-only
    expect((await quote(site, {code: 'FLAT500', offerKind: 'course', amountMinor: 2999900})).body.data).toMatchObject({valid: true, discountMinor: '50000', finalMinor: '2949900'});
    expect((await quote(site, {code: 'FLAT500', offerKind: 'course', amountMinor: 30000})).body.data).toMatchObject({valid: true, finalMinor: '100'});
    expect((await quote(site, {code: 'SHOPONLY'})).body.data.valid).toBe(false);
    expect((await quote(site, {code: 'OLD'})).body.data.valid).toBe(false);
    expect((await quote(site, {code: 'NOPE'})).body.data.valid).toBe(false);
    expect((await site.post('/internal/coupons/quote', {code: 'WEB10', offerKind: 'report', amountMinor: 39900, currency: 'INR'})).status).toBe(401);
  });

  it('a paid booking counts the coupon once and queues one customer and one team email', async () => {
    const site = await new Client().init();
    const d = await coupon(`ONCE${Date.now() % 100000}`, {limitTotal: 5});
    const orderId = `order_${ulid()}`;
    await site.post('/internal/bookings', booking(orderId, 'CREATED', {customer: {name: 'Mail Test', email: 'mail@example.test', phone: '9876500000'}, couponCode: d.code, discountMinor: 150000, listAmountMinor: 1499900, marketingConsent: true}), auth);
    for (const _ of [1, 2]) await site.post('/internal/bookings', {environment: 'live', providerOrderId: orderId, providerPaymentId: 'pay_mail', paymentStatus: 'PAID'}, auth);
    expect((await prisma.discount.findUnique({where: {id: d.id}}))!.redeemedCount).toBe(1);
    const b = await prisma.serviceBooking.findFirst({where: {providerOrderId: orderId}});
    expect(b).toMatchObject({couponCode: d.code, marketingConsent: true});
    const jobs = await prisma.jobOutbox.findMany({where: {dedupeKey: {in: [`site-booking-customer:${b!.id}`, `site-booking-team:${b!.id}`]}}});
    expect(jobs).toHaveLength(2);
    await runOutbox(new Date(Date.now() + 1000));
    const mine = devMailbox().filter((m) => m.to === 'mail@example.test' || (m.to === 'team@example.test' && m.subject.includes('Mail Test')));
    const customer = mine.find((m) => m.to === 'mail@example.test')!;
    expect(customer.subject).toBe('Booking confirmed: Personal Numerology Blueprint Session');
    expect(customer.text).toContain(`coupon ${d.code} saved ₹1,500`);
    expect(customer.text).toContain('contact you on WhatsApp at 9876500000');
    expect(customer.html).toContain('pay_mail');
    const team = mine.find((m) => m.to === 'team@example.test')!;
    expect(team.subject).toContain('New consultation: Personal Numerology Blueprint Session');
    expect(team.text).toContain('WhatsApp: 9876500000');
  });
});
