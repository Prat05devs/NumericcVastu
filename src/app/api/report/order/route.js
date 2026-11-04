import {createOrder} from '../../../../lib/razorpay';
import {requestCurrency} from '../../../../lib/currency';
import {bindOrder, reportInputs} from '../../../../lib/report/access';

/** Starts the ₹399 / $10 report payment. The price comes from the catalogue, never from the request. */
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return Response.json({error: 'Invalid request.'}, {status: 400}); }
  try {
    const inputs = reportInputs(body);
    const email = String(body?.email ?? '').trim().slice(0, 120);
    const order = await createOrder({
      offerId: 'report-full', currency: requestCurrency(request.headers),
      customer: {name: inputs.name, email: /^\S+@\S+\.\S+$/.test(email) ? email : '', phone: inputs.phone, city: ''},
      details: {fullName: inputs.name, dob: inputs.dob, gender: inputs.gender || 'not given', language: body?.language === 'hi' ? 'Hindi' : 'English', partnerDob: inputs.partnerDob, relationship: inputs.relationshipStatus},
    });
    return Response.json({...order, binding: bindOrder(order.orderId, inputs)});
  } catch (error) {
    return Response.json({error: error.message || 'Could not start the payment.'}, {status: error.status || 500});
  }
}
