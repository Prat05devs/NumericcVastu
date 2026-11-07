import {after} from 'next/server';
import {capturePaypalOrder} from '../../../../../lib/paypal';
import {recordBooking} from '../../../../../lib/bookings';
import {checkBinding, issuePass, reportInputs} from '../../../../../lib/report/access';
import {reportLink} from '../../../../../lib/report/fromOrder';
import {limit} from '../../../../../lib/rateLimit';

const clean = (v, max = 200) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

/**
 * Captures the PayPal report payment and issues the report pass. The binding is checked before any money is captured,
 * and the pass only after PayPal confirms the exact signed amount for the report (lib/paypal.js).
 */
export async function POST(request) {
  const slow = limit(request, 'report-paypal-capture', 20, 10 * 60_000);
  if (slow) return slow;
  let body;
  try { body = await request.json(); } catch { return Response.json({error: 'Invalid request.'}, {status: 400}); }
  try {
    const inputs = reportInputs(body?.inputs, {strict: true});
    const orderId = clean(body?.orderId, 40);
    if (!/^[A-Z0-9]{8,40}$/.test(orderId) || !checkBinding(orderId, inputs, body?.binding)) return Response.json({error: 'This payment does not match the report details. No money was taken.'}, {status: 400});
    const result = await capturePaypalOrder(orderId);
    if (!result.verified || result.offer?.id !== 'report-full') return Response.json({error: 'We could not confirm this payment. If money was taken, contact us with your PayPal receipt and we will send your report.'}, {status: 400});
    const pass = issuePass({inputs, orderId, paymentId: result.captureId, currency: 'USD'});
    const email = clean(body?.email, 120);
    after(() => recordBooking({
      offerId: 'report-full', offerName: result.offer.name, kind: 'report', currency: 'USD', amountMinor: Math.round(Number(result.amount) * 100),
      provider: 'paypal', environment: process.env.PAYPAL_ENV === 'live' ? 'live' : 'test', providerOrderId: orderId, providerPaymentId: result.captureId, paymentStatus: 'PAID',
      customer: {name: inputs.name, email: /^\S+@\S+\.\S+$/.test(email) ? email : result.payerEmail, phone: clean(body?.whatsapp, 20), city: ''},
      details: {fullName: inputs.name, dob: inputs.dob, gender: inputs.gender || 'not given', reportPhone: inputs.phone, partnerDob: inputs.partnerDob || '', relationship: inputs.relationshipStatus || '', updates: body?.updates ? 'Yes' : 'No'},
      marketingConsent: Boolean(body?.updates), reportUrl: reportLink(pass),
    }));
    return Response.json({pass, paymentId: result.captureId});
  } catch (error) {
    return Response.json({error: error.message || 'Could not confirm the payment.'}, {status: error.status || 500});
  }
}
