import 'server-only';

/**
 * Sends a JSON summary of a payment to BOOKING_NOTIFY_URL (Google Apps Script, Zapier or Make catch hook),
 * e.g. to add a row to a Google Sheet or email Adarshh's team. Failures are logged, never thrown: the payment
 * provider's own record is the source of truth.
 */
export async function notifyBooking(summary) {
  const url = process.env.BOOKING_NOTIFY_URL;
  if (!url) return;
  try {
    await fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({source: 'numericcvaastu.com', ...summary}), signal: AbortSignal.timeout(5000)});
  } catch (error) {
    console.error('Booking notification failed', error?.message);
  }
}
