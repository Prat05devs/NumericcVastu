import 'server-only';
import {createHmac, timingSafeEqual} from 'node:crypto';
import {offerCatalog, getPrice, formatPrice} from '../data/offers';

/**
 * Razorpay Standard Checkout, server side. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the Vercel
 * environment (never in code). With test keys (rzp_test_…) every offer can be paid in test mode so the whole
 * flow can be tried end to end; with live keys an offer is payable only when its price is confirmed
 * (priceVerified and checkoutEnabled in data/offers.ts).
 * Visitors outside India pay in US dollars, which Razorpay accepts only once international payments are enabled
 * on the account (Dashboard > Account & Settings > International payments); then set RAZORPAY_INTERNATIONAL=on.
 */
const keyId = () => process.env.RAZORPAY_KEY_ID || '';
const keySecret = () => process.env.RAZORPAY_KEY_SECRET || '';

export function paymentMode() {
  if (!keyId() || !keySecret()) return 'off';
  return keyId().startsWith('rzp_test_') ? 'test' : 'live';
}

/** Whether this offer can be paid online right now in this currency, and why not if it cannot. */
export function onlinePayment(offer, currency = 'INR') {
  const mode = paymentMode();
  if (!offer?.active) return {enabled: false, mode, reason: 'This offering is not currently available.'};
  if (mode === 'off') return {enabled: false, mode, reason: 'Online payment is being set up.'};
  if (currency === 'USD' && process.env.RAZORPAY_INTERNATIONAL !== 'on') return {enabled: false, mode, reason: 'Card payment in US dollars is being set up.'};
  if (mode === 'live' && !(offer.priceVerified && offer.checkoutEnabled)) return {enabled: false, mode, reason: 'The fee for this offering is being confirmed.'};
  return {enabled: true, mode, reason: ''};
}

export function findOffer(id) {
  return offerCatalog.offers.find((o) => o.id === id) || null;
}

/** Razorpay notes allow 15 keys of up to 256 characters; keep the most useful details there. */
function toNotes(offer, customer, details) {
  const notes = {offer: offer.name, offer_id: offer.id, name: customer.name, phone: customer.phone, email: customer.email, city: customer.city || ''};
  const priority = ['fullName', 'dob', 'tob', 'pob', 'gender', 'mode', 'preferredDate', 'preferredTime', 'language'];
  for (const key of priority) if (details[key] && Object.keys(notes).length < 14) notes[key] = String(details[key]).slice(0, 250);
  const rest = Object.entries(details).filter(([k, v]) => v && !priority.includes(k)).map(([k, v]) => `${k}: ${v}`).join(' | ');
  if (rest) notes.details = rest.slice(0, 250);
  return notes;
}

export async function createOrder({offerId, currency, customer, details}) {
  const offer = findOffer(offerId);
  const state = onlinePayment(offer, currency);
  if (!state.enabled) throw Object.assign(new Error(state.reason), {status: 409});
  const amount = getPrice(offer, currency);
  const receipt = `nv_${offer.id}_${Date.now().toString(36)}`.slice(0, 40);
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${keyId()}:${keySecret()}`).toString('base64')}`},
    body: JSON.stringify({amount, currency, receipt, notes: toNotes(offer, customer, details)}),
  });
  const data = await res.json();
  if (!res.ok) {
    // Never show gateway internals to visitors; keep them in the server log for the site owner.
    console.error('Razorpay order failed', res.status, data?.error?.description);
    throw Object.assign(new Error('Online payment is temporarily unavailable. Please try again shortly, or send your booking on WhatsApp.'), {status: 502});
  }
  return {orderId: data.id, amount, currency, keyId: keyId(), offerName: offer.name, priceLabel: formatPrice(offer, undefined, currency), mode: state.mode};
}

export function verifySignature({orderId, paymentId, signature}) {
  if (!orderId || !paymentId || !signature || !keySecret()) return false;
  const expected = createHmac('sha256', keySecret()).update(`${orderId}|${paymentId}`).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(String(signature));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Checks the X-Razorpay-Signature header: HMAC-SHA256 of the exact raw body with the webhook secret. */
export function verifyWebhook(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  if (!secret || !signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(String(signature));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** A flat, readable summary of a payment event for notifications (email, Sheets, Zapier, Make). */
export function summariseEvent(event) {
  const payment = event?.payload?.payment?.entity || {};
  const order = event?.payload?.order?.entity || {};
  const refund = event?.payload?.refund?.entity || {};
  const notes = {...(order.notes || {}), ...(payment.notes || {})};
  return {
    event: event?.event,
    createdAt: event?.created_at ? new Date(event.created_at * 1000).toISOString() : new Date().toISOString(),
    offer: notes.offer || '',
    offerId: notes.offer_id || '',
    amount: (payment.amount ?? order.amount_paid ?? order.amount ?? refund.amount ?? 0) / 100,
    currency: payment.currency || order.currency || 'INR',
    status: payment.status || order.status || refund.status || '',
    paymentId: payment.id || refund.payment_id || '',
    orderId: payment.order_id || order.id || '',
    method: payment.method || '',
    error: payment.error_description || '',
    customer: {name: notes.name || '', phone: notes.phone || payment.contact || '', email: notes.email || payment.email || '', city: notes.city || ''},
    details: notes,
  };
}
