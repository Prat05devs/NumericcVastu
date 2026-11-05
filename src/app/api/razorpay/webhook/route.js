import {fetchPaymentWithOrder, findOffer, paymentMode, verifyWebhook, summariseEvent} from '../../../../lib/razorpay';
import {reportLinkFromOrder} from '../../../../lib/report/fromOrder';
import {customerKey} from '../../../../lib/coupons';
import {recordBooking} from '../../../../lib/bookings';
import {notifyBooking} from '../../../../lib/notify';

/**
 * Razorpay webhook: the server-to-server record of a payment, delivered even if the visitor closes the tab.
 * Configure in Razorpay Dashboard > Account & Settings > Webhooks:
 *   URL      https://<your domain>/api/razorpay/webhook
 *   Secret   the same value as RAZORPAY_WEBHOOK_SECRET
 *   Events   payment.captured, payment.failed, order.paid, refund.processed
 * Optional: set BOOKING_NOTIFY_URL (a Google Apps Script web app, Zapier or Make "catch hook") to receive a
 * JSON summary of every event, e.g. to add a row to a Google Sheet or email Adarshh's team.
 * Razorpay keeps the full payment and order history (with the booking details stored as order notes). Each event
 * also updates the booking in Admin → Website bookings (lib/bookings.js), so a payment is recorded even when the
 * visitor closes the tab before returning to the site.
 */
const seen = new Map(); // best-effort de-duplication of retried deliveries within one server instance
const HANDLED = new Set(['payment.captured', 'payment.failed', 'order.paid', 'refund.processed', 'refund.failed', 'payment.authorized']);

export async function POST(request) {
  const raw = await request.text();
  if (!verifyWebhook(raw, request.headers.get('x-razorpay-signature'))) {
    return Response.json({ok: false, error: 'Invalid signature'}, {status: 400});
  }
  let event;
  try { event = JSON.parse(raw); } catch { return Response.json({ok: false, error: 'Invalid JSON'}, {status: 400}); }

  const eventId = request.headers.get('x-razorpay-event-id') || `${event.event}:${event.created_at}:${event?.payload?.payment?.entity?.id || ''}`;
  if (seen.has(eventId)) return Response.json({ok: true, duplicate: true});
  seen.set(eventId, Date.now());
  for (const [id, at] of seen) if (Date.now() - at > 86400000) seen.delete(id);

  if (!HANDLED.has(event.event)) return Response.json({ok: true, ignored: event.event});
  const summary = summariseEvent(event);
  console.info('Razorpay webhook', summary.event, summary.paymentId || summary.orderId, summary.offer, summary.amount);

  await notifyBooking({eventId, ...summary});
  const status = {'payment.captured': 'PAID', 'order.paid': 'PAID', 'payment.failed': 'FAILED', 'refund.processed': 'REFUNDED'}[event.event];
  // Only website offers: the crystal shop's orders on the same Razorpay account are recorded by the shop itself.
  const offer = findOffer(summary.offerId);
  if (status && summary.orderId && offer) {
    const {offer: _o, offer_id: _id, name: _n, phone: _p, email: _e, city: _c, coupon, discount, ...details} = summary.details || {};
    // A report bought by someone who closed the tab still gets its link in the confirmation email.
    const reportUrl = status === 'PAID' && offer.kind === 'report' && summary.paymentId ? reportLinkFromOrder((await fetchPaymentWithOrder(summary.paymentId))?.order, summary.paymentId) : null;
    await recordBooking({
      offerId: offer.id, offerName: offer.name, kind: offer.kind,
      currency: summary.currency === 'USD' ? 'USD' : 'INR', amountMinor: Math.round(summary.amount * 100),
      provider: 'razorpay', environment: paymentMode() === 'test' ? 'test' : 'live', providerOrderId: summary.orderId,
      ...(summary.paymentId && {providerPaymentId: summary.paymentId}), paymentStatus: status,
      ...(status === 'FAILED' && summary.error && {failureReason: summary.error.slice(0, 300)}),
      customer: summary.customer, details: Object.fromEntries(Object.entries(details).map(([k, v]) => [k, String(v)])),
      ...(coupon && {couponCode: String(coupon), discountMinor: Math.round(Number(discount || 0) * 100)}),
      ...(customerKey(summary.customer.phone) && {customerKey: customerKey(summary.customer.phone)}),
      ...(reportUrl && {reportUrl}),
    });
  }
  return Response.json({ok: true});
}
