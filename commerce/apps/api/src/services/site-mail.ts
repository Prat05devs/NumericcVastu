import {env} from '../config/env.js';
import {prisma} from '../lib/db.js';
import {decrypt} from '../lib/crypto.js';
import {sendMail} from '../lib/mail.js';

/**
 * Emails for website bookings (courses, consultations, the numerology report): the customer's confirmation with
 * what happens next, and an alert to the team. Queued in the outbox when a booking is first paid.
 */
const CONTACT = {phone: '+91 98701 97315', whatsapp: 'https://wa.me/919870197315'};
type Stored = {customer: Record<string, string>; details: Record<string, string>; links?: Record<string, string>};

const money = (minor: bigint, currency: string) => new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-IN', {style: 'currency', currency, maximumFractionDigits: currency === 'USD' ? 2 : 0}).format(Number(minor) / 100);
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]!);
const LABELS: Record<string, string> = {fullName: 'Name on report', dob: 'Date of birth', gender: 'Gender', reportPhone: 'Phone analysed', partnerDob: 'Second person’s date of birth', relationship: 'Relationship', preferredDate: 'Preferred date', preferredTime: 'Preferred time', mode: 'Session mode', language: 'Language', updates: 'Agreed to offers'};

/** Plain, readable HTML in the brand colours; every email also has a text version. */
function layout(title: string, paragraphs: string[], button?: {label: string; href: string}) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px;line-height:1.6">${p}</p>`).join('');
  const cta = button ? `<p style="margin:22px 0"><a href="${esc(button.href)}" style="background:#b3122e;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700;display:inline-block">${esc(button.label)}</a></p>` : '';
  return `<!doctype html><html><body style="margin:0;background:#f7f2fb;font-family:Arial,Helvetica,sans-serif;color:#241b2f">
<div style="max-width:560px;margin:0 auto;padding:24px 16px"><div style="background:#fff;border-radius:12px;padding:28px 24px;border-top:4px solid #b3122e">
<p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;color:#4a1f7a;font-weight:700">NUMERICCVAASTU</p>
<h1 style="font-size:22px;margin:0 0 18px;color:#2a1046">${esc(title)}</h1>${body}${cta}
<p style="margin:24px 0 0;font-size:13px;color:#5e5869;line-height:1.6">Questions? Reply to this email or WhatsApp us on ${CONTACT.phone}.<br>NumericcVaastu Training &amp; Consultancy LLP · <a href="https://www.numericcvaastu.com" style="color:#4a1f7a">www.numericcvaastu.com</a></p>
</div></div></body></html>`;
}
const strip = (html: string) => html.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

async function load(id: string) {
  const booking = await prisma.serviceBooking.findUnique({where: {id}});
  if (!booking) return null;
  return {booking, stored: JSON.parse(decrypt(booking.contactRef)) as Stored};
}

export async function customerBookingMail(id: string) {
  const found = await load(id);
  if (!found) return;
  const {booking: b, stored} = found;
  const to = stored.customer.email;
  if (!to || b.paymentStatus !== 'PAID') return;
  const name = esc(stored.customer.name || 'there');
  const amount = money(b.amountMinor, b.currency);
  const phone = esc(stored.customer.phone || '');
  const paid = `<b>${esc(b.offerName)}</b> · ${amount}${b.couponCode ? ` (coupon ${esc(b.couponCode)} saved ${money(b.discountMinor, b.currency)})` : ''}<br>Payment ID: ${esc(b.providerPaymentId || b.providerOrderId)}`;
  const site = env().SITE_URL;
  let title: string, lines: string[], button: {label: string; href: string} | undefined;
  if (b.kind === 'report') {
    title = 'Your numerology report is ready';
    const url = stored.links?.report;
    button = {label: 'Open my report', href: url || `${site}/my-report`};
    lines = [`Namaste ${name},`, 'Thank you for your purchase. Your personal numerology report is ready in English and Hindi.', paid,
      url ? 'Use the button below to open it. The PDF opens in your browser, where you can read and download it.' : `Open it at ${site}/my-report with your payment ID and phone number.`,
      `You can reopen it on any device for a year at ${site}/my-report with the payment ID above and your phone number.`,
      'Want a personal reading of these numbers? Reply to this email or WhatsApp us and we will help you choose the right session.'];
  } else if (b.kind === 'course') {
    title = `Enrolment confirmed: ${b.offerName}`;
    lines = [`Namaste ${name},`, 'Thank you for enrolling. Your payment has been received.', paid,
      `<b>What happens next:</b> our team will contact you on WhatsApp${phone ? ` at ${phone}` : ''} with your batch details and how to join. If you prefer email, simply reply to this message.`];
  } else {
    const slot = [stored.details.preferredDate, stored.details.preferredTime].filter(Boolean).join(', ');
    title = `Booking confirmed: ${b.offerName}`;
    lines = [`Namaste ${name},`, 'Thank you for booking with Adarshh Panndey. Your payment has been received.', paid,
      `<b>What happens next:</b> our team will contact you on WhatsApp${phone ? ` at ${phone}` : ''} to confirm your session date and time${slot ? ` (you asked for ${esc(slot)})` : ''}.`,
      'Please keep your date of birth details and any questions ready for the session.'];
  }
  const html = layout(title, lines, button);
  await sendMail({to, subject: title, html, text: strip(lines.join('\n\n')) + (button ? `\n\n${button.label}: ${button.href}` : ''), tag: `site_${b.kind}_confirmation`, replyTo: env().TEAM_EMAIL});
}

export async function teamBookingMail(id: string) {
  const to = env().TEAM_EMAIL;
  const found = await load(id);
  if (!to || !found) return;
  const {booking: b, stored} = found;
  const amount = money(b.amountMinor, b.currency);
  const rows = [['Booking', b.offerName], ['Amount', `${amount}${b.couponCode ? ` after coupon ${b.couponCode} (−${money(b.discountMinor, b.currency)})` : ''}`], ['Payment ID', b.providerPaymentId || b.providerOrderId],
    ['Name', stored.customer.name], ['WhatsApp', stored.customer.phone], ['Email', stored.customer.email], ['City', stored.customer.city],
    ...Object.entries(stored.details).filter(([k, v]) => v && !['offer', 'offer_id', 'name', 'phone', 'email', 'city'].includes(k)).map(([k, v]) => [LABELS[k] ?? k, v])]
    .filter((r): r is [string, string] => Boolean(r[1]));
  const subject = `New ${b.kind}: ${b.offerName} · ${amount} · ${stored.customer.name || ''}`.trim();
  const admin = `${env().APP_BASE_URL}/admin/bookings`;
  const html = layout('New paid booking', [rows.map(([k, v]) => `<b>${esc(k)}:</b> ${esc(v)}`).join('<br>')], {label: 'Open Website bookings', href: admin});
  await sendMail({to, subject, html, text: `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${admin}`, tag: 'site_booking_team', ...(stored.customer.email && {replyTo: stored.customer.email})});
}
