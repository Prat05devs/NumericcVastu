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
import {getSetting} from '../lib/settings.js';

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
const Quote = z.object({code: text(40).optional(), offerKind: z.enum(['course', 'consultation', 'report']), amountMinor: z.union([z.number().int().positive(), z.string().regex(/^\d{1,12}$/)]), currency: z.enum(['INR', 'USD']), customerKey: z.string().regex(/^[a-f0-9]{64}$/).optional()});
/** Rule shared by coupons and sale campaigns. */
type SaleRule = {type?: string; percentBp?: number; amountPaise?: string; maxDiscountPaise?: string; minOrderPaise?: string; appliesTo?: {families?: string[]}};
/** Discount a rule gives on one website price: whole rupees, capped, minimum order in INR; fixed amounts are INR-only. */
function ruleDiscount(rule: SaleRule, amount: bigint, currency: 'INR' | 'USD'): bigint {
  if (currency === 'INR' && rule.minOrderPaise && amount < BigInt(rule.minOrderPaise)) return 0n;
  let d = 0n;
  if (rule.type === 'PERCENT' && rule.percentBp) {
    d = (amount * BigInt(rule.percentBp)) / 10_000n;
    if (currency === 'INR') d = (d / 100n) * 100n;
    if (currency === 'INR' && rule.maxDiscountPaise && d > BigInt(rule.maxDiscountPaise)) d = BigInt(rule.maxDiscountPaise);
  } else if (rule.type === 'FIXED' && rule.amountPaise && currency === 'INR') d = BigInt(rule.amountPaise);
  return d > 0n ? d : 0n;
}
/** Sale campaigns running now that reach the website (storefronts blank or 'website'), optionally for one kind. */
async function websiteSales(kind?: string) {
  const now = new Date();
  const rows = await prisma.campaign.findMany({where: {active: true, startsAt: {lte: now}, endsAt: {gt: now}}, orderBy: {priority: 'desc'}});
  return rows.filter((c) => {
    const fronts = (c.storefronts ?? []) as string[];
    const fam = ((c.ruleJson as SaleRule)?.appliesTo?.families ?? []).map((f) => f.toUpperCase());
    const reachesSite = !fronts.length || fronts.includes('website');
    const siteFamilies = fam.filter((f) => ['COURSE', 'CONSULTATION', 'REPORT'].includes(f));
    if (!reachesSite || (fam.length && !siteFamilies.length)) return false;
    // A blank list means courses and consultations; the report joins a sale only when REPORT is listed.
    return !kind || (fam.length ? fam.includes(kind.toUpperCase()) : kind !== 'report');
  });
}
const FLOOR = 100n; // Razorpay's smallest charge is ₹1 / $1: nothing becomes free through checkout.

route(r, {method: 'get', path: '/site/events', access: 'PUBLIC', tag: 'Content', summary: 'NumericcVaastu events for the website calendar (back office → Settings → Website events)'}, async (_req, res) => {
  const today = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
  const s = await getSetting('siteEvents');
  res.setHeader('Cache-Control', 'public, max-age=60');
  send(res, (s?.events ?? []).filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)));
});

route(r, {method: 'get', path: '/site/sale', access: 'PUBLIC', tag: 'Content', summary: 'Sale campaigns running on the website (for price display and the announcement strip)'}, async (_req, res) => {
  const sales = await websiteSales();
  res.setHeader('Cache-Control', 'public, max-age=30');
  send(res, sales.map((c) => {
    const rule = c.ruleJson as SaleRule;
    const theme = (c.themeJson ?? {}) as {bannerText?: string; showCountdown?: boolean};
    return {name: c.name, endsAt: c.endsAt, startsAt: c.startsAt, priority: c.priority, rule: {type: rule.type, percentBp: rule.percentBp ?? null, amountPaise: rule.amountPaise ?? null, maxDiscountPaise: rule.maxDiscountPaise ?? null, minOrderPaise: rule.minOrderPaise ?? null, families: (rule.appliesTo?.families ?? []).map((f) => f.toUpperCase())}, bannerText: theme.bannerText ?? '', showCountdown: Boolean(theme.showCountdown)};
  }));
});

route(r, {method: 'post', path: '/internal/coupons/quote', access: 'INTERNAL', tag: 'Operations', summary: 'Price a website booking: running sale plus an optional coupon (Bearer SITE_BOOKINGS_SECRET)', body: Quote}, async (req, res) => {
  noStore(res);
  const secret = env().SITE_BOOKINGS_SECRET;
  if (!secret || !safeEqual(req.get('Authorization') ?? '', `Bearer ${secret}`)) throw new AppError('UNAUTHENTICATED', 401, 'Unauthorized.');
  const q = parse(Quote, req.body);
  const amount = BigInt(q.amountMinor);
  const invalid = (message: string) => send(res, {valid: false, message});
  // The best running sale for this kind of booking applies automatically.
  let sale: {name: string; discount: bigint} | null = null;
  for (const c of await websiteSales(q.offerKind)) {
    const d = ruleDiscount(c.ruleJson as SaleRule, amount, q.currency);
    if (d > 0n && (!sale || d > sale.discount)) sale = {name: c.name, discount: d};
  }
  if (sale && amount - sale.discount < FLOOR) sale.discount = amount - FLOOR;
  const afterSale = amount - (sale?.discount ?? 0n);
  const code = q.code?.trim().toUpperCase();
  if (!code) return send(res, toPlain({valid: true, code: null, description: '', sale: sale && {name: sale.name, discountMinor: sale.discount}, couponDiscountMinor: 0n, discountMinor: sale?.discount ?? 0n, finalMinor: afterSale}));

  const d = await prisma.discount.findUnique({where: {code}});
  const now = new Date();
  if (!d || !d.active || (d.startsAt && d.startsAt > now) || (d.endsAt && d.endsAt < now)) return invalid('This code is not valid or has expired.');
  const rules = (d.eligibleRulesJson ?? {}) as {families?: string[]; storefronts?: string[]; lockedToLink?: boolean};
  if (rules.lockedToLink) return invalid('This code only works through its partner link.');
  if (rules.storefronts?.length && !rules.storefronts.includes('website')) return invalid('This code is for the crystal shop, not for this booking.');
  if (rules.families?.length && !rules.families.includes(q.offerKind.toUpperCase())) return invalid(`This code does not apply to ${q.offerKind === 'report' ? 'the report' : `${q.offerKind}s`}.`);
  if (d.limitTotal && d.redeemedCount >= d.limitTotal) return invalid('This code has been fully used.');
  if (d.limitPerCustomer && q.customerKey && (await prisma.serviceBooking.count({where: {couponCode: d.code, customerKey: q.customerKey, paymentStatus: 'PAID'}})) >= d.limitPerCustomer) return invalid('You have already used this code.');
  if (sale && !d.combinable) return invalid(`The price already includes the ${sale.name}, so this code can’t be added on top.`);
  if (q.currency === 'INR' && d.minOrderPaise && afterSale < d.minOrderPaise) return invalid(`This code needs a minimum of ₹${(Number(d.minOrderPaise) / 100).toLocaleString('en-IN')}.`);
  if (d.type !== 'PERCENT' && q.currency !== 'INR') return invalid('This code works for payments in rupees.');
  let discount = ruleDiscount({type: d.type, percentBp: d.type === 'PERCENT' ? Number(d.value) : undefined, amountPaise: d.type === 'FIXED' ? d.value.toString() : undefined, maxDiscountPaise: d.capPaise?.toString()}, afterSale, q.currency);
  if (afterSale - discount < FLOOR) discount = afterSale - FLOOR;
  if (discount <= 0n) return invalid('This code does not reduce this price.');
  send(res, toPlain({valid: true, code: d.code, description: d.description, sale: sale && {name: sale.name, discountMinor: sale.discount}, couponDiscountMinor: discount, discountMinor: (sale?.discount ?? 0n) + discount, finalMinor: afterSale - discount}));
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
/** CSV of paid website customers for records; ?consent=1 keeps only people who agreed to hear about offers (audited). */
route(r, {method: 'get', path: '/admin/bookings/export', access: 'STAFF:requests.read', tag: 'Admin requests', summary: 'Export paid website bookings as CSV (audited)'}, requireStaff('requests.read'), async (req, res) => {
  noStore(res);
  const consent = req.query.consent === '1';
  const rows = await prisma.serviceBooking.findMany({where: {paymentStatus: {in: ['PAID', 'REFUNDED']}, ...(consent && {marketingConsent: true})}, orderBy: {paidAt: 'desc'}, take: 5000});
  const cell = (v: unknown) => { const t = String(v ?? '').replace(/\r?\n/g, ' '); return /[",]/.test(t) || /^[=+\-@]/.test(t) ? `"${t.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : t; };
  const head = ['Paid on', 'Booking', 'Type', 'Amount', 'Currency', 'Coupon', 'Payment status', 'Follow-up', 'Name', 'WhatsApp', 'Email', 'City', 'Agreed to offers', 'Payment ID'];
  const lines = rows.map((b) => {
    const {customer} = contactOf(b.contactRef);
    return [b.paidAt?.toISOString().slice(0, 10), b.offerName, b.kind, (Number(b.amountMinor) / 100).toFixed(2), b.currency, b.couponCode, b.paymentStatus, b.status, customer.name, customer.phone, customer.email, customer.city, b.marketingConsent ? 'Yes' : 'No', b.providerPaymentId].map(cell).join(',');
  });
  await audit(prisma, auditCtx(req, res), 'booking.export', 'service_booking', consent ? 'consented' : 'all', {count: rows.length});
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="numericcvaastu-${consent ? 'opted-in-customers' : 'website-bookings'}-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send('\uFEFF' + [head.join(','), ...lines].join('\r\n'));
});

route(r, {method: 'get', path: '/admin/bookings/:id', access: 'STAFF:requests.read', tag: 'Admin requests', summary: 'Open a booking with contact and intake details (audited)'}, requireStaff('requests.read'), async (req, res) => {
  noStore(res);
  const booking = await prisma.serviceBooking.findUnique({where: {id: param(req, 'id')}});
  if (!booking) throw notFound('Booking');
  await audit(prisma, auditCtx(req, res), 'booking.view_private', 'service_booking', booking.id, {});
  const {contactRef, ...row} = booking;
  send(res, toPlain({...row, ...contactOf(contactRef)}));
});
/**
 * Report PDF links for staff (download for a customer, send on WhatsApp). Uses the link saved with the booking; for
 * older bookings, asks the website to rebuild it from Razorpay's record of the payment, then saves it.
 */
route(r, {method: 'get', path: '/admin/bookings/:id/report', access: 'STAFF:requests.read', tag: 'Admin requests', summary: 'Report PDF links for a paid report booking (audited)'}, requireStaff('requests.read'), async (req, res) => {
  noStore(res);
  const booking = await prisma.serviceBooking.findUnique({where: {id: param(req, 'id')}});
  if (!booking || booking.kind !== 'report') throw notFound('Report booking');
  if (booking.paymentStatus !== 'PAID' && booking.paymentStatus !== 'REFUNDED') throw new AppError('CONFLICT', 409, 'This report has not been paid.');
  const stored = JSON.parse(decrypt(booking.contactRef)) as {customer: Record<string, string>; details: Record<string, string>; links?: Record<string, string>};
  let link = stored.links?.report;
  if (!link && booking.providerPaymentId && env().SITE_BOOKINGS_SECRET) {
    const r2 = await fetch(`${env().SITE_URL}/api/report/staff-link`, {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${env().SITE_BOOKINGS_SECRET}`}, body: JSON.stringify({paymentId: booking.providerPaymentId}), signal: AbortSignal.timeout(20000)}).catch(() => null);
    link = r2?.ok ? ((await r2.json()) as {link?: string}).link : undefined;
    if (link) await prisma.serviceBooking.update({where: {id: booking.id}, data: {contactRef: encrypt(JSON.stringify({...stored, links: {...(stored.links ?? {}), report: link}}))}});
  }
  if (!link) throw new AppError('SERVICE_UNAVAILABLE', 503, 'The report link could not be prepared. Try again in a minute.');
  await audit(prisma, auditCtx(req, res), 'booking.report_link', 'service_booking', booking.id, {});
  const pass = new URL(link).searchParams.get('pass') ?? '';
  const pdf = (lang: string, download: boolean) => `${env().SITE_URL}/api/report/pdf?pass=${encodeURIComponent(pass)}&lang=${lang}${download ? '&download=1' : ''}`;
  send(res, {view: {en: pdf('en', false), hi: pdf('hi', false)}, download: {en: pdf('en', true), hi: pdf('hi', true)}, customerLink: link});
});

const Status = z.object({status: z.enum(['NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED'])});
route(r, {method: 'patch', path: '/admin/bookings/:id', access: 'STAFF:requests.write', tag: 'Admin requests', summary: 'Update a booking’s follow-up status', body: Status}, requireStaff('requests.write'), async (req, res) => {
  const {status} = parse(Status, req.body);
  const n = await prisma.serviceBooking.updateMany({where: {id: param(req, 'id')}, data: {status}});
  if (n.count !== 1) throw notFound('Booking');
  await audit(prisma, auditCtx(req, res), 'booking.status', 'service_booking', param(req, 'id'), {status});
  send(res, {id: param(req, 'id'), status});
});
