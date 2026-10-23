import {createPaypalOrder} from '../../../../lib/paypal';
import {requestCurrency} from '../../../../lib/currency';

/** Creates a PayPal order for visitors outside India. The amount always comes from the offer catalogue. */
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return Response.json({error: 'Invalid request.'}, {status: 400}); }
  if (requestCurrency(request.headers) !== 'USD') return Response.json({error: 'PayPal is for payments from outside India. Please pay with Razorpay.'}, {status: 409});
  try {
    return Response.json(await createPaypalOrder(String(body?.offerId ?? '').slice(0, 60)));
  } catch (error) {
    return Response.json({error: error.message || 'Could not start the payment.'}, {status: error.status || 500});
  }
}
