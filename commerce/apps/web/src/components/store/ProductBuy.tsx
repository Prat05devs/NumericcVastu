'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {call} from '@/lib/client';
import {cartId, setQty, type CartView} from '@/lib/cart';
import {inr} from '@/lib/format';
import {announceAdded} from './CartDrawer';

type V = {id: string; title: string; pricePaise: string; compareAtPaise: string | null; available: boolean; uniqueSpecimen: boolean};

/** Option buttons, quantity, Add to cart (opens the mini-cart) and Buy now. Prices shown are the API's; the server re-prices at checkout. */
export function ProductBuy({variants, title, image, art, optionLabel}: {variants: V[]; title: string; image: string | null; art: string; optionLabel: string}) {
  const router = useRouter();
  const [selected, setSelected] = useState(variants.find((v) => v.available)?.id ?? variants[0]?.id);
  const [qty, setQ] = useState(1);
  const [busy, setBusy] = useState<'' | 'add' | 'buy'>('');
  const [error, setError] = useState('');
  const v = variants.find((x) => x.id === selected);
  if (!v) return <p className="note info">This piece is not available right now.</p>;
  const max = v.uniqueSpecimen ? 1 : 10;

  async function add(then: 'drawer' | 'checkout') {
    if (!v) return;
    setBusy(then === 'drawer' ? 'add' : 'buy'); setError('');
    // Quantities are set, not added, by the API: start from what is already in the cart.
    let existing = 0;
    const id = cartId();
    if (id) { const c = await call<CartView>('GET', `/carts/${id}`); if (c.ok) existing = c.data.items.find((i) => i.variantId === v.id)?.qty ?? 0; }
    const want = Math.min(max, existing + qty);
    const r = await setQty(v.id, want);
    setBusy('');
    if (!r.ok) return setError(r.error.message);
    if (then === 'checkout') return router.push('/checkout');
    announceAdded({title, variant: variants.length > 1 ? v.title : '', pricePaise: v.pricePaise, qty: want - existing || qty, image, art, subtotalPaise: r.data.breakdown.subtotalPaise, count: r.data.items.reduce((s, i) => s + i.qty, 0)});
  }

  return (
    <>
      <div className="row"><span className="price" style={{fontSize: 26}}>{inr(v.pricePaise)}</span>{v.compareAtPaise && <s className="strike">{inr(v.compareAtPaise)}</s>}<span className={`pill ${v.available ? 'ok' : 'bad'}`}>{v.available ? (v.uniqueSpecimen ? 'In stock · one of a kind' : 'In stock') : 'Sold out'}</span></div>
      {variants.length > 1 && (
        <div className="opt"><h4>{optionLabel}</h4>
          <div className="sw" role="group" aria-label={optionLabel}>
            {variants.map((x) => <button key={x.id} type="button" aria-pressed={x.id === selected} disabled={!x.available} onClick={() => { setSelected(x.id); setQ(1); }}>{x.title}{x.pricePaise !== v.pricePaise && x.available ? ` · ${inr(x.pricePaise)}` : ''}</button>)}
          </div>
        </div>
      )}
      {v.uniqueSpecimen && <p className="hint">You receive exactly the piece photographed. It is held for you once you start paying.</p>}
      <div className="ctas">
        <div className="qty" aria-label="Quantity">
          <button type="button" aria-label="One less" onClick={() => setQ((q) => Math.max(1, q - 1))} disabled={qty <= 1}>−</button>
          <span aria-live="polite">{qty}</span>
          <button type="button" aria-label="One more" onClick={() => setQ((q) => Math.min(max, q + 1))} disabled={qty >= max}>+</button>
        </div>
        <button className="btn add" type="button" onClick={() => add('drawer')} disabled={!v.available || Boolean(busy)}>{!v.available ? 'Sold out' : busy === 'add' ? 'Adding…' : `Add to cart · ${inr((BigInt(v.pricePaise) * BigInt(qty)).toString())}`}</button>
        <button className="btn gold" type="button" onClick={() => add('checkout')} disabled={!v.available || Boolean(busy)}>{busy === 'buy' ? 'One moment…' : 'Buy now'}</button>
      </div>
      {error && <p className="hint err" role="alert">{error}</p>}
      <div className="stickybar" aria-hidden="false">
        <div style={{flex: 1}}><b>{inr(v.pricePaise)}</b><span className="hint">{variants.length > 1 ? `${v.title} · ` : ''}{v.available ? 'in stock' : 'sold out'}</span></div>
        <button className="btn" type="button" onClick={() => add('drawer')} disabled={!v.available || Boolean(busy)}>{busy === 'add' ? 'Adding…' : 'Add to cart'}</button>
      </div>
    </>
  );
}
