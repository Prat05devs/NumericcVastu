import {price, type DiscountRule, type Family, type Offer, type PricedLine, type PriceResult} from '@sc/contracts';
import {prisma, type Tx} from '../lib/db.js';
import {getSetting, shippingMethods} from '../lib/settings.js';
import {attributionForCoupon, emailHash, resolveToken, type Attribution} from './affiliates.js';

type Db = Tx | typeof prisma;
export type RuleJson = {type: 'NONE' | 'PERCENT' | 'FIXED'; percentBp?: number; amountPaise?: string; maxDiscountPaise?: string; minOrderPaise?: string; appliesTo?: {families?: string[]; productIds?: string[]}};
export const toRule = (r: RuleJson): DiscountRule => ({
  type: r.type,
  ...(r.percentBp !== undefined && {percentBp: r.percentBp}),
  ...(r.amountPaise && {amountPaise: BigInt(r.amountPaise)}),
  ...(r.maxDiscountPaise && {maxDiscountPaise: BigInt(r.maxDiscountPaise)}),
  ...(r.minOrderPaise && {minOrderPaise: BigInt(r.minOrderPaise)}),
  appliesTo: {families: (r.appliesTo?.families ?? []) as Family[], productIds: r.appliesTo?.productIds ?? []},
});
type Eligible = {families?: string[]; productIds?: string[]; storefronts?: string[]; lockedToLink?: boolean};

export async function activeCampaigns(storefrontId: string, db: Db = prisma, now = new Date()) {
  const rows = await db.campaign.findMany({where: {active: true, startsAt: {lte: now}, endsAt: {gt: now}}, orderBy: [{priority: 'desc'}, {startsAt: 'asc'}]});
  return rows.filter((c) => {
    const s = c.storefronts as string[];
    return !Array.isArray(s) || s.length === 0 || s.includes(storefrontId);
  });
}

export function discountRule(d: {type: string; value: bigint; capPaise: bigint | null; minOrderPaise: bigint | null; eligibleRulesJson: unknown}): DiscountRule {
  const e = (d.eligibleRulesJson ?? {}) as Eligible;
  return {
    type: d.type === 'PERCENT' ? 'PERCENT' : 'FIXED',
    ...(d.type === 'PERCENT' ? {percentBp: Number(d.value)} : {amountPaise: d.value}),
    ...(d.capPaise !== null && {maxDiscountPaise: d.capPaise}),
    ...(d.minOrderPaise !== null && {minOrderPaise: d.minOrderPaise}),
    appliesTo: {families: (e.families ?? []) as Family[], productIds: e.productIds ?? []},
  };
}

export type CouponCheck = {ok: true; discount: {id: string; code: string | null; description: string; combinable: boolean; type: string; value: bigint; capPaise: bigint | null; minOrderPaise: bigint | null; eligibleRulesJson: unknown; limitTotal: number | null; limitPerCustomer: number | null}} | {ok: false; message: string};

/** Validates a coupon for this customer and storefront. The binding cap check happens again inside checkout. */
export async function checkCoupon(code: string, ctx: {storefrontId: string; customerRef: string | null; attribution: Attribution | null}, db: Db = prisma, now = new Date()): Promise<CouponCheck> {
  const discount = await db.discount.findUnique({where: {code: code.trim().toUpperCase()}});
  const invalid = {ok: false as const, message: 'This code is not valid.'};
  if (!discount || !discount.active) return invalid;
  if (discount.startsAt && discount.startsAt > now) return invalid;
  if (discount.endsAt && discount.endsAt <= now) return {ok: false, message: 'This code has expired.'};
  const e = (discount.eligibleRulesJson ?? {}) as Eligible;
  if (e.storefronts?.length && !e.storefronts.includes(ctx.storefrontId)) return invalid;
  if (discount.limitTotal !== null && discount.redeemedCount >= discount.limitTotal) return {ok: false, message: 'This code has reached its usage limit.'};
  if (discount.limitPerCustomer !== null && ctx.customerRef) {
    const used = await db.discountRedemption.count({where: {discountId: discount.id, customerRef: ctx.customerRef, status: {in: ['RESERVED', 'REDEEMED']}}});
    if (used >= discount.limitPerCustomer) return {ok: false, message: 'You have already used this code.'};
  }
  if (e.lockedToLink) {
    // Partner-locked code: only works for visitors who arrived through that partner's own link (stops coupon-site leakage).
    const owner = await db.affiliateLink.findFirst({where: {discountId: discount.id}, select: {id: true}});
    if (!owner || ctx.attribution?.linkId !== owner.id) return {ok: false, message: 'This code only works through the partner link it was shared with.'};
  }
  return {ok: true, discount};
}

export type CartLine = {variantId: string; productId: string; qty: number; sku: string; title: string; productTitle: string; family: Family; pricePaise: bigint; taxGroup: string | null; options: unknown; available: number; sellable: boolean; uniqueSpecimen: boolean; productType: string};

export async function loadCartLines(cartId: string, db: Db = prisma): Promise<CartLine[]> {
  const items = await db.cartItem.findMany({
    where: {cartId}, orderBy: {variantId: 'asc'},
    include: {variant: {include: {inventory: true, product: {include: {category: {select: {kind: true}}}}}}},
  });
  return items.map((i) => {
    const v = i.variant;
    const p = v.product;
    const available = v.inventory ? v.inventory.onHandQty - v.inventory.reservedQty : 0;
    return {
      variantId: v.id, productId: p.id, qty: i.qty, sku: v.sku, title: v.title, productTitle: p.title, family: p.category.kind as Family,
      pricePaise: v.pricePaise, taxGroup: p.taxGroup, options: v.optionJson, available, uniqueSpecimen: v.uniqueSpecimen, productType: p.productType,
      sellable: p.status === 'PUBLISHED' && v.status === 'ACTIVE' && p.productType === 'PRODUCT',
    };
  });
}

export type PricingContext = {
  result: PriceResult; lines: CartLine[]; coupon: CouponCheck | null; attribution: Attribution | null;
  shipping: {id: string; label: string; feePaise: bigint; freeAbovePaise: bigint | null} | null; shippingOptions: {id: string; label: string; feePaise: bigint; freeAbovePaise: bigint | null; etaText: string | null}[];
  shippingConfigured: boolean; taxConfigured: boolean; holdMinutes: number; campaignIds: string[]; priceVersion: string;
};

/** Everything the server needs to price a cart. Used by cart view, preview and (inside the transaction) checkout. */
export async function priceCart(cartId: string, input: {storefrontId: string; couponCode?: string | undefined; shippingMethodId?: string | undefined; ref?: string | undefined; email?: string | undefined; userId?: string | null}, db: Db = prisma): Promise<PricingContext> {
  const lines = await loadCartLines(cartId, db);
  const sellable = lines.filter((l) => l.sellable);
  const [campaignRows, ship, tax] = await Promise.all([activeCampaigns(input.storefrontId, db), shippingMethods(db), getSetting('tax', db)]);
  const campaigns: Offer[] = campaignRows.map((c) => ({id: c.id, label: c.name, rule: toRule(c.ruleJson as RuleJson)}));

  let attribution = await resolveToken(input.ref, db);
  const customerRef = input.userId ?? (input.email ? emailHash(input.email) : null);
  let coupon: CouponCheck | null = null;
  let offer: Offer | null = null;
  const code = input.couponCode?.trim();
  if (code) {
    coupon = await checkCoupon(code, {storefrontId: input.storefrontId, customerRef, attribution}, db);
    if (coupon.ok) {
      offer = {id: coupon.discount.id, label: coupon.discount.code ?? 'Coupon', rule: discountRule(coupon.discount), combinable: coupon.discount.combinable};
      const couponOwner = await attributionForCoupon(coupon.discount.id, db);
      // A partner coupon typed by the customer outranks another partner's earlier click; when the click and the coupon
      // belong to the same partner link, the click is kept (it carries the visit that led to the sale).
      if (couponOwner && couponOwner.linkId !== attribution?.linkId) attribution = couponOwner;
    }
  }
  const shipping = input.shippingMethodId ? ship.methods.find((m) => m.id === input.shippingMethodId) ?? null : null;
  const priced: PricedLine[] = sellable.map((l) => ({variantId: l.variantId, productId: l.productId, family: l.family, unitPricePaise: l.pricePaise, qty: l.qty, taxGroup: l.taxGroup}));
  const taxConfig = tax ? {mode: tax.mode, groups: tax.groups, shippingGroup: tax.shippingGroup} : null;
  const result = price({lines: priced, campaigns, coupon: offer, shipping, tax: taxConfig});
  if (coupon && !coupon.ok) result.notices.unshift(coupon.message);
  const priceVersion = [sellable.map((l) => `${l.variantId}:${l.pricePaise}:${l.qty}`).join(','), offer?.id ?? '', campaignRows.map((c) => c.id).join(','), shipping?.id ?? '', tax?.reviewedOn ?? 'notax'].join('|');
  return {
    result, lines, coupon, attribution, shipping, shippingOptions: ship.methods, shippingConfigured: ship.configured, taxConfigured: Boolean(tax),
    holdMinutes: ship.holdMinutes, campaignIds: campaignRows.map((c) => c.id), priceVersion,
  };
}

export const breakdown = (r: PriceResult) => ({
  subtotalPaise: r.subtotalPaise, discountPaise: r.discountPaise, shippingPaise: r.shippingPaise, taxPaise: r.taxPaise, totalPaise: r.totalPaise,
  taxMode: r.taxMode, campaign: r.campaign, coupon: r.coupon, notices: r.notices, warnings: r.warnings,
});
