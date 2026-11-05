import {Router} from 'express';
import {z} from 'zod';
import {env} from '../config/env.js';
import {prisma} from '../lib/db.js';
import {AppError, notFound} from '../lib/errors.js';
import {ulid} from '../lib/ids.js';
import {decrypt, encrypt, safeEqual} from '../lib/crypto.js';
import {noStore, param, parse, route, send, toPlain} from '../lib/http.js';
import {audit} from '../lib/audit.js';
import {maskEmail} from '../lib/redact.js';
import {auditCtx, requireStaff} from '../middleware/auth.js';
import {enqueue} from '../lib/outbox.js';
import {transaction} from '../lib/tx.js';
import {runOutbox} from '../services/jobs.js';
import {logger} from '../lib/logger.js';

/**
 * Bookings from the main website: courses, consultations and the paid numerology report. The site owns the
 * Razorpay order; it reports the order when it is created and again when it is paid, fails or is refunded
 * (from the browser's verified return and from Razorpay's webhook, whichever arrives first). Staff work the
 * booking through NEW → CONTACTED → SCHEDULED → COMPLETED here.
 */
export const siteBookingsRouter = Router();
const r = siteBookingsRouter;

const text = (max: number) => z.string().trim().max(max);
const Ingest = z.object({
  // Required when the booking is new; a status update (e.g. the browser's verified return) may send only the ids.
  offerId: text(60).min(1).optional(),
  offerName: text(200).min(1).optional(),
  kind: z.enum(['course', 'consultation', 'report']).optional(),
  currency: z.enum(['INR', 'USD']).optional(),
  amountMinor: z.union([z.number().int().nonnegative(), z.string().regex(/^\d{1,12}$/)]).optional(),
  provider: z.enum(['razorpay', 'paypal']).default('razorpay'),
  environment: z.enum(['test', 'live']),
  providerOrderId: text(80).min(1),
  providerPaymentId: text(80).optional(),
  paymentStatus: z.enum(['CREATED', 'PAID', 'FAILED', 'REFUNDED']),
  failureReason: text(300).optional(),
  customer: z.record(z.string(), text(254)).optional(),
  details: z.record(z.string(), text(1000)).optional(),
  couponCode: text(40).optional(),
  discountMinor: z.union([z.number().int().nonnegative(), z.string().regex(/^\d{1,12}$/)]).optional(),
  listAmountMinor: z.union([z.number().int().nonnegative(), z.string().regex(/^\d{1,12}$/)]).optional(),
  customerKey: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  marketingConsent: z.boolean().optional(),
  reportUrl: z.string().url().max(1000).optional(),
});
// A late or repeated event never moves a booking backwards: paid stays paid until refunded.
const RANK = {CREATED: 0, FAILED: 1, PAID: 2, REFUNDED: 3} as const;

route(r, {method: 'post', path: '/internal/bookings', access: 'INTERNAL', tag: 'Operations', summary: 'Record a main-website booking (Bearer SITE_BOOKINGS_SECRET)', body: Ingest}, async (req, res) => {
  noStore(res);
  const secret = env().SITE_BOOKINGS_SECRET;
  if (!secret) throw new AppError('SERVICE_UNAVAILABLE', 503, 'Bookings are not configured.');
  if (!safeEqual(req.get('Authorization') ?? '', `Bearer ${secret}`)) throw new AppError('UNAUTHENTICATED', 401, 'Unauthorized.');
  const b = parse(Ingest, req.body);
  const where = {provider_providerOrderId: {provider: b.provider, providerOrderId: b.providerOrderId}};
  const result = await transaction(async (tx) => {
    const existing = await tx.serviceBooking.findUnique({where});
    const extras = {
      ...(b.couponCode && {couponCode: b.couponCode.toUpperCase()}), ...(b.discountMinor !== undefined && {discountMinor: BigInt(b.discountMinor)}),
      ...(b.listAmountMinor !== undefined && {listAmountMinor: BigInt(b.listAmountMinor)}), ...(b.customerKey && {customerKey: b.customerKey}),
      ...(b.marketingConsent !== undefined && {marketingConsent: b.marketingConsent}),
    };
    let booking;
    if (!existing) {
      if (!b.offerId || !b.offerName || !b.kind || !b.currency || b.amountMinor === undefined) throw new AppError('VALIDATION_FAILED', 422, 'A new booking needs the offer, amount and currency.');
      booking = await tx.serviceBooking.create({data: {
        id: ulid(), offerId: b.offerId, offerName: b.offerName, kind: b.kind, currency: b.currency, amountMinor: BigInt(b.amountMinor),
        provider: b.provider, environment: b.environment, providerOrderId: b.providerOrderId, providerPaymentId: b.providerPaymentId ?? null,
        paymentStatus: b.paymentStatus, failureReason: b.failureReason ?? null, ...(b.paymentStatus === 'PAID' && {paidAt: new Date()}), ...extras,
        contactRef: encrypt(JSON.stringify({customer: b.customer ?? {}, details: b.details ?? {}, links: b.reportUrl ? {report: b.reportUrl} : {}})),
      }});
    } else {
      const forward = RANK[b.paymentStatus] >= RANK[existing.paymentStatus as keyof typeof RANK];
      // The order-time details are the richest; a later event only fills in what is missing (e.g. the report link).
      const stored = JSON.parse(decrypt(existing.contactRef)) as {customer: Record<string, string>; details: Record<string, string>; links?: Record<string, string>};
      const next = {customer: Object.keys(stored.customer).length ? stored.customer : (b.customer ?? {}), details: Object.keys(stored.details).length ? stored.details : (b.details ?? stored.details), links: {...(stored.links ?? {}), ...(b.reportUrl && !stored.links?.report && {report: b.reportUrl})}};
      booking = await tx.serviceBooking.update({where, data: {
        ...(b.providerPaymentId && {providerPaymentId: b.providerPaymentId}),
        ...(forward && b.paymentStatus !== existing.paymentStatus && {paymentStatus: b.paymentStatus, ...(b.paymentStatus === 'PAID' && !existing.paidAt && {paidAt: new Date()}), ...(b.failureReason && {failureReason: b.failureReason})}),
        ...(!existing.couponCode && extras), contactRef: encrypt(JSON.stringify(next)),
      }});
    }
    const firstPaid = booking.paymentStatus === 'PAID' && !booking.mailedAt;
    if (firstPaid) {
      // Counted once, when the money arrives; checkouts that are never paid do not use up a coupon.
      if (booking.couponCode) await tx.discount.updateMany({where: {code: booking.couponCode}, data: {redeemedCount: {increment: 1}}});
      await enqueue(tx, 'email.site_booking_customer', {bookingId: booking.id}, `site-booking-customer:${booking.id}`);
      await enqueue(tx, 'email.site_booking_team', {bookingId: booking.id}, `site-booking-team:${booking.id}`);
      await tx.serviceBooking.update({where: {id: booking.id}, data: {mailedAt: new Date()}});
    }
    return {booking, created: !existing, firstPaid};
  });
  // Send straight away; the cron job retries anything that fails.
  if (result.firstPaid) setImmediate(() => { runOutbox().catch((err) => logger.error({err}, 'booking mail run failed')); });
  send(res, {id: result.booking.id, paymentStatus: result.booking.paymentStatus, created: result.created});
});

/**
 * Coupon check for the website's checkout: the same coupons staff create under Grow → Coupons. A coupon works on the
 * website when "Where it works" includes it (no restriction = everywhere) and, if it names families, one of them is
 * COURSE, CONSULTATION or REPORT for the item being bought. Coupons locked to a partner link are not typed in.
 */
const Quote = z.object({code: text(40).min(1), offerKind: z.enum(['course', 'consultation', 'report']), amountMinor: z.union([z.number().int().positive(), z.string().regex(/^\d{1,12}$/)]), currency: z.enum(['INR', 'USD']), customerKey: z.string().regex(/^[a-f0-9]{64}$/).optional()});
route(r, {method: 'post', path: '/internal/coupons/quote', access: 'INTERNAL', tag: 'Operations', summary: 'Price a coupon for a website booking (Bearer SITE_BOOKINGS_SECRET)', body: Quote}, async (req, res) => {
  noStore(res);
  const secret = env().SITE_BOOKINGS_SECRET;
  if (!secret || !safeEqual(req.get('Authorization') ?? '', `Bearer ${secret}`)) throw new AppError('UNAUTHENTICATED', 401, 'Unauthorized.');
  const q = parse(Quote, req.body);
  const amount = BigInt(q.amountMinor);
  const invalid = (message: string) => send(res, {valid: false, message});
  const d = await prisma.discount.findUnique({where: {code: q.code.trim().toUpperCase()}});
  const now = new Date();
  if (!d || !d.active || (d.startsAt && d.startsAt > now) || (d.endsAt && d.endsAt < now)) return invalid('This code is not valid or has expired.');
  const rules = (d.eligibleRulesJson ?? {}) as {families?: string[]; storefronts?: string[]; lockedToLink?: boolean};
  if (rules.lockedToLink) return invalid('This code only works through its partner link.');
  if (rules.storefronts?.length && !rules.storefronts.includes('website')) return invalid('This code is for the crystal shop, not for this booking.');
  if (rules.families?.length && !rules.families.includes(q.offerKind.toUpperCase())) return invalid(`This code does not apply to ${q.offerKind === 'report' ? 'the report' : `${q.offerKind}s`}.`);
  if (d.limitTotal && d.redeemedCount >= d.limitTotal) return invalid('This code has been fully used.');
  if (d.limitPerCustomer && q.customerKey && (await prisma.serviceBooking.count({where: {couponCode: d.code, customerKey: q.customerKey, paymentStatus: 'PAID'}})) >= d.limitPerCustomer) return invalid('You have already used this code.');
  if (q.currency === 'INR' && d.minOrderPaise && amount < d.minOrderPaise) return invalid(`This code needs a minimum of ₹${(Number(d.minOrderPaise) / 100).toLocaleString('en-IN')}.`);
  let discount: bigint;
  if (d.type === 'PERCENT') {
    discount = (amount * d.value) / 10_000n;
    if (q.currency === 'INR') discount = (discount / 100n) * 100n; // whole rupees, as the shop does
    if (q.currency === 'INR' && d.capPaise && discount > d.capPaise) discount = d.capPaise;
  } else {
    if (q.currency !== 'INR') return invalid('This code works for payments in rupees.');
    discount = d.value;
  }
  // Razorpay's smallest charge is ₹1 / $1; a coupon can never make a booking free through checkout.
  const floor = 100n;
  if (amount - discount < floor) discount = amount - floor;
  if (discount <= 0n) return invalid('This code does not reduce this price.');
  send(res, toPlain({valid: true, code: d.code, description: d.description, discountMinor: discount, finalMinor: amount - discount}));
});

const contactOf = (ref: string) => JSON.parse(decrypt(ref)) as {customer: Record<string, string>; details: Record<string, string>};
const maskPhone = (phone = '') => (phone.replace(/\D/g, '').length > 4 ? `••••${phone.replace(/\D/g, '').slice(-4)}` : '');

route(r, {method: 'get', path: '/admin/bookings', access: 'STAFF:requests.read', tag: 'Admin requests', summary: 'Website bookings (contact masked; open for details)'}, requireStaff('requests.read'), async (req, res) => {
  noStore(res);
  const pay = typeof req.query.paymentStatus === 'string' && ['CREATED', 'PAID', 'FAILED', 'REFUNDED'].includes(req.query.paymentStatus) ? req.query.paymentStatus : undefined;
  const rows = await prisma.serviceBooking.findMany({where: pay ? {paymentStatus: pay} : {}, orderBy: {createdAt: 'desc'}, take: 300});
  send(res, toPlain(rows.map(({contactRef, ...row}) => {
    const {customer} = contactOf(contactRef);
    return {...row, customerName: customer.name ?? '', email: customer.email ? maskEmail(customer.email) : '', phone: maskPhone(customer.phone)};
  })));
});
route(r, {method: 'get', path: '/admin/bookings/:id', access: 'STAFF:requests.read', tag: 'Admin requests', summary: 'Open a booking with contact and intake details (audited)'}, requireStaff('requests.read'), async (req, res) => {
  noStore(res);
  const booking = await prisma.serviceBooking.findUnique({where: {id: param(req, 'id')}});
  if (!booking) throw notFound('Booking');
  await audit(prisma, auditCtx(req, res), 'booking.view_private', 'service_booking', booking.id, {});
  const {contactRef, ...row} = booking;
  send(res, toPlain({...row, ...contactOf(contactRef)}));
});
const Status = z.object({status: z.enum(['NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED'])});
route(r, {method: 'patch', path: '/admin/bookings/:id', access: 'STAFF:requests.write', tag: 'Admin requests', summary: 'Update a booking’s follow-up status', body: Status}, requireStaff('requests.write'), async (req, res) => {
  const {status} = parse(Status, req.body);
  const n = await prisma.serviceBooking.updateMany({where: {id: param(req, 'id')}, data: {status}});
  if (n.count !== 1) throw notFound('Booking');
  await audit(prisma, auditCtx(req, res), 'booking.status', 'service_booking', param(req, 'id'), {status});
  send(res, {id: param(req, 'id'), status});
});
