'use client';
import {useState} from 'react';
import Link from 'next/link';
import {inr} from '@/lib/format';
import {setQty} from '@/lib/cart';

type V = {id: string; title: string; pricePaise: string; compareAtPaise: string | null; available: boolean; uniqueSpecimen: boolean};

export function AddToCart({variants}: {variants: V[]}) {
  const [selected, setSelected] = useState(variants.find((v) => v.available)?.id ?? variants[0]?.id);
  const [qty, setQ] = useState(1);
  const [state, setState] = useState<{busy?: boolean; ok?: boolean; error?: string}>({});
  const v = variants.find((x) => x.id === selected);
  if (!v) return <p className="muted">Not available right now.</p>;
  async function add() {
    setState({busy: true});
    const r = await setQty(v!.id, qty);
    setState(r.ok ? {ok: true} : {error: r.error.message});
  }
  return (
    <div className="stack">
      <div className="price" style={{fontSize: '1.4rem'}}>{inr(v.pricePaise)}{v.compareAtPaise && <s>{inr(v.compareAtPaise)}</s>}</div>
      {variants.length > 1 && (
        <div className="variants" role="group" aria-label="Choose an option">
          {variants.map((x) => <button key={x.id} type="button" aria-pressed={x.id === selected} onClick={() => setSelected(x.id)} disabled={!x.available}>{x.title}{!x.available ? ' — sold out' : ''}</button>)}
        </div>
      )}
      {v.uniqueSpecimen && <p className="small"><span className="badge">One of a kind</span> You receive exactly the piece photographed.</p>}
      <div className="row">
        {!v.uniqueSpecimen && (
          <label className="row" style={{gap: '.5rem', fontWeight: 400}}>Qty
            <select value={qty} onChange={(e) => setQ(Number(e.target.value))} style={{width: '5rem'}}>{Array.from({length: 10}, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}</select>
          </label>
        )}
        <button className="btn" onClick={add} disabled={!v.available || state.busy}>{v.available ? (state.busy ? 'Adding…' : 'Add to cart') : 'Sold out'}</button>
      </div>
      <div aria-live="polite">
        {state.ok && <p className="ok">Added. <Link href="/cart">Go to cart →</Link></p>}
        {state.error && <p className="err">{state.error}</p>}
      </div>
      <p className="small muted">Adding to cart does not reserve stock; it is held when you place the order.</p>
    </div>
  );
}
