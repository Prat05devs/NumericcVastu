import {verifyWebhook, summariseEvent} from '../../../../lib/razorpay';

/**
 * Razorpay webhook: the server-to-server record of a payment, delivered even if the visitor closes the tab.
 * Configure in Razorpay Dashboard > Account & Settings > Webhooks:
 *   URL      https://<your domain>/api/razorpay/webhook
 *   Secret   the same value as RAZORPAY_WEBHOOK_SECRET
 *   Events   payment.captured, payment.failed, order.paid, refund.processed
 * Optional: set BOOKING_NOTIFY_URL (a Google Apps Script web app, Zapier or Make "catch hook") to receive a
 * JSON summary of every event, e.g. to add a row to a Google Sheet or email Adarshh's team.
 * There is no database: Razorpay itself keeps the full payment and order history (with the booking details
 * stored as order notes), and this endpoint only verifies and forwards.
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

  const url = process.env.BOOKING_NOTIFY_URL;
  if (url) {
    try {
      await fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({source: 'numericcvaastu.com', eventId, ...summary}), signal: AbortSignal.timeout(5000)});
    } catch (error) {
      // Still answer 200: Razorpay's copy is the source of truth, and a retry storm would not help.
      console.error('Booking notification failed', error?.message);
    }
  }
  return Response.json({ok: true});
}
