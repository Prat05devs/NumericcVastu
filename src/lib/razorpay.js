import 'server-only';
import {createHmac, timingSafeEqual} from 'node:crypto';
import {after} from 'next/server';
import {offerCatalog, reportOffer, getPrice, formatPrice} from '../data/offers';
import {bookingOffer, recordBooking} from './bookings';
import {customerKey, quoteCoupon} from './coupons';
import {getWebsiteSales} from './sale';
import {bestSale} from './saleMath';

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
  return [...offerCatalog.offers, reportOffer].find((o) => o.id === id) || null;
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

export async function createOrder({offerId, currency, customer, details, couponCode}) {
  const offer = findOffer(offerId);
  const state = onlinePayment(offer, currency);
  if (!state.enabled) throw Object.assign(new Error(state.reason), {status: 409});
  const listAmount = getPrice(offer, currency);
  // A coupon is re-checked here, at the moment of payment, whatever the browser showed earlier.
  const coupon = couponCode ? await quoteCoupon({code: couponCode, offer, currency, amountMinor: listAmount, phone: customer.phone}) : null;
  if (coupon && !coupon.valid) throw Object.assign(new Error(coupon.message), {status: 409});
  // A running sale (back office → Sales & festive themes) applies on its own; with a code, the API priced both.
  const sale = coupon?.valid ? (coupon.sale ? {sale: {name: coupon.sale.name}, discountMinor: coupon.sale.discountMinor} : null) : bestSale(await getWebsiteSales(), offer, listAmount, currency);
  const amount = coupon?.valid ? coupon.finalMinor : listAmount - (sale?.discountMinor || 0);
  const receipt = `nv_${offer.id}_${Date.now().toString(36)}`.slice(0, 40);
  const notes = toNotes(offer, customer, details);
  if (coupon?.valid) { notes.coupon = coupon.code; notes.discount = String(coupon.discountMinor / 100); }
  else if (sale) { notes.sale = sale.sale.name.slice(0, 250); notes.discount = String(sale.discountMinor / 100); }
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${keyId()}:${keySecret()}`).toString('base64')}`},
    body: JSON.stringify({amount, currency, receipt, notes}),
  });
  const data = await res.json();
  if (!res.ok) {
    // Never show gateway internals to visitors; keep them in the server log for the site owner.
    console.error('Razorpay order failed', res.status, data?.error?.description);
    throw Object.assign(new Error('Online payment is temporarily unavailable. Please try again shortly, or send your booking on WhatsApp.'), {status: 502});
  }
  // Recorded after the response so a sleeping API app never delays the payment window.
  after(() => recordBooking({...bookingOffer(offer, currency, amount), provider: 'razorpay', environment: state.mode, providerOrderId: data.id, paymentStatus: 'CREATED', customer, details,
    listAmountMinor: listAmount, ...(coupon?.valid ? {couponCode: coupon.code, discountMinor: coupon.discountMinor} : sale ? {discountMinor: sale.discountMinor} : {}),
    ...(customerKey(customer.phone) && {customerKey: customerKey(customer.phone)}), marketingConsent: details?.updates === 'Yes'}));
  const fmt = (minor) => new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {style: 'currency', currency, maximumFractionDigits: 0}).format(minor / 100);
  return {orderId: data.id, amount, currency, keyId: keyId(), offerName: offer.name, priceLabel: fmt(amount), listPriceLabel: formatPrice(offer, undefined, currency), coupon: coupon?.valid ? {code: coupon.code, discountLabel: fmt(coupon.discountMinor)} : null, sale: sale ? {name: sale.sale.name, discountLabel: fmt(sale.discountMinor)} : null, mode: state.mode};
}

/** A payment and its order straight from Razorpay, for recovering a paid report on another device. */
export async function fetchPaymentWithOrder(paymentId) {
  if (!/^pay_[A-Za-z0-9]{6,30}$/.test(paymentId) || paymentMode() === 'off') return null;
  const auth = {Authorization: `Basic ${Buffer.from(`${keyId()}:${keySecret()}`).toString('base64')}`};
  const payment = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {headers: auth}).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!payment?.order_id) return null;
  const order = await fetch(`https://api.razorpay.com/v1/orders/${payment.order_id}`, {headers: auth}).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return order ? {payment, order} : null;
}

/**
 * After the signature: ask Razorpay itself whether this payment belongs to this order, went through, and was for the
 * full order amount in the order's currency (Razorpay's recommended server-side check). Returns true or false, or null
 * when Razorpay could not be reached (the webhook then records the payment).
 */
export async function confirmPayment(orderId, paymentId) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const found = await fetchPaymentWithOrder(paymentId);
    if (!found) { if (attempt < 2) await new Promise((r) => setTimeout(r, 700)); continue; }
    const {payment, order} = found;
    if (payment.order_id !== orderId || payment.amount !== order.amount || payment.currency !== order.currency) return false;
    if (['captured', 'authorized'].includes(payment.status)) return true;
    if (payment.status === 'failed' || payment.status === 'refunded') return false;
    await new Promise((r) => setTimeout(r, 700)); // created → authorized can take a moment
  }
  return null;
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
