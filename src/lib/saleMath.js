/**
 * Sale arithmetic for courses, consultations and the report: identical to the commerce API's quote
 * (whole rupees, cap and minimum order in INR, fixed amounts INR-only, never below ₹1 / $1), so the price a
 * visitor sees is the price Razorpay or PayPal charges. Safe on the server and in the browser.
 */
export function saleDiscount(rule, amountMinor, currency) {
  if (!rule) return 0;
  if (currency === 'INR' && rule.minOrderPaise && amountMinor < Number(rule.minOrderPaise)) return 0;
  let d = 0;
  if (rule.type === 'PERCENT' && rule.percentBp) {
    d = Math.floor((amountMinor * rule.percentBp) / 10000);
    if (currency === 'INR') d = Math.floor(d / 100) * 100;
    if (currency === 'INR' && rule.maxDiscountPaise && d > Number(rule.maxDiscountPaise)) d = Number(rule.maxDiscountPaise);
  } else if (rule.type === 'FIXED' && rule.amountPaise && currency === 'INR') d = Number(rule.amountPaise);
  if (amountMinor - d < 100) d = amountMinor - 100;
  return d > 0 ? d : 0;
}
/** The best running sale for one offer: {sale, discountMinor, finalMinor} or null. */
export function bestSale(sales, offer, amountMinor, currency, now = Date.now()) {
  let best = null;
  for (const s of sales || []) {
    if (new Date(s.endsAt).getTime() <= now || new Date(s.startsAt).getTime() > now) continue;
    const fam = s.rule?.families || [];
    if (fam.length && !fam.includes(String(offer.kind).toUpperCase())) continue;
    const d = saleDiscount(s.rule, amountMinor, currency);
    if (d > 0 && (!best || d > best.discountMinor)) best = {sale: s, discountMinor: d, finalMinor: amountMinor - d};
  }
  return best;
}
export const money = (minor, currency) => new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {style: 'currency', currency, maximumFractionDigits: minor % 100 ? 2 : 0}).format(minor / 100);
