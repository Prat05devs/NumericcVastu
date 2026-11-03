import type {Currency, Discount, Kind, Money} from './pricing.ts';

/** The back office works in Indian Standard Time: dates typed in forms are IST, and are shown in IST. */
const IST_OFFSET = '+05:30';

export function formatMoney(minor: number, currency: Currency): string {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {style: 'currency', currency, maximumFractionDigits: minor % 100 ? 2 : 0}).format(minor / 100);
}

/** "₹1,499" / "1499.50" / "" → minor units, or null when empty. Throws on anything else. */
export function parseMoney(input: FormDataEntryValue | null): number | null {
  const text = String(input ?? '').replace(/[₹$,\s]/g, '');
  if (!text) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error(`"${input}" is not an amount.`);
  return Math.round(Number(text) * 100);
}

export const toMajor = (minor: number | null | undefined) => (minor == null ? '' : String(minor / 100));

/** <input type="datetime-local"> value in IST → Date. Empty → null. */
export function parseIst(input: FormDataEntryValue | null): Date | null {
  const text = String(input ?? '').trim();
  if (!text) return null;
  const date = new Date(`${text.length === 16 ? `${text}:00` : text}${IST_OFFSET}`);
  if (Number.isNaN(date.getTime())) throw new Error(`"${text}" is not a date and time.`);
  return date;
}

/** Date → value for <input type="datetime-local">, in IST. */
export function toIstInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  const ist = new Date(new Date(date).getTime() + 330 * 60_000);
  return ist.toISOString().slice(0, 16);
}

export function formatIst(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', {timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short'}).format(new Date(date));
}

export const KINDS: [Kind, string][] = [['course', 'Courses'], ['consultation', 'Consultations'], ['product', 'Products']];
const kindLabel = Object.fromEntries(KINDS) as Record<Kind, string>;

const moneyText = (money: Money | undefined) => [money?.INR != null ? formatMoney(money.INR, 'INR') : null, money?.USD != null ? formatMoney(money.USD, 'USD') : null].filter(Boolean).join(' / ');

/** "15% off courses, up to ₹5,000 / $60, on orders over ₹10,000". */
export function describeDiscount(discount: Discount, itemNames: Record<string, string> = {}): string {
  if (discount.type === 'none') return 'No discount';
  const amount = discount.type === 'percent' ? `${discount.percentOff}% off` : `${moneyText(discount.amountOff)} off`;
  const items = discount.appliesTo?.items ?? [];
  const kinds = discount.appliesTo?.kinds ?? [];
  const scope = items.length ? items.map((id) => itemNames[id] || id).join(', ') : kinds.length ? kinds.map((k) => kindLabel[k].toLowerCase()).join(', ') : 'everything';
  const parts = [`${amount} ${scope}`];
  if (discount.type === 'percent' && moneyText(discount.maxDiscount)) parts.push(`up to ${moneyText(discount.maxDiscount)}`);
  if (moneyText(discount.minOrder)) parts.push(`on orders over ${moneyText(discount.minOrder)}`);
  return parts.join(', ');
}

/** Reads the discount fields rendered by components/DiscountFields.tsx. */
export function parseDiscount(form: FormData, allowNone = false): Discount {
  const type = String(form.get('discountType') || 'percent');
  if (type === 'none') {
    if (!allowNone) throw new Error('Choose a discount.');
    return {type: 'none'};
  }
  const money = (name: string): Money => {
    const out: Money = {};
    const inr = parseMoney(form.get(`${name}Inr`));
    const usd = parseMoney(form.get(`${name}Usd`));
    if (inr != null) out.INR = inr;
    if (usd != null) out.USD = usd;
    return out;
  };
  const kinds = form.getAll('kinds').map(String).filter((k): k is Kind => k in kindLabel);
  const items = form.getAll('items').map(String).filter(Boolean);
  const discount: Discount = {type: type === 'fixed' ? 'fixed' : 'percent', maxDiscount: money('maxDiscount'), minOrder: money('minOrder'), appliesTo: {kinds, items}};
  if (discount.type === 'percent') {
    const percent = Number(form.get('percentOff'));
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) throw new Error('The percentage must be between 1 and 100.');
    discount.percentOff = Math.round(percent * 100) / 100;
  } else {
    discount.amountOff = money('amountOff');
    if (discount.amountOff.INR == null && discount.amountOff.USD == null) throw new Error('Enter the amount off in rupees, dollars or both.');
  }
  return discount;
}

export const slugify = (text: string) => text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
