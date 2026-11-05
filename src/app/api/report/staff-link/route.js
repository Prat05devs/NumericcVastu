import {fetchPaymentWithOrder} from '../../../../lib/razorpay';
import {reportLinkFromOrder} from '../../../../lib/report/fromOrder';
import {safeSecretEqual} from '../../../../lib/report/secretEqual';

/**
 * For the back office (commerce API, Bearer SITE_BOOKINGS_SECRET): a report link for a paid report payment, so staff
 * can download the PDF for a customer and send it on WhatsApp. The payment is checked with Razorpay.
 */
export async function POST(request) {
  const secret = process.env.SITE_BOOKINGS_SECRET;
  if (!secret || !safeSecretEqual(request.headers.get('authorization') || '', `Bearer ${secret}`)) return Response.json({error: 'Unauthorized.'}, {status: 401});
  const body = await request.json().catch(() => ({}));
  const found = await fetchPaymentWithOrder(String(body?.paymentId || ''));
  const paid = found && (found.payment.status === 'captured' || found.order.status === 'paid');
  const link = paid ? reportLinkFromOrder(found.order, body.paymentId) : null;
  return link ? Response.json({link}) : Response.json({error: 'No paid report found for this payment.'}, {status: 404});
}
