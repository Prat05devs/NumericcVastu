import 'server-only';
import {canCheckout, formatPrice, getPrice} from '../data/offers';
import {findOffer} from './razorpay';

/**
 * PayPal Checkout (Orders v2) for visitors outside India, who pay in US dollars. Set PAYPAL_CLIENT_ID and
 * PAYPAL_CLIENT_SECRET (developer.paypal.com > Apps & Credentials) in the Vercel environment, and PAYPAL_ENV=live
 * for real payments; anything else uses the PayPal sandbox. As with Razorpay, the sandbox can take every offer,
 * while live payments are accepted only for offers with a confirmed price.
 * The server creates the order from the catalogue price, captures it after the visitor approves, and checks
 * the captured amount against the catalogue before confirming the booking.
 */
const clientId = () => process.env.PAYPAL_CLIENT_ID || '';
const secret = () => process.env.PAYPAL_CLIENT_SECRET || '';
const live = () => process.env.PAYPAL_ENV === 'live';
const api = () => (live() ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');
const dollars = (cents) => (cents / 100).toFixed(2);
const unavailable = () => Object.assign(new Error('PayPal is temporarily unavailable. Please try again shortly, or send your booking on WhatsApp.'), {status: 502});

export function paypalPayment(offer) {
  const mode = !clientId() || !secret() ? 'off' : live() ? 'live' : 'test';
  if (!offer?.active) return {enabled: false, mode, reason: 'This offering is not currently available.'};
  if (mode === 'off') return {enabled: false, mode, reason: 'PayPal is being set up.'};
  if (mode === 'live' && !canCheckout(offer)) return {enabled: false, mode, reason: 'The fee for this offering is being confirmed.'};
  return {enabled: true, mode, clientId: clientId(), reason: ''};
}

async function call(path, body) {
  const auth = await fetch(`${api()}/v1/oauth2/token`, {method: 'POST', headers: {Authorization: `Basic ${Buffer.from(`${clientId()}:${secret()}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded'}, body: 'grant_type=client_credentials'});
  const token = await auth.json().catch(() => ({}));
  if (!auth.ok) { console.error('PayPal sign-in failed', auth.status, token?.error); throw unavailable(); }
  const res = await fetch(`${api()}${path}`, {method: 'POST', headers: {Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json'}, body: body && JSON.stringify(body)});
  const data = await res.json().catch(() => ({}));
  // Never show gateway internals to visitors; keep them in the server log for the site owner.
  if (!res.ok) { console.error('PayPal request failed', path, res.status, data?.name, data?.details?.[0]?.issue); throw unavailable(); }
  return data;
}

export async function createPaypalOrder(offerId) {
  const offer = findOffer(offerId);
  const state = paypalPayment(offer);
  if (!state.enabled) throw Object.assign(new Error(state.reason), {status: 409});
  const order = await call('/v2/checkout/orders', {
    intent: 'CAPTURE',
    purchase_units: [{reference_id: offer.id, custom_id: offer.id, description: offer.name.slice(0, 127), amount: {currency_code: 'USD', value: dollars(getPrice(offer, 'USD'))}}],
    application_context: {brand_name: 'NumericcVaastu', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW'},
  });
  return {orderId: order.id};
}

/** Captures an approved order. `verified` is true only when PayPal completed the exact catalogue amount in USD. */
export async function capturePaypalOrder(orderId) {
  if (!/^[A-Z0-9]{8,40}$/.test(orderId)) throw Object.assign(new Error('Invalid order.'), {status: 400});
  const data = await call(`/v2/checkout/orders/${orderId}/capture`);
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  const offer = findOffer(capture?.custom_id || data.purchase_units?.[0]?.reference_id);
  const verified = Boolean(offer && data.status === 'COMPLETED' && capture?.status === 'COMPLETED' && capture.amount?.currency_code === 'USD' && capture.amount.value === dollars(getPrice(offer, 'USD')));
  if (!verified) console.error('PayPal capture needs checking', orderId, data.status, capture?.status, capture?.amount);
  return {verified, captureId: capture?.id || '', offer, amount: capture?.amount?.value || '', priceLabel: offer ? formatPrice(offer, undefined, 'USD') : '', payerEmail: data.payer?.email_address || ''};
}
