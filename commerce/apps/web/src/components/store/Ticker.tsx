'use client';
import {useEffect, useState} from 'react';

/** One advertised coupon (from GET /offers) or a plain message. */
export type Offer = {code: string; title: string; terms: string; families?: string[]};
type Item = {title: string; code?: string};

export function CopyCode({code, big = false}: {code: string; big?: boolean}) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className={`copy${big ? ' big' : ''}${done ? ' done' : ''}`} aria-label={`Copy code ${code}`}
      onClick={async (e) => {
        e.preventDefault();
        try { await navigator.clipboard.writeText(code); } catch { /* older browsers: the code is visible to type */ }
        setDone(true); setTimeout(() => setDone(false), 1600);
      }}>
      {code}<span>{done ? 'Copied ✓' : 'Copy'}</span>
    </button>
  );
}

/** Offers sheet: every advertised code with its terms. Opened from the ticker or a product page. */
export function OffersSheet({offers, onClose}: {offers: Offer[]; onClose: () => void}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="sheet-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Offers for you">
        <div className="sheet-head"><b>Offers for you</b><button className="x" onClick={onClose} aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 6l12 12M18 6 6 18" /></svg></button></div>
        {offers.map((o) => <div key={o.code} className="offer-row"><div><b>{o.title}</b>{o.terms && <span className="t">{o.terms}</span>}</div><CopyCode code={o.code} big /></div>)}
        <p className="fine">Apply the code in your cart or at checkout. One code per order.</p>
      </div>
    </div>
  );
}

/**
 * The running offers bar at the top of every page: active codes staff chose to advertise (back office → Coupons →
 * “Show in the offers bar”), plus standing messages. Moves right to left in a loop; pauses on hover or focus.
 */
export function Ticker({offers, messages}: {offers: Offer[]; messages: string[]}) {
  const [open, setOpen] = useState(false);
  const items: Item[] = [];
  const plain = [...messages];
  for (const o of offers) { items.push({title: o.title, code: o.code}); if (plain.length) items.push({title: plain.shift()!}); }
  items.push(...plain.map((m) => ({title: m})));
  // Short lists repeat so the loop always fills the width.
  const set = items.length < 4 ? [...items, ...items, ...items] : items;
  const one = (dup: boolean) => (
    <div className="tk-set" aria-hidden={dup || undefined}>
      {set.map((it, i) => (
        <span className="tk-item" key={i}>
          {it.code ? <span className="tk-tag">OFFER</span> : <span className="tk-dot">✦</span>}
          {it.title}
          {it.code && (dup ? <span className="copy">{it.code}<span>Copy</span></span> : <CopyCode code={it.code} />)}
        </span>
      ))}
    </div>
  );
  return (
    <div className="ticker">
      <div className="tk-viewport" tabIndex={0} aria-label="Current offers">
        <div className="tk-track" style={{['--tk-speed' as string]: `${Math.max(30, set.length * 8)}s`}}>{one(false)}{one(true)}</div>
      </div>
      {offers.length > 0 && <button type="button" className="tk-all" onClick={() => setOpen(true)}>View all offers</button>}
      {open && <OffersSheet offers={offers} onClose={() => setOpen(false)} />}
    </div>
  );
}
