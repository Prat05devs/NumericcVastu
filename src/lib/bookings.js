import 'server-only';

/**
 * Records course, consultation and report bookings in the commerce database, where staff see them under
 * Admin → Website bookings (admin.numericcvaastu.com/admin/bookings). Razorpay stays the payment record; this is
 * the working list. It never blocks or fails a payment: errors are logged and the webhook repeats the update.
 * Needs SITE_BOOKINGS_SECRET (the same value as the API app's) and optionally COMMERCE_API_URL.
 */
const apiUrl = () => (process.env.COMMERCE_API_URL || 'https://api.numericcvaastu.com').replace(/\/+$/, '');

export async function recordBooking(booking) {
  const secret = process.env.SITE_BOOKINGS_SECRET;
  if (!secret) return;
  try {
    const res = await fetch(`${apiUrl()}/api/v1/internal/bookings`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${secret}`},
      body: JSON.stringify(booking),
      signal: AbortSignal.timeout(15000), // the API app may be waking from sleep
    });
    if (!res.ok) console.error('Booking not recorded', res.status, booking.providerOrderId, (await res.text()).slice(0, 300));
  } catch (error) {
    console.error('Booking not recorded', booking.providerOrderId, error?.message);
  }
}

/** The booking fields for an offer at a given amount. */
export const bookingOffer = (offer, currency, amountMinor) => ({offerId: offer.id, offerName: offer.name, kind: offer.kind, currency, amountMinor});
