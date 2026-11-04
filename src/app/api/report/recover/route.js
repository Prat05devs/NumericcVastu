import {fetchPaymentWithOrder} from '../../../../lib/razorpay';
import {issuePass, reportInputs} from '../../../../lib/report/access';

/**
 * "Already paid?" — reissues the report pass from Razorpay's own record, for a buyer on another device or after the
 * browser forgot it. Needs the payment ID and the phone number used: the payment must be captured, for the report,
 * and the phone must match. The report details come from the order's notes, saved when the order was created.
 */
const digits = (value) => String(value || '').replace(/\D/g, '').slice(-10);
const tries = new Map(); // light brake on guessing: 10 attempts per address per 10 minutes, per server instance

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const recent = (tries.get(ip) || []).filter((t) => now - t < 600_000);
  if (recent.length >= 10) return Response.json({error: 'Too many attempts. Please wait ten minutes, or contact us on WhatsApp.'}, {status: 429});
  tries.set(ip, [...recent, now]);

  let body;
  try { body = await request.json(); } catch { return Response.json({error: 'Invalid request.'}, {status: 400}); }
  const paymentId = String(body?.paymentId || '').trim();
  const phone = digits(body?.phone);
  const notFound = Response.json({error: 'We could not find a paid report for that payment ID and phone number. Check both and try again, or contact us on WhatsApp.'}, {status: 404});
  if (!paymentId || phone.length < 10) return notFound;
  const found = await fetchPaymentWithOrder(paymentId);
  if (!found) return notFound;
  const {payment, order} = found;
  const notes = order.notes || {};
  const paid = payment.status === 'captured' || order.status === 'paid';
  const extra = Object.fromEntries(String(notes.details || '').split(' | ').map((part) => part.split(': ')).filter((pair) => pair.length === 2));
  // Either number works: the buyer's WhatsApp (notes.phone, Razorpay contact) or the phone analysed in the report.
  const numbers = [notes.phone, payment.contact, extra.reportPhone].map(digits).filter(Boolean);
  if (!paid || notes.offer_id !== 'report-full' || !numbers.includes(phone)) return notFound;
  try {
    const inputs = reportInputs({name: notes.fullName || notes.name, dob: notes.dob, gender: notes.gender, phone: extra.reportPhone || notes.phone, partnerDob: extra.partnerDob || '', relationshipStatus: extra.relationship || 'unspecified'});
    return Response.json({pass: issuePass({inputs, orderId: order.id, paymentId, currency: order.currency === 'USD' ? 'USD' : 'INR'}), paymentId, name: inputs.name});
  } catch {
    return notFound;
  }
}
