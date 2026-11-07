import {after} from 'next/server';
import {confirmPayment, paymentMode, verifySignature} from '../../../../lib/razorpay';
import {limit} from '../../../../lib/rateLimit';
import {recordBooking} from '../../../../lib/bookings';

/** Confirms a payment really came from Razorpay by checking its signature with the secret key. */
export async function POST(request) {
  const slow = limit(request, 'verify', 30, 10 * 60_000);
  if (slow) return slow;
  let body;
  try { body = await request.json(); } catch { return Response.json({verified: false}, {status: 400}); }
  const signed = verifySignature({orderId: body?.razorpay_order_id, paymentId: body?.razorpay_payment_id, signature: body?.razorpay_signature});
  // Signature first, then Razorpay's own record: same order, full amount, payment went through.
  const confirmed = signed ? await confirmPayment(String(body.razorpay_order_id), String(body.razorpay_payment_id)) : false;
  const verified = signed && confirmed !== false;
  if (signed && confirmed) after(() => recordBooking({environment: paymentMode() === 'test' ? 'test' : 'live', providerOrderId: body.razorpay_order_id, providerPaymentId: body.razorpay_payment_id, paymentStatus: 'PAID'}));
  return Response.json({verified}, {status: verified ? 200 : 400});
}
