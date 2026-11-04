import {createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual} from 'node:crypto';
import {createFullReport} from '../fullReport.js';

/**
 * Paid-report access, with no database: the order route binds the Razorpay order to the buyer's details with an
 * HMAC; once Razorpay's payment signature checks out, the access route issues an encrypted pass holding those
 * details. The PDF route opens only with a valid pass, so the report is generated only for a verified payment.
 * Keys are derived from RAZORPAY_KEY_SECRET (server-only, fixed into the build like the other payment settings).
 */
const PASS_DAYS = 365; // the buyer can reopen and re-download the report for a year
const root = () => {
  const secret = process.env.REPORT_ACCESS_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw Object.assign(new Error('Online payment is being set up.'), {status: 409});
  return secret;
};
const key = (purpose) => Buffer.from(hkdfSync('sha256', root(), 'numericcvaastu-report', purpose, 32));
const b64u = (buf) => Buffer.from(buf).toString('base64url');

const text = (value, max) => String(value ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
/** The details a report is made from, validated by building the report once. */
export function reportInputs(body) {
  const inputs = {
    dob: text(body?.dob, 10), gender: ['male', 'female'].includes(body?.gender) ? body.gender : '',
    name: text(body?.name, 80), phone: text(body?.phone, 20).replace(/\D/g, ''),
    partnerDob: text(body?.partnerDob, 10), relationshipStatus: text(body?.relationshipStatus, 20) || 'unspecified',
  };
  if (!inputs.name || !inputs.phone) throw Object.assign(new Error('Enter your name and phone number in the calculator first.'), {status: 400});
  try { createFullReport(inputs); } catch (error) { throw Object.assign(new Error(error.message || 'Please check your details.'), {status: 400}); }
  return inputs;
}
const digest = (inputs) => createHash('sha256').update(JSON.stringify([inputs.dob, inputs.gender, inputs.name, inputs.phone, inputs.partnerDob, inputs.relationshipStatus])).digest('hex');

export const bindOrder = (orderId, inputs) => createHmac('sha256', key('bind')).update(`${orderId}|${digest(inputs)}`).digest('hex');
export function checkBinding(orderId, inputs, binding) {
  const a = Buffer.from(bindOrder(orderId, inputs)), b = Buffer.from(String(binding || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function issuePass({inputs, orderId, paymentId, currency}) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key('pass'), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify({i: inputs, o: orderId, p: paymentId, c: currency, t: Date.now()}), 'utf8'), cipher.final()]);
  return b64u(Buffer.concat([iv, cipher.getAuthTag(), body]));
}
export function readPass(pass) {
  try {
    const raw = Buffer.from(String(pass || ''), 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', key('pass'), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const data = JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8'));
    if (Date.now() - data.t > PASS_DAYS * 86_400_000) return null;
    return {inputs: data.i, orderId: data.o, paymentId: data.p, currency: data.c === 'USD' ? 'USD' : 'INR', issuedAt: data.t};
  } catch {
    return null;
  }
}
