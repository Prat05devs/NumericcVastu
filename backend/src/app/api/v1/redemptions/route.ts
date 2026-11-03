import {QuoteError, recordRedemption} from '../../../../lib/commerce.ts';
import {authenticatedStorefront} from '../../../../lib/http.ts';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/redemptions — server to server only, with "Authorization: Bearer <storefront API key>".
 * Call after a payment is verified: {orderRef, currency, items, couponCode?, ref?, customerEmail?}.
 * Counts the coupon use, credits the affiliate and stores the discount given. Repeating a call is harmless.
 */
export async function POST(request: Request) {
  const storefront = await authenticatedStorefront(request);
  if (!storefront) return Response.json({error: 'A valid storefront API key is required.'}, {status: 401});
  let body: any;
  try { body = await request.json(); } catch { return Response.json({error: 'Send a JSON body.'}, {status: 400}); }
  try {
    const {quote, recorded} = await recordRedemption({storefront, orderRef: body.orderRef, currency: body.currency, items: body.items, couponCode: body.couponCode, ref: body.ref, customerEmail: body.customerEmail});
    return Response.json({recorded, quote});
  } catch (error) {
    if (error instanceof QuoteError) return Response.json({error: error.message}, {status: 400});
    throw error;
  }
}
