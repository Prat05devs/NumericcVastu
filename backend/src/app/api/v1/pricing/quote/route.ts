import {buildQuote, QuoteError} from '../../../../../lib/commerce.ts';
import {json, knownStorefront, preflight} from '../../../../../lib/http.ts';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/pricing/quote
 * {storefront, currency: "INR"|"USD", items: [{id, quantity}], couponCode?, ref?, customerEmail?}
 * Returns line prices, the sale and coupon that apply, totals, and why a code was refused. Prices always come from
 * the catalogue here; anything price-like sent by a browser is ignored.
 */
export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return json(request, {error: 'Send a JSON body.'}, 400); }
  if (!(await knownStorefront(body?.storefront))) return json(request, {error: 'Unknown storefront.'}, 400);
  try {
    return json(request, await buildQuote({storefront: body.storefront, currency: body.currency, items: body.items, couponCode: body.couponCode, ref: body.ref, customerEmail: body.customerEmail}));
  } catch (error) {
    if (error instanceof QuoteError) return json(request, {error: error.message}, 400);
    throw error;
  }
}

export const OPTIONS = preflight;
