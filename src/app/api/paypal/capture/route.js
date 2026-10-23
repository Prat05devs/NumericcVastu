import {capturePaypalOrder} from '../../../../lib/paypal';
import {notifyBooking} from '../../../../lib/notify';

const clean = (v, max = 500) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

/**
 * Captures an approved PayPal order and forwards the booking to BOOKING_NOTIFY_URL. PayPal keeps no booking
 * details, so the visitor's details travel with this request; the payment itself is checked with PayPal.
 */
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return Response.json({verified: false}, {status: 400}); }
  try {
    const result = await capturePaypalOrder(clean(body?.orderId, 40));
    const customer = {name: clean(body?.customer?.name, 80), email: clean(body?.customer?.email, 120), phone: clean(body?.customer?.phone, 20), city: clean(body?.customer?.city, 60)};
    const details = Object.fromEntries(Object.entries(body?.details || {}).slice(0, 40).map(([k, v]) => [clean(k, 40), clean(v)]));
    await notifyBooking({event: result.verified ? 'paypal.capture.completed' : 'paypal.capture.check', createdAt: new Date().toISOString(), offer: result.offer?.name || '', offerId: result.offer?.id || '', amount: Number(result.amount) || 0, currency: 'USD', status: result.verified ? 'captured' : 'check', paymentId: result.captureId, orderId: clean(body?.orderId, 40), method: 'paypal', customer: {...customer, email: customer.email || result.payerEmail}, details});
    return Response.json({verified: result.verified, captureId: result.captureId}, {status: result.verified ? 200 : 400});
  } catch (error) {
    return Response.json({verified: false, error: error.message}, {status: error.status || 500});
  }
}
