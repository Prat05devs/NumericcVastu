import {findOffer, onlinePayment} from '../../../lib/razorpay';
import {getPrice} from '../../../data/offers';
import {requestCurrency} from '../../../lib/currency';
import {quoteCoupon} from '../../../lib/coupons';
import {limit} from '../../../lib/rateLimit';

/** Shows the buyer what a coupon does before paying. The order route checks it again at payment. */
export async function POST(request) {
  const slow = limit(request, 'coupon', 20, 10 * 60_000);
  if (slow) return slow;
  let body;
  try { body = await request.json(); } catch { return Response.json({valid: false, message: 'Invalid request.'}, {status: 400}); }
  const offer = findOffer(String(body?.offerId || ''));
  const currency = requestCurrency(request.headers);
  if (!offer || !onlinePayment(offer, currency).enabled) return Response.json({valid: false, message: 'Coupons apply to online payment only.'});
  const amountMinor = getPrice(offer, currency);
  const quote = await quoteCoupon({code: body?.code, offer, currency, amountMinor, phone: body?.phone});
  if (!quote?.valid) return Response.json({valid: false, message: quote?.message || 'Enter a coupon code.'});
  const fmt = (minor) => new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {style: 'currency', currency, maximumFractionDigits: 0}).format(minor / 100);
  // The code's own saving is shown; the total also includes any running sale.
  return Response.json({valid: true, code: quote.code, description: quote.description, list: fmt(amountMinor), discount: fmt(quote.couponDiscountMinor), total: fmt(quote.finalMinor), sale: quote.sale ? {name: quote.sale.name, discount: fmt(quote.sale.discountMinor)} : null});
}
