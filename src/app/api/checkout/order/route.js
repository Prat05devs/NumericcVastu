import {createOrder} from '../../../../lib/razorpay';
import {requestCurrency} from '../../../../lib/currency';

const clean = (v, max = 500) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

/** Creates a Razorpay order. The amount always comes from the offer catalogue and the currency from the visitor's country, never from the request body. */
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return Response.json({error: 'Invalid request.'}, {status: 400}); }
  const customer = {name: clean(body?.customer?.name, 80), email: clean(body?.customer?.email, 120), phone: clean(body?.customer?.phone, 20), city: clean(body?.customer?.city, 60)};
  if (!customer.name || !/^\S+@\S+\.\S+$/.test(customer.email) || !/^\+?[0-9 ]{10,15}$/.test(customer.phone)) return Response.json({error: 'Please check your name, email and phone number.'}, {status: 400});
  const details = Object.fromEntries(Object.entries(body?.details || {}).slice(0, 40).map(([k, v]) => [clean(k, 40), clean(v)]));
  try {
    return Response.json(await createOrder({offerId: clean(body?.offerId, 60), currency: requestCurrency(request.headers), customer, details}));
  } catch (error) {
    return Response.json({error: error.message || 'Could not start the payment.'}, {status: error.status || 500});
  }
}
