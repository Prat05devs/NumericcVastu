import {siteUrl} from '../site.js';
import {issuePass, reportInputs} from './access.js';

const digits = (value) => String(value || '').replace(/\D/g, '').slice(-10);
/** The report details saved in a Razorpay order's notes when it was created (app/api/report/order). */
export function inputsFromOrder(order) {
  const notes = order?.notes || {};
  const extra = Object.fromEntries(String(notes.details || '').split(' | ').map((part) => part.split(': ')).filter((pair) => pair.length === 2));
  return {
    extra,
    inputs: reportInputs({name: notes.fullName || notes.name, dob: notes.dob, gender: notes.gender, phone: extra.reportPhone || notes.phone, partnerDob: extra.partnerDob || '', relationshipStatus: extra.relationship || 'unspecified'}),
    numbers: [notes.phone, extra.reportPhone].map(digits).filter(Boolean),
  };
}
export const reportLink = (pass) => `${siteUrl}/my-report/open?pass=${encodeURIComponent(pass)}&lang=en`;
/** A ready-to-open report link for a paid report order, or null if the order is not a report. */
export function reportLinkFromOrder(order, paymentId) {
  if (order?.notes?.offer_id !== 'report-full') return null;
  try {
    const {inputs} = inputsFromOrder(order);
    return reportLink(issuePass({inputs, orderId: order.id, paymentId, currency: order.currency === 'USD' ? 'USD' : 'INR'}));
  } catch {
    return null;
  }
}
