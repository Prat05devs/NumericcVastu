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
  const existing = await prisma.serviceBooking.findUnique({where});
  const paid = b.paymentStatus === 'PAID' ? {paidAt: new Date()} : {};
  if (!existing) {
    if (!b.offerId || !b.offerName || !b.kind || !b.currency || b.amountMinor === undefined) throw new AppError('VALIDATION_FAILED', 422, 'A new booking needs the offer, amount and currency.');
    const created = await prisma.serviceBooking.create({data: {
      id: ulid(), offerId: b.offerId, offerName: b.offerName, kind: b.kind, currency: b.currency, amountMinor: BigInt(b.amountMinor),
      provider: b.provider, environment: b.environment, providerOrderId: b.providerOrderId, providerPaymentId: b.providerPaymentId ?? null,
      paymentStatus: b.paymentStatus, failureReason: b.failureReason ?? null, ...paid,
      contactRef: encrypt(JSON.stringify({customer: b.customer ?? {}, details: b.details ?? {}})),
    }});
    return send(res, {id: created.id, paymentStatus: created.paymentStatus, created: true});
  }
  const forward = RANK[b.paymentStatus] >= RANK[existing.paymentStatus as keyof typeof RANK];
  // The order-time details are the richest; a later event only fills them in when the first call never arrived.
  const stored = JSON.parse(decrypt(existing.contactRef)) as {customer: Record<string, string>; details: Record<string, string>};
  const fill = !Object.keys(stored.customer).length && b.customer ? {contactRef: encrypt(JSON.stringify({customer: b.customer, details: b.details ?? stored.details}))} : {};
  const updated = await prisma.serviceBooking.update({where, data: {
    ...(b.providerPaymentId && {providerPaymentId: b.providerPaymentId}),
    ...(forward && b.paymentStatus !== existing.paymentStatus && {paymentStatus: b.paymentStatus, ...(b.paymentStatus === 'PAID' && !existing.paidAt && {paidAt: new Date()}), ...(b.failureReason && {failureReason: b.failureReason})}),
    ...fill,
  }});
  send(res, {id: updated.id, paymentStatus: updated.paymentStatus, created: false});
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
