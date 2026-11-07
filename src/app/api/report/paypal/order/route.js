import {createPaypalOrder, paypalPayment} from '../../../../../lib/paypal';
import {findOffer, onlinePayment} from '../../../../../lib/razorpay';
import {requestCurrency} from '../../../../../lib/currency';
import {bindOrder, reportInputs} from '../../../../../lib/report/access';
import {limit} from '../../../../../lib/rateLimit';

/** Which ways a visitor abroad can pay for the report (the client ID is public). */
export async function GET(request) {
  const offer = findOffer('report-full');
  const pp = paypalPayment(offer);
  return Response.json({currency: requestCurrency(request.headers), paypal: pp.enabled ? {clientId: pp.clientId, mode: pp.mode} : null, razorpayUsd: onlinePayment(offer, 'USD').enabled}, {headers: {'Cache-Control': 'no-store'}});
}

/** The $10 report through PayPal, for visitors outside India. Same checks as the Razorpay route; amount from the catalogue. */
export async function POST(request) {
  const slow = limit(request, 'report-paypal-order', 15, 10 * 60_000);
  if (slow) return slow;
  let body;
  try { body = await request.json(); } catch { return Response.json({error: 'Invalid request.'}, {status: 400}); }
  if (requestCurrency(request.headers) !== 'USD') return Response.json({error: 'PayPal is for payments from outside India.'}, {status: 409});
  try {
    const inputs = reportInputs(body, {strict: true});
    if (!/^\+?[0-9 ]{10,15}$/.test(String(body?.whatsapp ?? '').trim())) return Response.json({error: 'Please enter your WhatsApp number, for example +61 412 345 678.'}, {status: 400});
    const {orderId} = await createPaypalOrder('report-full');
    return Response.json({orderId, binding: bindOrder(orderId, inputs)});
  } catch (error) {
    return Response.json({error: error.message || 'Could not start the payment.'}, {status: error.status || 500});
  }
}
