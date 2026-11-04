import {after} from 'next/server';
import {paymentMode, verifySignature} from '../../../../lib/razorpay';
import {recordBooking} from '../../../../lib/bookings';
import {checkBinding, issuePass, reportInputs} from '../../../../lib/report/access';

/** After Razorpay's checkout succeeds: verify the payment signature and the order binding, then issue the report pass. */
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return Response.json({error: 'Invalid request.'}, {status: 400}); }
  try {
    const inputs = reportInputs(body?.inputs);
    const orderId = String(body?.razorpay_order_id || ''), paymentId = String(body?.razorpay_payment_id || '');
    if (!verifySignature({orderId, paymentId, signature: body?.razorpay_signature}) || !checkBinding(orderId, inputs, body?.binding)) {
      return Response.json({error: 'We could not confirm this payment. If money was taken, contact us with your payment ID and we will send your report.'}, {status: 400});
    }
    after(() => recordBooking({environment: paymentMode() === 'test' ? 'test' : 'live', providerOrderId: orderId, providerPaymentId: paymentId, paymentStatus: 'PAID'}));
    return Response.json({pass: issuePass({inputs, orderId, paymentId, currency: body?.currency === 'USD' ? 'USD' : 'INR'}), paymentId});
  } catch (error) {
    return Response.json({error: error.message || 'Could not confirm the payment.'}, {status: error.status || 500});
  }
}
