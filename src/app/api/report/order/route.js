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
    // The buyer's own WhatsApp number, for contact; the phone in the reading can be someone else's.
    const whatsapp = String(body?.whatsapp ?? '').trim().slice(0, 20);
    if (!/^\+?[0-9 ]{10,15}$/.test(whatsapp)) return Response.json({error: 'Please enter your WhatsApp number, for example +91 98765 43210.'}, {status: 400});
    const order = await createOrder({
      offerId: 'report-full', currency: requestCurrency(request.headers),
      customer: {name: inputs.name, email: /^\S+@\S+\.\S+$/.test(email) ? email : '', phone: whatsapp, city: ''},
      details: {fullName: inputs.name, dob: inputs.dob, gender: inputs.gender || 'not given', reportPhone: inputs.phone, partnerDob: inputs.partnerDob, relationship: inputs.relationshipStatus, updates: body?.updates ? 'Yes' : 'No'},
    });
    return Response.json({...order, binding: bindOrder(order.orderId, inputs)});
  } catch (error) {
    return Response.json({error: error.message || 'Could not start the payment.'}, {status: error.status || 500});
  }
}
