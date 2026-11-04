import {after} from 'next/server';
import {paymentMode, verifySignature} from '../../../../lib/razorpay';
import {recordBooking} from '../../../../lib/bookings';

/** Confirms a payment really came from Razorpay by checking its signature with the secret key. */
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return Response.json({verified: false}, {status: 400}); }
  const verified = verifySignature({orderId: body?.razorpay_order_id, paymentId: body?.razorpay_payment_id, signature: body?.razorpay_signature});
  if (verified) after(() => recordBooking({environment: paymentMode() === 'test' ? 'test' : 'live', providerOrderId: body.razorpay_order_id, providerPaymentId: body.razorpay_payment_id, paymentStatus: 'PAID'}));
  return Response.json({verified}, {status: verified ? 200 : 400});
}
