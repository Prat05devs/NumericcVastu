import 'server-only';
import {createHash} from 'node:crypto';

/**
 * Coupons for courses, consultations and the report, checked against the back office (Grow → Coupons) through
 * the commerce API. The discount is always worked out on the server; the browser only shows the result.
 */
const apiUrl = () => (process.env.COMMERCE_API_URL || 'https://api.numericcvaastu.com').replace(/\/+$/, '');
/** A stable, private key for "uses per customer": the last ten digits of the WhatsApp number, hashed. */
export const customerKey = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? createHash('sha256').update(`nv-customer|${digits}`).digest('hex') : undefined;
};

export async function quoteCoupon({code, offer, currency, amountMinor, phone}) {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) return null;
  if (!/^[A-Z0-9_-]{3,32}$/.test(clean)) return {valid: false, message: 'This code is not valid or has expired.'};
  const secret = process.env.SITE_BOOKINGS_SECRET;
  if (!secret) return {valid: false, message: 'Coupons are not available right now.'};
  try {
    const res = await fetch(`${apiUrl()}/api/v1/internal/coupons/quote`, {
      method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${secret}`},
      body: JSON.stringify({code: clean, offerKind: offer.kind, amountMinor, currency, ...(customerKey(phone) && {customerKey: customerKey(phone)})}),
      signal: AbortSignal.timeout(15000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return {valid: false, message: 'We could not check this code just now. Please try again.'};
    const q = body.data || {};
    return q.valid ? {valid: true, code: q.code, description: q.description || '', discountMinor: Number(q.discountMinor), finalMinor: Number(q.finalMinor)} : {valid: false, message: q.message || 'This code is not valid.'};
  } catch {
    return {valid: false, message: 'We could not check this code just now. Please try again.'};
  }
}
