/**
 * The pricing engine: catalogue prices plus a sale (campaign) and a coupon give the amount a customer pays.
 * Pure functions, no database, so the rules are easy to test (tests/pricing.test.ts) and identical everywhere.
 *
 * Rules:
 * - Amounts are integer minor units (paise, cents). Discounts are rounded down to whole rupees or dollars, so a
 *   customer never gets less than the stated percentage would suggest and the shop never gives a fraction of a coin.
 * - A discount applies only to the items it targets (kinds and/or item ids); the minimum order counts those items.
 * - A coupon combines with a sale only if it is marked combinable; otherwise the customer gets the better of the two.
 * - When several sales are running, the one that saves this customer the most applies.
 */
export type Currency = 'INR' | 'USD';
export type Kind = 'course' | 'consultation' | 'product';
export type Money = Partial<Record<Currency, number>>;

export type Discount = {
  type: 'none' | 'percent' | 'fixed';
  /** 1–100, for type "percent". */
  percentOff?: number;
  /** Per currency, for type "fixed". A fixed discount without an amount in the cart's currency does not apply. */
  amountOff?: Money;
  maxDiscount?: Money;
  minOrder?: Money;
  /** Empty lists mean "everything". */
  appliesTo?: {kinds?: Kind[]; items?: string[]};
};

export type PricedItem = {id: string; kind: Kind; name: string; priceInr: number; priceUsd: number};
export type CartLine = {item: PricedItem; quantity: number};

export type Offer = {id: string; label: string; discount: Discount; combinable?: boolean};
export type LineQuote = {id: string; name: string; kind: Kind; quantity: number; unitPrice: number; subtotal: number; discount: number; total: number};
export type Applied = {id: string; label: string; amount: number};
export type Quote = {
  currency: Currency;
  lines: LineQuote[];
  subtotal: number;
  discount: number;
  total: number;
  campaign: Applied | null;
  coupon: Applied | null;
  notices: string[];
};

const UNIT = 100;
export const unitPrice = (item: PricedItem, currency: Currency) => (currency === 'INR' ? item.priceInr : item.priceUsd);

function eligible(line: CartLine, discount: Discount): boolean {
  const kinds = discount.appliesTo?.kinds ?? [];
  const items = discount.appliesTo?.items ?? [];
  return (kinds.length === 0 || kinds.includes(line.item.kind)) && (items.length === 0 || items.includes(line.item.id));
}

/** Splits `amount` across `weights` in proportion, exactly, giving leftover units to the largest remainders. */
function allocate(amount: number, weights: number[]): number[] {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0 || amount <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (amount * w) / total);
  const shares = raw.map(Math.floor);
  let left = amount - shares.reduce((sum, s) => sum + s, 0);
  raw.map((r, i) => [r - shares[i], i] as const).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { shares[i] += 1; left -= 1; } });
  return shares;
}

export type DiscountResult = {perLine: number[]; total: number; reason?: string};

/** The discount `discount` gives on `amounts` (each line's current amount), or a reason it does not apply. */
export function applyDiscount(lines: CartLine[], amounts: number[], discount: Discount, currency: Currency): DiscountResult {
  const none = (reason?: string): DiscountResult => ({perLine: lines.map(() => 0), total: 0, reason});
  if (discount.type === 'none') return none();
  const mask = lines.map((line) => eligible(line, discount));
  const base = amounts.map((amount, i) => (mask[i] ? amount : 0));
  const eligibleTotal = base.reduce((sum, a) => sum + a, 0);
  if (eligibleTotal <= 0) return none('not-eligible');
  const minimum = discount.minOrder?.[currency];
  if (minimum && eligibleTotal < minimum) return none('below-minimum');

  let total: number;
  if (discount.type === 'percent') {
    const percent = Math.min(Math.max(discount.percentOff ?? 0, 0), 100);
    total = Math.floor((eligibleTotal * percent) / 100 / UNIT) * UNIT;
  } else {
    const amount = discount.amountOff?.[currency];
    if (!amount) return none('no-amount-in-currency');
    total = amount;
  }
  const cap = discount.maxDiscount?.[currency];
  if (cap) total = Math.min(total, cap);
  total = Math.min(total, eligibleTotal);
  return {perLine: allocate(total, base), total};
}

export function quote(lines: CartLine[], currency: Currency, campaigns: Offer[] = [], coupon: Offer | null = null): Quote {
  const subtotals = lines.map((line) => unitPrice(line.item, currency) * line.quantity);
  const notices: string[] = [];

  // The sale that saves this cart the most.
  let best: {offer: Offer; result: DiscountResult} | null = null;
  for (const offer of campaigns) {
    const result = applyDiscount(lines, subtotals, offer.discount, currency);
    if (result.total > 0 && (!best || result.total > best.result.total)) best = {offer, result};
  }

  let campaignPart = best?.result.perLine ?? lines.map(() => 0);
  let couponPart = lines.map(() => 0);
  let campaignApplied: Applied | null = best ? {id: best.offer.id, label: best.offer.label, amount: best.result.total} : null;
  let couponApplied: Applied | null = null;

  if (coupon) {
    if (best && coupon.combinable) {
      const afterSale = subtotals.map((amount, i) => amount - campaignPart[i]);
      const result = applyDiscount(lines, afterSale, coupon.discount, currency);
      if (result.total > 0) { couponPart = result.perLine; couponApplied = {id: coupon.id, label: coupon.label, amount: result.total}; }
      else notices.push(reasonText(result.reason, coupon.label));
    } else {
      const result = applyDiscount(lines, subtotals, coupon.discount, currency);
      if (result.total <= 0) notices.push(reasonText(result.reason, coupon.label));
      else if (!best || result.total >= best.result.total) {
        couponPart = result.perLine; couponApplied = {id: coupon.id, label: coupon.label, amount: result.total};
        if (best) { notices.push(`${coupon.label} gives a bigger saving than ${best.offer.label}, so it is applied instead.`); campaignPart = lines.map(() => 0); campaignApplied = null; }
      } else notices.push(`${best.offer.label} already gives a bigger saving than ${coupon.label}; the two cannot be combined.`);
    }
  }

  const lineQuotes = lines.map((line, i) => {
    const discount = campaignPart[i] + couponPart[i];
    return {id: line.item.id, name: line.item.name, kind: line.item.kind, quantity: line.quantity, unitPrice: unitPrice(line.item, currency), subtotal: subtotals[i], discount, total: subtotals[i] - discount};
  });
  const subtotal = subtotals.reduce((sum, a) => sum + a, 0);
  const discount = lineQuotes.reduce((sum, l) => sum + l.discount, 0);
  return {currency, lines: lineQuotes, subtotal, discount, total: subtotal - discount, campaign: campaignApplied, coupon: couponApplied, notices};
}

function reasonText(reason: string | undefined, label: string): string {
  if (reason === 'below-minimum') return `${label} needs a larger order.`;
  if (reason === 'no-amount-in-currency') return `${label} is not available in this currency.`;
  return `${label} does not apply to the items in this order.`;
}
