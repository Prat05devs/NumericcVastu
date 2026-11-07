import {after} from 'next/server';
import {confirmPayment, paymentMode, verifySignature} from '../../../../lib/razorpay';
import {limit} from '../../../../lib/rateLimit';
import {recordBooking} from '../../../../lib/bookings';
import {checkBinding, issuePass, reportInputs} from '../../../../lib/report/access';
import {reportLink} from '../../../../lib/report/fromOrder';

/** After Razorpay's checkout succeeds: verify the payment signature and the order binding, then issue the report pass. */
export async function POST(request) {
  const slow = limit(request, 'report-access', 20, 10 * 60_000);
  if (slow) return slow;
  let body;
  try { body = await request.json(); } catch { return Response.json({error: 'Invalid request.'}, {status: 400}); }
  try {
    const inputs = reportInputs(body?.inputs);
    const orderId = String(body?.razorpay_order_id || ''), paymentId = String(body?.razorpay_payment_id || '');
    if (!verifySignature({orderId, paymentId, signature: body?.razorpay_signature}) || !checkBinding(orderId, inputs, body?.binding)) {
      return Response.json({error: 'We could not confirm this payment. If money was taken, contact us with your payment ID and we will send your report.'}, {status: 400});
    }
    // The report is delivered only once Razorpay confirms the payment itself (fail closed; the buyer can recover it later).
    if ((await confirmPayment(orderId, paymentId)) !== true) {
      return Response.json({error: 'We are still confirming this payment with the bank. Open “Get my report again” in a few minutes with your payment ID, or contact us.'}, {status: 409});
    }
    const pass = issuePass({inputs, orderId, paymentId, currency: body?.currency === 'USD' ? 'USD' : 'INR'});
    after(() => recordBooking({environment: paymentMode() === 'test' ? 'test' : 'live', providerOrderId: orderId, providerPaymentId: paymentId, paymentStatus: 'PAID', reportUrl: reportLink(pass)}));
    return Response.json({pass, paymentId});
  } catch (error) {
    return Response.json({error: error.message || 'Could not confirm the payment.'}, {status: error.status || 500});
  }
}
