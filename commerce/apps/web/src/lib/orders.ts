'use client';
/** Guest order access tokens (returned once at checkout) are kept on this device so the order page keeps working. */
const KEY = 'sc_order_tokens';
export function saveOrderToken(orderId: string, token: string) {
  const all = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, string>;
  all[orderId] = token;
  localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(Object.entries(all).slice(-20))));
}
export function orderToken(orderId: string, fromUrl?: string | null) {
  if (fromUrl) { saveOrderToken(orderId, fromUrl); return fromUrl; }
  return (JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, string>)[orderId] ?? null;
}
export const tokenHeader = (t: string | null): Record<string, string> => (t ? {'X-Order-Token': t} : {});
