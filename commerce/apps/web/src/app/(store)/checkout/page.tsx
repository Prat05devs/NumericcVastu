'use client';
import {useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {newKey, post} from '@/lib/client';
import {cartId, remember} from '@/lib/cart';
import {inr} from '@/lib/format';
import {saveOrderToken} from '@/lib/orders';

type Preview = {breakdown: {subtotalPaise: string; discountPaise: string; shippingPaise: string; taxPaise: string; totalPaise: string; taxMode: string; notices: string[]; warnings: string[]; campaign: {label: string} | null; coupon: {label: string} | null}; coupon: {valid: boolean; message?: string} | null; shippingOptions: {id: string; label: string; feePaise: string; freeAbovePaise: string | null; etaText: string | null}[]; shippingConfigured: boolean; holdMinutes: number; partnerAttributed: boolean};
const STATES = ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];

export default function CheckoutPage() {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [form, setForm] = useState({email: '', fullName: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', coupon: '', shipping: '', terms: false, marketing: false});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  // The preview must match the inputs on screen before an order can be placed (no stale totals).
  const [pricedFor, setPricedFor] = useState('');
  const [refresh, setRefresh] = useState(0);
  const inputsKey = `${form.coupon}|${form.shipping}|${form.postalCode}`;
  const key = useRef(newKey());

  useEffect(() => { setId(cartId()); const c = sessionStorage.getItem('sc_coupon'); if (c) setForm((f) => ({...f, coupon: c})); }, []);
  useEffect(() => {
    if (!id) return;
    const t = setTimeout(async () => {
      const r = await post<Preview>('/checkout/preview', {cartId: id, ...(form.coupon && {couponCode: form.coupon}), ...(form.shipping && {shippingMethodId: form.shipping}), ...(/^[1-9]\d{5}$/.test(form.postalCode) && {postalCode: form.postalCode})});
      if (r.ok) {
        setPreview(r.data);
        if (!form.shipping && r.data.shippingOptions[0]) setForm((f) => ({...f, shipping: r.data.shippingOptions[0]!.id}));
        else setPricedFor(`${form.coupon}|${form.shipping}|${form.postalCode}`);
      } else setMessage(r.error.message);
    }, 300);
    return () => clearTimeout(t);
  }, [id, form.coupon, form.shipping, form.postalCode, refresh]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value}));
  async function place(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !preview) return;
    setBusy(true); setErrors({}); setMessage('');
    const address = {fullName: form.fullName, phone: form.phone, line1: form.line1, ...(form.line2 && {line2: form.line2}), city: form.city, state: form.state, postalCode: form.postalCode};
    const r = await post<{orderId: string; orderAccessToken: string}>('/checkout/orders', {cartId: id, email: form.email, shippingAddress: address, shippingMethodId: form.shipping, ...(form.coupon && {couponCode: form.coupon}), acceptTerms: form.terms, marketingConsent: form.marketing, expectedTotalPaise: preview.breakdown.totalPaise}, {'Idempotency-Key': key.current});
    setBusy(false);
    if (!r.ok) {
      if (r.error.code === 'VALIDATION_FAILED' && Array.isArray(r.error.details)) setErrors(Object.fromEntries((r.error.details as {path: string; message: string}[]).map((d) => [d.path.replace('shippingAddress.', ''), d.message])));
      if (r.error.code === 'PRICE_CHANGED') { key.current = newKey(); setPricedFor(''); setRefresh((n) => n + 1); }
      return setMessage(r.error.message);
    }
    saveOrderToken(r.data.orderId, r.data.orderAccessToken);
    remember(null);
    router.push(`/orders/${r.data.orderId}?pay=1`);
  }

  if (id === null) return <div className="wrap" style={{marginTop: '2rem'}}><p>Your cart is empty. <Link href="/shop">Shop now</Link></p></div>;
  const b = preview?.breakdown;
  const field = (k: keyof typeof form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="field"><label htmlFor={k}>{label}</label><input id={k} value={String(form[k])} onChange={set(k)} aria-invalid={Boolean(errors[k])} aria-describedby={errors[k] ? `${k}-err` : undefined} {...props} />{errors[k] && <div id={`${k}-err`} className="err">{errors[k]}</div>}</div>
  );
  return (
    <form className="wrap two" style={{marginTop: '2rem'}} onSubmit={place} noValidate>
      <section>
        <h1>Checkout</h1>
        <h2>Contact</h2>
        {field('email', 'Email (for your receipt and tracking)', {type: 'email', autoComplete: 'email', required: true})}
        <h2>Delivery address (India)</h2>
        {field('fullName', 'Full name', {autoComplete: 'name', required: true})}
        {field('phone', 'Mobile number', {inputMode: 'numeric', autoComplete: 'tel-national', required: true, placeholder: '10-digit mobile'})}
        {field('line1', 'House / flat, street', {autoComplete: 'address-line1', required: true})}
        {field('line2', 'Area, landmark (optional)', {autoComplete: 'address-line2'})}
        <div className="grid" style={{gridTemplateColumns: '1fr 1fr'}}>
          {field('city', 'City', {autoComplete: 'address-level2', required: true})}
          {field('postalCode', 'PIN code', {inputMode: 'numeric', autoComplete: 'postal-code', required: true})}
        </div>
        <div className="field"><label htmlFor="state">State</label><select id="state" value={form.state} onChange={set('state')} required><option value="">Choose…</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select>{errors['state'] && <div className="err">{errors['state']}</div>}</div>
        <h2>Delivery</h2>
        {preview && !preview.shippingConfigured ? <div className="alert warn">Delivery options are being set up. Orders cannot be placed yet.</div> : preview?.shippingOptions.map((s) => (
          <label key={s.id} className="check card" style={{marginBottom: '.5rem'}}><input type="radio" name="shipping" value={s.id} checked={form.shipping === s.id} onChange={set('shipping')} /> <span><strong>{s.label}</strong> — {s.feePaise === '0' ? 'free' : inr(s.feePaise)}{s.freeAbovePaise ? ` (free above ${inr(s.freeAbovePaise)})` : ''}{s.etaText ? <span className="small muted"> · {s.etaText}</span> : null}</span></label>
        ))}
        {field('coupon', 'Coupon code (optional)', {autoCapitalize: 'characters'})}
        {preview?.coupon && !preview.coupon.valid && <p className="err">{preview.coupon.message}</p>}
        <label className="check"><input type="checkbox" checked={form.terms} onChange={set('terms')} required /> <span>I agree to the <Link href="/policies/terms" target="_blank">terms</Link>, <Link href="/policies/shipping-policy" target="_blank">shipping</Link> and <Link href="/policies/returns-policy" target="_blank">returns</Link> policies.</span></label>
        <label className="check"><input type="checkbox" checked={form.marketing} onChange={set('marketing')} /> <span>Send me occasional updates (optional).</span></label>
      </section>
      <aside className="card stack" aria-live="polite">
        <h2>Order total</h2>
        {b ? (
          <table className="summary" style={{width: '100%'}}><tbody>
            <tr><td>Subtotal</td><td>{inr(b.subtotalPaise)}</td></tr>
            {b.discountPaise !== '0' && <tr><td>Discount{b.campaign ? ` (${b.campaign.label})` : ''}{b.coupon ? ` (${b.coupon.label})` : ''}</td><td>−{inr(b.discountPaise)}</td></tr>}
            <tr><td>Delivery</td><td>{b.warnings.includes('SHIPPING_NOT_SELECTED') ? '—' : b.shippingPaise === '0' ? 'Free' : inr(b.shippingPaise)}</td></tr>
            {b.taxMode !== 'NONE' && <tr><td>{b.taxMode === 'INCLUSIVE' ? 'Includes tax' : 'Tax'}</td><td>{inr(b.taxPaise)}</td></tr>}
            <tr className="total"><td>Total</td><td>{inr(b.totalPaise)}</td></tr>
          </tbody></table>
        ) : <p>Calculating…</p>}
        {b?.notices.map((n) => <p key={n} className="small muted">{n}</p>)}
        {preview && <p className="small muted">Stock is held for {preview.holdMinutes} minutes after you place the order while you pay.</p>}
        {message && <p className="err" role="alert">{message}</p>}
        <button className="btn" disabled={busy || !preview?.shippingConfigured || pricedFor !== inputsKey}>{busy ? 'Placing order…' : pricedFor !== inputsKey ? 'Updating total…' : 'Place order and pay'}</button>
      </aside>
    </form>
  );
}
