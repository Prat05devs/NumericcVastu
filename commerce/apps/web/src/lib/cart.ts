'use client';
import {call, post} from './client';

/**
 * The cart lives in the API (server-priced). The browser only remembers the cart id; the cart token is an httpOnly
 * cookie set by the API. The item count here is a display hint refreshed from every cart response.
 */
const KEY = 'sc_cart_id';
const COUNT = 'sc_cart_count';
const EVENT = 'sc-cart-change';

export type CartView = {id: string; items: {variantId: string; productId: string; sku: string; title: string; productTitle: string; qty: number; unitPricePaise: string; sellable: boolean; inStock: boolean; uniqueSpecimen: boolean}[]; breakdown: {subtotalPaise: string; discountPaise: string; totalPaise: string; notices: string[]; warnings: string[]}};

export const cartId = () => localStorage.getItem(KEY);
export const cartCount = () => Number(localStorage.getItem(COUNT) ?? 0);
export const onCartChange = (fn: () => void) => { window.addEventListener(EVENT, fn); return () => window.removeEventListener(EVENT, fn); };
export function remember(view: CartView | null) {
  if (!view) { localStorage.removeItem(KEY); localStorage.setItem(COUNT, '0'); }
  else { localStorage.setItem(KEY, view.id); localStorage.setItem(COUNT, String(view.items.reduce((s, i) => s + i.qty, 0))); }
  window.dispatchEvent(new Event(EVENT));
}

export async function ensureCart(): Promise<string | null> {
  const existing = cartId();
  if (existing) {
    const r = await call<CartView>('GET', `/carts/${existing}`);
    if (r.ok) return existing;
  }
  const created = await post<{cartId: string}>('/carts');
  if (!created.ok) return null;
  localStorage.setItem(KEY, created.data.cartId);
  return created.data.cartId;
}

export async function setQty(variantId: string, qty: number) {
  const id = await ensureCart();
  if (!id) return {ok: false as const, status: 0, error: {code: 'CART', message: 'Could not create a cart. Please try again.'}};
  const r = qty > 0 ? await call<CartView>('PUT', `/carts/${id}/items/${variantId}`, {qty}) : await call<CartView>('DELETE', `/carts/${id}/items/${variantId}`);
  if (r.ok) remember(r.data);
  return r;
}
