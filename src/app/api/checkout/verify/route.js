import {verifySignature} from '../../../../lib/razorpay';

/** Confirms a payment really came from Razorpay by checking its signature with the secret key. */
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return Response.json({verified: false}, {status: 400}); }
  const verified = verifySignature({orderId: body?.razorpay_order_id, paymentId: body?.razorpay_payment_id, signature: body?.razorpay_signature});
  return Response.json({verified}, {status: verified ? 200 : 400});
}
