import {allocate, floorToRupee, percentOf, sumPaise, taxFor, type Paise} from './money.js';

/**
 * The pricing engine (Section 07 pricing policy). Pure and deterministic: the API feeds it catalogue prices read
 * from MySQL plus configured discounts, shipping and tax, and stores its output as immutable order snapshots.
 * Order of operations: 1) discounts 2) shipping 3) taxes 4) grand total.
 *
 * Discount rules:
 * - A discount applies only to the lines it targets (product families and/or product ids); its minimum order counts
 *   only those lines.
 * - Percentage discounts round down to whole rupees and respect an optional cap.
 * - Of several running campaigns, the one that saves this cart the most applies.
 * - A coupon combines with a campaign only when marked combinable; otherwise the customer gets the better of the two.
 */
export type Family = 'RUDRAKSHA' | 'GEMSTONE' | 'CRYSTAL' | 'YANTRA' | 'WATCH' | 'COURSE' | 'CONSULTATION' | 'OTHER';

export type DiscountRule = {
  type: 'NONE' | 'PERCENT' | 'FIXED';
  /** Basis points for PERCENT: 1 000 = 10%. */
  percentBp?: number;
  amountPaise?: Paise;
  maxDiscountPaise?: Paise;
  minOrderPaise?: Paise;
  appliesTo?: {families?: Family[]; productIds?: string[]};
};

export type PricedLine = {variantId: string; productId: string; family: Family; unitPricePaise: Paise; qty: number; taxGroup: string | null};
export type Offer = {id: string; label: string; rule: DiscountRule; combinable?: boolean};
export type ShippingMethod = {id: string; label: string; feePaise: Paise; freeAbovePaise: Paise | null};
export type TaxConfig = {mode: 'INCLUSIVE' | 'EXCLUSIVE'; groups: Record<string, number>; shippingGroup: string | null} | null;

export type LineResult = {variantId: string; qty: number; unitPricePaise: Paise; subtotalPaise: Paise; discountPaise: Paise; taxPaise: Paise; totalPaise: Paise};
export type Applied = {id: string; label: string; amountPaise: Paise};
export type PriceResult = {
  lines: LineResult[];
  subtotalPaise: Paise;
  discountPaise: Paise;
  shippingPaise: Paise;
  taxPaise: Paise;
  totalPaise: Paise;
  taxMode: 'INCLUSIVE' | 'EXCLUSIVE' | 'NONE';
  campaign: Applied | null;
  coupon: Applied | null;
  notices: string[];
  warnings: ('TAX_NOT_CONFIGURED' | 'SHIPPING_NOT_SELECTED')[];
};

type DiscountOutcome = {perLine: Paise[]; total: Paise; reason?: 'NOT_ELIGIBLE' | 'BELOW_MINIMUM' | 'NO_AMOUNT'};

function eligible(line: PricedLine, rule: DiscountRule): boolean {
  const families = rule.appliesTo?.families ?? [];
  const products = rule.appliesTo?.productIds ?? [];
  return (families.length === 0 || families.includes(line.family)) && (products.length === 0 || products.includes(line.productId));
}

export function applyDiscount(lines: PricedLine[], amounts: Paise[], rule: DiscountRule): DiscountOutcome {
  const none = (reason?: DiscountOutcome['reason']): DiscountOutcome => ({perLine: lines.map(() => 0n), total: 0n, ...(reason && {reason})});
  if (rule.type === 'NONE') return none();
  const base = amounts.map((amount, i) => (eligible(lines[i]!, rule) ? amount : 0n));
  const eligibleTotal = sumPaise(base);
  if (eligibleTotal <= 0n) return none('NOT_ELIGIBLE');
  if (rule.minOrderPaise && eligibleTotal < rule.minOrderPaise) return none('BELOW_MINIMUM');
  let total: Paise;
  if (rule.type === 'PERCENT') total = floorToRupee(percentOf(eligibleTotal, Math.min(Math.max(rule.percentBp ?? 0, 0), 10_000)));
  else if (rule.amountPaise && rule.amountPaise > 0n) total = rule.amountPaise;
  else return none('NO_AMOUNT');
  if (rule.maxDiscountPaise && total > rule.maxDiscountPaise) total = rule.maxDiscountPaise;
  if (total > eligibleTotal) total = eligibleTotal;
  return {perLine: allocate(total, base), total};
}

const reasonText = (reason: DiscountOutcome['reason'], label: string) =>
  reason === 'BELOW_MINIMUM' ? `${label} needs a larger order.` : `${label} does not apply to the items in this order.`;

export function price(input: {
  lines: PricedLine[];
  campaigns?: Offer[];
  coupon?: Offer | null;
  shipping?: ShippingMethod | null;
  tax?: TaxConfig;
}): PriceResult {
  const {lines, campaigns = [], coupon = null, shipping = null, tax = null} = input;
  const subtotals = lines.map((l) => l.unitPricePaise * BigInt(l.qty));
  const notices: string[] = [];
  const warnings: PriceResult['warnings'] = [];

  // 1) Discounts.
  let best: {offer: Offer; outcome: DiscountOutcome} | null = null;
  for (const offer of campaigns) {
    const outcome = applyDiscount(lines, subtotals, offer.rule);
    if (outcome.total > 0n && (!best || outcome.total > best.outcome.total)) best = {offer, outcome};
  }
  let campaignPart = best?.outcome.perLine ?? lines.map(() => 0n);
  let couponPart = lines.map(() => 0n);
  let campaign: Applied | null = best ? {id: best.offer.id, label: best.offer.label, amountPaise: best.outcome.total} : null;
  let couponApplied: Applied | null = null;
  if (coupon) {
    if (best && coupon.combinable) {
      const outcome = applyDiscount(lines, subtotals.map((s, i) => s - campaignPart[i]!), coupon.rule);
      if (outcome.total > 0n) { couponPart = outcome.perLine; couponApplied = {id: coupon.id, label: coupon.label, amountPaise: outcome.total}; }
      else notices.push(reasonText(outcome.reason, coupon.label));
    } else {
      const outcome = applyDiscount(lines, subtotals, coupon.rule);
      if (outcome.total <= 0n) notices.push(reasonText(outcome.reason, coupon.label));
      else if (!best || outcome.total >= best.outcome.total) {
        couponPart = outcome.perLine; couponApplied = {id: coupon.id, label: coupon.label, amountPaise: outcome.total};
        if (best) { notices.push(`${coupon.label} saves more than ${best.offer.label}, so it is applied instead.`); campaignPart = lines.map(() => 0n); campaign = null; }
      } else notices.push(`${best.offer.label} already saves more than ${coupon.label}; the two cannot be combined.`);
    }
  }
  const discounts = lines.map((_, i) => campaignPart[i]! + couponPart[i]!);
  const afterDiscount = subtotals.map((s, i) => s - discounts[i]!);
  const merchandise = sumPaise(afterDiscount);

  // 2) Shipping.
  let shippingPaise = 0n;
  if (!shipping) warnings.push('SHIPPING_NOT_SELECTED');
  else shippingPaise = shipping.freeAbovePaise !== null && merchandise >= shipping.freeAbovePaise ? 0n : shipping.feePaise;

  // 3) Taxes, per line by tax group; rates are configuration only.
  if (!tax) warnings.push('TAX_NOT_CONFIGURED');
  const lineTax = afterDiscount.map((amount, i) => (tax && lines[i]!.taxGroup ? taxFor(amount, tax.groups[lines[i]!.taxGroup!] ?? 0, tax.mode) : 0n));
  const shippingTax = tax && tax.shippingGroup ? taxFor(shippingPaise, tax.groups[tax.shippingGroup] ?? 0, tax.mode) : 0n;
  const taxPaise = sumPaise(lineTax) + shippingTax;

  // 4) Grand total. INCLUSIVE prices already contain tax; EXCLUSIVE adds it.
  const totalPaise = merchandise + shippingPaise + (tax?.mode === 'EXCLUSIVE' ? taxPaise : 0n);
  return {
    lines: lines.map((l, i) => ({
      variantId: l.variantId, qty: l.qty, unitPricePaise: l.unitPricePaise, subtotalPaise: subtotals[i]!, discountPaise: discounts[i]!, taxPaise: lineTax[i]!,
      totalPaise: afterDiscount[i]! + (tax?.mode === 'EXCLUSIVE' ? lineTax[i]! : 0n),
    })),
    subtotalPaise: sumPaise(subtotals), discountPaise: sumPaise(discounts), shippingPaise, taxPaise, totalPaise,
    taxMode: tax ? tax.mode : 'NONE', campaign, coupon: couponApplied, notices, warnings,
  };
}

/** Commission owed to an affiliate on the amount the customer paid. */
export function commissionFor(rule: {type: 'NONE' | 'PERCENT' | 'FIXED'; percentBp?: number; amountPaise?: Paise} | null, paidPaise: Paise): Paise {
  if (!rule || rule.type === 'NONE') return 0n;
  if (rule.type === 'PERCENT') return percentOf(paidPaise, Math.min(rule.percentBp ?? 0, 10_000));
  return rule.amountPaise && rule.amountPaise < paidPaise ? rule.amountPaise : rule.amountPaise ? paidPaise : 0n;
}
