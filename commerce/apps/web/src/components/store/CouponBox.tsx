'use client';
import {useState} from 'react';
import type {Offer} from './Ticker';

/**
 * Coupon entry used by the cart and checkout. The code is checked by the API's pricing (checkout preview); the
 * parent passes the current code and the server's verdict. One code per order.
 */
export function CouponBox({code, valid, message, saved, onApply, onRemove, busy, offers = []}: {code: string; valid: boolean | null; message?: string; saved?: string; onApply: (c: string) => void; onRemove: () => void; busy: boolean; offers?: Offer[]}) {
  const [open, setOpen] = useState(Boolean(code));
  const [typed, setTyped] = useState(code);
  if (code && valid) return (
    <div className="coupon">
      <div className="applied"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="M20 12 12 20 3 11V3h8z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg><span><b>{code}</b> applied{saved ? ` · saves ${saved}` : ''}</span><button type="button" onClick={() => { setTyped(''); onRemove(); }}>Remove</button></div>
    </div>
  );
  const others = offers.filter((o) => o.code !== code).slice(0, 3);
  return (
    <div className="coupon">
      {!open ? <button type="button" className="lnk" style={{justifySelf: 'start'}} onClick={() => setOpen(true)}>Have a coupon code?</button> : (
        <div className="row">
          <label className="sr" htmlFor="coupon">Coupon code</label>
          <input id="coupon" className="in" value={typed} onChange={(e) => setTyped(e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="Coupon code" autoCapitalize="characters" autoComplete="off" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const c = typed.trim().toUpperCase(); if (c) onApply(c); } }} aria-invalid={valid === false} aria-describedby={valid === false ? 'coupon-err' : undefined} />
          <button type="button" className="btn sm" style={{height: 44}} disabled={busy || !typed.trim()} onClick={() => { const c = typed.trim().toUpperCase(); if (c) onApply(c); }}>{busy ? 'Checking…' : 'Apply'}</button>
        </div>
      )}
      {code && valid === false && message && <p id="coupon-err" className="note bad" role="alert" style={{padding: '10px 12px', fontSize: 12.5}}>{message}</p>}
      {others.length > 0 && (
        <div className="offers"><span className="hint" style={{fontWeight: 700}}>Offers you can use</span>
          {others.map((o) => <div key={o.code} className="offer"><span><b>{o.code}</b> · {o.title}</span><button type="button" className="lnk" style={{fontSize: 12.5}} onClick={() => { setOpen(true); setTyped(o.code); onApply(o.code); }}>Tap to apply</button></div>)}
        </div>
      )}
    </div>
  );
}
