'use client';
import LocalizedContent from '../i18n/LocalizedContent';
import {useState} from 'react';
import {Tag, X} from 'lucide-react';

/**
 * "Have a coupon code?" for courses, consultations and the report. The server prices it (app/api/coupon) and checks it
 * again when the order is created, so the amount charged always matches what is shown here.
 */
export default function CouponBox({offerId, phone, applied, onChange}) {
  const [code, setCode] = useState('');
  const [state, setState] = useState({busy: false, message: ''});
  async function apply(event) {
    event?.preventDefault();
    if (!code.trim()) return;
    setState({busy: true, message: ''});
    const res = await fetch('/api/coupon', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({code: code.trim(), offerId, phone})}).then((r) => r.json()).catch(() => ({valid: false, message: 'We could not check this code just now. Please try again.'}));
    if (res.valid) { onChange(res); setState({busy: false, message: ''}); } else setState({busy: false, message: res.message});
  }
  if (applied) return <LocalizedContent><div className="nv-coupon is-applied" role="status">
    <p><Tag size={16} aria-hidden="true"/> <b>Coupon <span translate="no">{applied.code}</span> applied.</b> You save <span translate="no">{applied.discount}</span>.</p>
    <dl><div><dt>Price</dt><dd translate="no">{applied.list}</dd></div><div><dt>Discount</dt><dd translate="no">−{applied.discount}</dd></div><div className="is-total"><dt>You pay</dt><dd translate="no">{applied.total}</dd></div></dl>
    <button type="button" className="hv-link" onClick={() => { onChange(null); setCode(''); }}><X size={14} aria-hidden="true"/> Remove coupon</button>
  </div></LocalizedContent>;
  return <LocalizedContent><div className="nv-coupon">
    <label htmlFor={`nv-coupon-${offerId}`}>Have a coupon code?</label>
    <div className="nv-coupon__row">
      <input id={`nv-coupon-${offerId}`} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === 'Enter') apply(e); }} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="e.g. WELCOME10"/>
      <button type="button" className="hv-button" onClick={apply} disabled={state.busy || !code.trim()}>{state.busy ? 'Checking…' : 'Apply'}</button>
    </div>
    {state.message && <p className="nv-coupon__error" role="alert">{state.message}</p>}
  </div></LocalizedContent>;
}
