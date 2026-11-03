/** Formats decimal paise strings for display. All arithmetic happens in the API; the UI only formats. */
export function inr(paise: string | null | undefined): string {
  if (paise === null || paise === undefined || paise === '') return '—';
  const v = BigInt(paise);
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const rupees = abs / 100n;
  const p = abs % 100n;
  const r = rupees.toString();
  const last3 = r.slice(-3);
  const rest = r.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${neg ? '−' : ''}₹${rest ? `${rest},${last3}` : last3}${p ? `.${p.toString().padStart(2, '0')}` : ''}`;
}
export const usd = (cents: string) => `$${(BigInt(cents) / 100n).toString()}.${(BigInt(cents) % 100n).toString().padStart(2, '0')}`;
/** Rupee input → paise string (no floating point). */
export function rupeesToPaise(input: string): string | null {
  const m = /^\s*(\d{1,12})(?:\.(\d{1,2}))?\s*$/.exec(input.replace(/,/g, ''));
  if (!m) return null;
  return (BigInt(m[1]!) * 100n + BigInt((m[2] ?? '').padEnd(2, '0') || '0')).toString();
}
export const paiseToRupees = (paise: string | null | undefined) => (paise ? `${BigInt(paise) / 100n}${BigInt(paise) % 100n ? `.${(BigInt(paise) % 100n).toString().padStart(2, '0')}` : ''}` : '');
export const date = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'}) : '—');
export const dateTime = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('en-IN', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}) : '—');
export const label = (code: string) => code.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
