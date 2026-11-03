import {randomUUID} from 'node:crypto';
import {getDb, isDuplicate} from './db.ts';
import {sha256} from './crypto.ts';
import {quote, type CartLine, type Currency, type Discount, type Offer, type PricedItem, type Quote} from './pricing.ts';
import {getSetting, publicPaymentConfig} from './settings.ts';

/**
 * Database-backed commerce: catalogue, coupons, sales and affiliate links feeding the pricing engine.
 * Storefronts send only item ids, a coupon code and an affiliate code; prices and discounts are always resolved here.
 */
export type CouponRow = {
  id: string; code: string; description: string; discount: Discount; storefronts: string[]; starts_at: Date | null; ends_at: Date | null;
  max_redemptions: number | null; max_per_customer: number | null; combinable: boolean; active: boolean;
};
export type CampaignTheme = {
  badge?: string; bannerText?: string; bannerLink?: string; decoration?: string; heroImageUrl?: string; showCountdown?: boolean;
  colors?: {primary?: string; accent?: string; background?: string; text?: string};
};
export type CampaignRow = {id: string; name: string; slug: string; storefronts: string[]; starts_at: Date; ends_at: Date; priority: number; discount: Discount; theme: CampaignTheme; active: boolean};
export type AffiliateLinkRow = {id: string; code: string; affiliate_id: string; coupon_id: string | null; storefront_id: string; target_path: string; active: boolean; affiliate_active: boolean; commission: Commission};
export type Commission = {type: 'none' | 'percent' | 'fixed'; percent?: number; amount?: Partial<Record<Currency, number>>};

export const normaliseCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, '');
const forStorefront = (list: string[], storefront: string) => list.length === 0 || list.includes(storefront);

export async function catalogue(storefront?: string): Promise<(PricedItem & {storefront: string; url: string | null; active: boolean})[]> {
  const rows = await (await getDb()).query(
    `select id, storefront_id, kind, name, url, price_inr, price_usd, active from catalogue_items ${storefront ? 'where storefront_id = ?' : ''} order by storefront_id, kind, price_inr`,
    storefront ? [storefront] : [],
  );
  return rows.map((r) => ({id: r.id, storefront: r.storefront_id, kind: r.kind, name: r.name, url: r.url, priceInr: r.price_inr, priceUsd: r.price_usd, active: r.active}));
}

export async function activeCampaigns(storefront: string, now = new Date()): Promise<CampaignRow[]> {
  const rows = await (await getDb()).query<CampaignRow>(
    'select * from campaigns where active = 1 and starts_at <= ? and ends_at > ? order by priority desc, starts_at desc',
    [now, now],
  );
  return rows.filter((c) => forStorefront(c.storefronts, storefront));
}

export async function findCoupon(code: string): Promise<CouponRow | undefined> {
  return (await getDb()).one<CouponRow>('select * from coupons where code = ?', [normaliseCode(code)]);
}

export async function findAffiliateLink(code: string): Promise<AffiliateLinkRow | undefined> {
  return (await getDb()).one<AffiliateLinkRow>(
    `select l.*, a.active as affiliate_active, a.commission from affiliate_links l join affiliates a on a.id = l.affiliate_id where l.code = ?`,
    [code.trim()],
  );
}

/** Why a coupon cannot be used right now, or null when it can. */
export async function couponProblem(coupon: CouponRow, storefront: string, customerHash: string | null, now = new Date()): Promise<string | null> {
  if (!coupon.active) return 'This code is no longer active.';
  if (!forStorefront(coupon.storefronts, storefront)) return 'This code is not valid on this website.';
  if (coupon.starts_at && now < new Date(coupon.starts_at)) return 'This code is not active yet.';
  if (coupon.ends_at && now >= new Date(coupon.ends_at)) return 'This code has expired.';
  const db = await getDb();
  if (coupon.max_redemptions) {
    const used = await db.one<{n: number}>('select count(*) as n from redemptions where coupon_id = ?', [coupon.id]);
    if ((used?.n ?? 0) >= coupon.max_redemptions) return 'This code has been fully used.';
  }
  if (coupon.max_per_customer && customerHash) {
    const used = await db.one<{n: number}>('select count(*) as n from redemptions where coupon_id = ? and customer_hash = ?', [coupon.id, customerHash]);
    if ((used?.n ?? 0) >= coupon.max_per_customer) return 'You have already used this code.';
  }
  return null;
}

export type QuoteRequest = {storefront: string; currency: Currency; items: {id: string; quantity?: number}[]; couponCode?: string; ref?: string; customerEmail?: string};
export type QuoteResult = Quote & {storefront: string; couponCode: string | null; couponError: string | null; affiliate: {code: string; linkId: string} | null; campaignTheme: CampaignTheme | null};

export const customerHash = (email?: string) => (email?.trim() ? sha256(`customer:${email.trim().toLowerCase()}`) : null);

export async function buildQuote(request: QuoteRequest, now = new Date()): Promise<QuoteResult> {
  if (request.currency !== 'INR' && request.currency !== 'USD') throw new QuoteError('currency must be INR or USD.');
  if (!Array.isArray(request.items) || request.items.length === 0 || request.items.length > 50) throw new QuoteError('Send between 1 and 50 items.');

  const items = await catalogue(request.storefront);
  const lines: CartLine[] = request.items.map(({id, quantity = 1}) => {
    const item = items.find((i) => i.id === id && i.active);
    if (!item) throw new QuoteError(`Unknown or unavailable item: ${id}`);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new QuoteError(`Invalid quantity for ${id}.`);
    return {item, quantity};
  });

  const campaigns = await activeCampaigns(request.storefront, now);
  const offers: Offer[] = campaigns.map((c) => ({id: c.id, label: c.name, discount: c.discount}));

  // An affiliate link brings its own coupon unless the customer typed a different code.
  let affiliate: AffiliateLinkRow | undefined;
  if (request.ref) {
    affiliate = await findAffiliateLink(request.ref);
    if (affiliate && (!affiliate.active || !affiliate.affiliate_active || affiliate.storefront_id !== request.storefront)) affiliate = undefined;
  }
  let coupon: CouponRow | undefined;
  let couponError: string | null = null;
  const typed = request.couponCode?.trim();
  if (typed) {
    coupon = await findCoupon(typed);
    if (!coupon) couponError = 'This code does not exist.';
  } else if (affiliate?.coupon_id) {
    coupon = await (await getDb()).one<CouponRow>('select * from coupons where id = ?', [affiliate.coupon_id]);
  }
  if (coupon) {
    couponError = await couponProblem(coupon, request.storefront, customerHash(request.customerEmail), now);
    if (couponError) coupon = undefined;
  }

  const result = quote(lines, request.currency, offers, coupon ? {id: coupon.id, label: coupon.code, discount: coupon.discount, combinable: coupon.combinable} : null);
  const campaign = result.campaign ? campaigns.find((c) => c.id === result.campaign!.id) : null;
  return {
    ...result,
    storefront: request.storefront,
    couponCode: coupon?.code ?? null,
    couponError,
    affiliate: affiliate ? {code: affiliate.code, linkId: affiliate.id} : null,
    campaignTheme: campaign?.theme ?? null,
  };
}

export class QuoteError extends Error {}

export function commissionFor(commission: Commission | undefined, total: number, currency: Currency): number {
  if (!commission || commission.type === 'none') return 0;
  if (commission.type === 'percent') return Math.floor((total * Math.min(commission.percent ?? 0, 100)) / 100);
  return Math.min(commission.amount?.[currency] ?? 0, total);
}

/**
 * Called by a storefront's server after a payment is verified. Recomputes the quote (never trusts the browser),
 * stores one redemption per order and returns the result. Calling it twice for the same order changes nothing.
 */
export async function recordRedemption(request: QuoteRequest & {orderRef: string}): Promise<{quote: QuoteResult; recorded: boolean}> {
  if (!request.orderRef?.trim()) throw new QuoteError('orderRef is required.');
  const result = await buildQuote(request);
  if (!result.coupon && !result.campaign && !result.affiliate) return {quote: result, recorded: false};
  const db = await getDb();
  const link = result.affiliate ? await findAffiliateLink(result.affiliate.code) : undefined;
  try {
    await db.execute(
      `INSERT INTO redemptions (id, storefront_id, order_ref, coupon_id, campaign_id, affiliate_link_id, customer_hash, currency, subtotal, discount, total, commission)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), request.storefront, request.orderRef.trim(), result.coupon?.id ?? null, result.campaign?.id ?? null, result.affiliate?.linkId ?? null,
        customerHash(request.customerEmail), result.currency, result.subtotal, result.discount, result.total, commissionFor(link?.commission, result.total, result.currency)],
    );
  } catch (error) {
    if (isDuplicate(error)) return {quote: result, recorded: false};
    throw error;
  }
  return {quote: result, recorded: true};
}

/** What a storefront needs on page load: the sale to decorate the site with and the public payment keys. */
export async function storefrontConfig(storefront: string, now = new Date()) {
  const [campaign] = await activeCampaigns(storefront, now);
  const affiliates = await getSetting('affiliates', {attributionDays: 30});
  return {
    storefront,
    campaign: campaign ? {id: campaign.id, name: campaign.name, slug: campaign.slug, endsAt: campaign.ends_at, discount: campaign.discount, theme: campaign.theme} : null,
    payments: await publicPaymentConfig(),
    affiliateAttributionDays: affiliates.attributionDays,
  };
}
