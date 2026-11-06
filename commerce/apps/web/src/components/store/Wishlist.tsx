'use client';
import {useEffect, useState} from 'react';

/** Wishlist kept on this device (localStorage). Each entry stores what the card needs, so the page works offline. */
export type WishItem = {slug: string; title: string; pricePaise: string | null; image: string | null; category: string; subtitle: string};
const KEY = 'cs_wishlist';
const EVENT = 'cs-wish-change';

export function readWishlist(): WishItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as WishItem[]; } catch { return []; }
}
function write(items: WishItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 60)));
  window.dispatchEvent(new Event(EVENT));
}
export function toggleWish(item: WishItem) {
  const list = readWishlist();
  write(list.some((i) => i.slug === item.slug) ? list.filter((i) => i.slug !== item.slug) : [item, ...list]);
}
export function removeWish(slug: string) { write(readWishlist().filter((i) => i.slug !== slug)); }
export function useWishlist() {
  const [items, setItems] = useState<WishItem[] | null>(null);
  useEffect(() => {
    const sync = () => setItems(readWishlist());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  return items;
}

export function WishButton({item, className = 'heart'}: {item: WishItem; className?: string}) {
  const items = useWishlist();
  const on = Boolean(items?.some((i) => i.slug === item.slug));
  return (
    <button type="button" className={className} aria-pressed={on} aria-label={on ? `Remove ${item.title} from your wishlist` : `Save ${item.title} to your wishlist`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWish(item); }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
    </button>
  );
}

export function WishCount() {
  const items = useWishlist();
  return items?.length ? <span className="n">{items.length}</span> : null;
}
