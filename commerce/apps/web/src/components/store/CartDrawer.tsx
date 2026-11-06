'use client';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import {inr} from '@/lib/format';
import {Art} from './ui';

/** “Added to cart” drawer: slides in after Add to cart, with the item, cart subtotal and the next steps. */
export type Added = {title: string; variant: string; pricePaise: string; qty: number; image: string | null; art: string; subtotalPaise: string; count: number};
export const announceAdded = (a: Added) => window.dispatchEvent(new CustomEvent<Added>('cs-added', {detail: a}));

export function CartDrawer() {
  const [item, setItem] = useState<Added | null>(null);
  useEffect(() => {
    const on = (e: Event) => setItem((e as CustomEvent<Added>).detail);
    window.addEventListener('cs-added', on);
    return () => window.removeEventListener('cs-added', on);
  }, []);
  useEffect(() => {
    if (!item) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setItem(null); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [item]);
  if (!item) return null;
  return (
    <div className="sheet-bg" onClick={(e) => { if (e.target === e.currentTarget) setItem(null); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Added to your cart">
        <div className="sheet-head"><b>Added to your cart</b><button className="x" onClick={() => setItem(null)} aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 6l12 12M18 6 6 18" /></svg></button></div>
        <div className="drawer-line">
          <div className="pic">{item.image ? <img src={item.image} alt="" /> : <Art name={item.art} />}</div>
          <div><b style={{fontFamily: 'var(--display)', fontSize: 19}}>{item.title}</b><span className="hint">{item.variant}{item.qty > 1 ? ` · ${item.qty} pieces` : ''}</span><span className="price">{inr((BigInt(item.pricePaise) * BigInt(item.qty)).toString())}</span></div>
        </div>
        <div className="card sum" style={{position: 'static'}}>
          <div className="r"><span>Cart · {item.count} item{item.count === 1 ? '' : 's'}</span><b>{inr(item.subtotalPaise)}</b></div>
          <div className="r"><span>Delivery</span><span>Included</span></div>
        </div>
        <Link className="btn block" href="/checkout" onClick={() => setItem(null)}>Checkout securely</Link>
        <Link className="btn light block" href="/cart" onClick={() => setItem(null)}>View cart</Link>
        <button className="lnk" style={{justifySelf: 'center'}} onClick={() => setItem(null)}>Continue shopping</button>
      </div>
    </div>
  );
}
