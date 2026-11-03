/**
 * Money rules (ADR-07). Amounts are integer paise held as `bigint` in the domain and in MySQL (BIGINT), and travel
 * over the wire as decimal strings ("349900"). No floating-point money anywhere.
 */
export type Paise = bigint;

/** Wire format → bigint. Accepts only non-negative integer strings (or safe integers in tests/fixtures). */
export function paise(value: string | number | bigint): Paise {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new RangeError(`Not an integer amount of paise: ${value}`);
    return BigInt(value);
  }
  if (!/^-?\d+$/.test(value)) throw new RangeError(`Not an integer amount of paise: "${value}"`);
  return BigInt(value);
}

/** bigint → wire string. */
export const toWire = (amount: Paise): string => amount.toString();

/** Rupees as typed by a person ("1,499" / "1499.50") → paise. */
export function rupeesToPaise(input: string): Paise {
  const text = input.replace(/[₹,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new RangeError(`"${input}" is not an amount in rupees.`);
  const [whole = '0', fraction = ''] = text.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

/** For display only: "₹3,499" or "₹3,499.50". Never feed the result back into arithmetic. */
export function formatInr(amount: Paise): string {
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const rupees = abs / 100n;
  const rest = abs % 100n;
  const grouped = new Intl.NumberFormat('en-IN').format(rupees);
  return `${negative ? '-' : ''}₹${grouped}${rest ? `.${rest.toString().padStart(2, '0')}` : ''}`;
}

/** floor(amount × basisPoints / 10 000). Basis points: 1 800 = 18%. */
export function percentOf(amount: Paise, basisPoints: number | bigint): Paise {
  return (amount * BigInt(basisPoints)) / 10_000n;
}

/** Rounds down to whole rupees, so a discount never exceeds what its rate implies. */
export const floorToRupee = (amount: Paise): Paise => (amount / 100n) * 100n;

export const minPaise = (...values: Paise[]): Paise => values.reduce((a, b) => (b < a ? b : a));
export const maxPaise = (...values: Paise[]): Paise => values.reduce((a, b) => (b > a ? b : a));
export const sumPaise = (values: Iterable<Paise>): Paise => { let total = 0n; for (const v of values) total += v; return total; };

/**
 * Splits `amount` across `weights` in proportion, exactly (largest remainder). Used to spread an order-level
 * discount over lines so each order line keeps its own immutable discount snapshot.
 */
export function allocate(amount: Paise, weights: Paise[]): Paise[] {
  const total = sumPaise(weights);
  if (amount <= 0n || total <= 0n) return weights.map(() => 0n);
  const shares = weights.map((w) => (amount * w) / total);
  const remainders = weights.map((w, i) => ({i, r: (amount * w) % total}));
  let left = amount - sumPaise(shares);
  remainders.sort((a, b) => (b.r > a.r ? 1 : b.r < a.r ? -1 : a.i - b.i));
  for (const {i} of remainders) {
    if (left <= 0n) break;
    if (weights[i]! > 0n) { shares[i]! += 1n; left -= 1n; }
  }
  return shares;
}

/**
 * GST-style tax split. INCLUSIVE: the price already contains tax → tax = price × r / (1 + r).
 * EXCLUSIVE: tax is added on top → tax = price × r. Rates come from configuration, never code.
 */
export function taxFor(amount: Paise, rateBasisPoints: number, mode: 'INCLUSIVE' | 'EXCLUSIVE'): Paise {
  if (rateBasisPoints <= 0 || amount <= 0n) return 0n;
  const rate = BigInt(rateBasisPoints);
  return mode === 'EXCLUSIVE' ? (amount * rate) / 10_000n : (amount * rate) / (10_000n + rate);
}
