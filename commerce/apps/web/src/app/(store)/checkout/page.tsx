'use client';
import {useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {call, get, newKey, post} from '@/lib/client';
import {cartId, remember, type CartView} from '@/lib/cart';
import {inr} from '@/lib/format';
import {saveOrderToken} from '@/lib/orders';
import {preview, saveCoupon, savedCoupon, type Preview} from '@/lib/preview';
import {CouponBox} from '@/components/store/CouponBox';
import type {Offer} from '@/components/store/Ticker';
import {Art, Icon, artFor, cleanTitle} from '@/components/store/ui';

const STATES = ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];
/** Indian mobile for delivery: +91 and spaces are accepted; the API stores the 10 digits. */
const tenDigits = (v: string) => v.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');

/**
 * One-page guest checkout: contact (email + WhatsApp), delivery address, prepaid payment. Delivery is included in
 * prices, so the single delivery method is chosen automatically. The total shown is the server's, re-checked on
 * every change and again when the order is placed (PRICE_CHANGED → refreshed, never charged wrongly).
 */
export default function CheckoutPage() {
  const router = useRouter();
  const [id, setId] = useState<string | null | undefined>(undefined);
  const [cart, setCart] = useState<CartView | null>(null);
  const [pv, setPv] = useState<Preview | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [form, setForm] = useState({email: '', whatsapp: '', fullName: '', line1: '', line2: '', city: '', state: '', postalCode: '', coupon: '', terms: false, marketing: false});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [pricing, setPricing] = useState(false);
  const [pricedFor, setPricedFor] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const key = useRef(newKey());
  const shipping = pv?.shippingOptions[0]?.id ?? '';
  const inputsKey = `${form.coupon}|${shipping}|${form.postalCode}`;

  useEffect(() => {
    const c = cartId();
    setId(c);
    setForm((f) => ({...f, coupon: savedCoupon()}));
    if (c) void call<CartView>('GET', `/carts/${c}`).then((r) => { if (r.ok) setCart(r.data); else setId(null); });
    void get<Offer[]>('/offers').then((r) => r.ok && setOffers(r.data));
  }, []);
  useEffect(() => {
    if (!id) return;
    const t = setTimeout(async () => {
      setPricing(true);
      const r = await preview(id, {couponCode: form.coupon || undefined, shippingMethodId: shipping || undefined, postalCode: form.postalCode});
      setPricing(false);
      if (!r.ok) return setMessage(r.error.message);
      setPv(r.data);
      const ship = r.data.shippingOptions[0]?.id ?? '';
      if (ship === shipping) setPricedFor(`${form.coupon}|${ship}|${form.postalCode}`);
    }, 250);
    return () => clearTimeout(t);
  }, [id, form.coupon, form.postalCode, shipping]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value}));
  function validate() {
    const e: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e['email'] = 'Enter the email for your confirmation and invoice.';
    if (!/^[6-9]\d{9}$/.test(tenDigits(form.whatsapp))) e['whatsapp'] = 'Enter a 10-digit Indian mobile number.';
    if (form.fullName.trim().length < 2) e['fullName'] = 'Enter the name for delivery.';
    if (form.line1.trim().length < 5) e['line1'] = 'Enter the house or flat number and street.';
    if (!/^[1-9]\d{5}$/.test(form.postalCode)) e['postalCode'] = 'Enter a 6-digit PIN code.';
    if (form.city.trim().length < 2) e['city'] = 'Enter the city.';
    if (!form.state) e['state'] = 'Choose the state.';
    if (!form.terms) e['terms'] = 'Please agree to the terms to continue.';
    return e;
  }
  async function place(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !pv) return;
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) { setMessage('Please check the highlighted fields.'); document.getElementById(Object.keys(v)[0]!)?.focus(); return; }
    setBusy(true); setMessage('');
    const address = {fullName: form.fullName.trim(), phone: tenDigits(form.whatsapp), line1: form.line1.trim(), ...(form.line2.trim() && {line2: form.line2.trim()}), city: form.city.trim(), state: form.state, postalCode: form.postalCode};
    const r = await post<{orderId: string; orderAccessToken: string}>('/checkout/orders', {cartId: id, email: form.email.trim(), shippingAddress: address, shippingMethodId: shipping, ...(form.coupon && {couponCode: form.coupon}), acceptTerms: form.terms, marketingConsent: form.marketing, expectedTotalPaise: pv.breakdown.totalPaise}, {'Idempotency-Key': key.current});
    setBusy(false);
    if (!r.ok) {
      if (r.error.code === 'VALIDATION_FAILED' && Array.isArray(r.error.details)) setErrors(Object.fromEntries((r.error.details as {path: string; message: string}[]).map((d) => [d.path.replace('shippingAddress.', '').replace('phone', 'whatsapp').replace('email', 'email'), d.message])));
      if (r.error.code === 'PRICE_CHANGED') { key.current = newKey(); setPricedFor(''); setForm((f) => ({...f})); }
      return setMessage(r.error.message);
    }
    saveOrderToken(r.data.orderId, r.data.orderAccessToken);
    saveCoupon('');
    remember(null);
    router.push(`/orders/${r.data.orderId}?pay=1`);
  }

  if (id === undefined) return <div className="w" style={{padding: '40px 0'}}><p className="muted">Loading checkout…</p></div>;
  if (!id) return <div className="w" style={{paddingTop: 24}}><div className="card empty"><span className="pic"><Art name="bracelet-rose" /></span><h1 className="disp">Your cart is empty</h1><p className="muted">Add a piece to check out.</p><Link className="btn" href="/shop">Shop the collection</Link></div></div>;
  const b = pv?.breakdown;
  const ready = Boolean(pv?.shippingConfigured) && pricedFor === inputsKey && !pricing;
  const total = b ? inr(b.totalPaise) : '…';
  const err = (k: string) => errors[k] ? <span id={`${k}-err`} className="hint err">{errors[k]}</span> : null;
  const inProps = (k: keyof typeof form) => ({id: k, className: 'in', value: String(form[k]), onChange: set(k), 'aria-invalid': Boolean(errors[k]), 'aria-describedby': errors[k] ? `${k}-err` : undefined});
  const summary = (
    <div className="card sum" aria-live="polite">
      <h3>Order summary</h3>
      {cart?.items.map((i) => (
        <div key={i.variantId} className="mini-line"><div className="pic"><span className="q">{i.qty}</span><Art name={artFor(undefined, i.productTitle)} /></div><div><b style={{fontSize: 13.5}}>{cleanTitle(i.productTitle)}</b>{i.title !== 'Default' && <span className="hint">{i.title}</span>}</div><b>{inr((BigInt(i.unitPricePaise) * BigInt(i.qty)).toString())}</b></div>
      ))}
      <CouponBox code={form.coupon} valid={form.coupon ? (pv?.coupon?.valid ?? null) : null} message={pv?.coupon?.message} saved={b && b.discountPaise !== '0' && b.coupon ? inr(b.discountPaise) : undefined} onApply={(c) => { saveCoupon(c); setForm((f) => ({...f, coupon: c})); }} onRemove={() => { saveCoupon(''); setForm((f) => ({...f, coupon: ''})); }} busy={pricing} offers={offers} />
      {b ? <>
        <div className="r"><span>Subtotal</span><b>{inr(b.subtotalPaise)}</b></div>
        {b.discountPaise !== '0' && <div className="r save"><span>{b.coupon ? `Coupon ${form.coupon}` : b.campaign?.label ?? 'Discount'}</span><span>−{inr(b.discountPaise)}</span></div>}
        <div className="r"><span>Delivery</span><span>{b.shippingPaise === '0' ? 'Included' : inr(b.shippingPaise)}</span></div>
        {b.taxMode === 'EXCLUSIVE' && <div className="r"><span>GST</span><span>{inr(b.taxPaise)}</span></div>}
        <div className="r total"><span>Total</span><span>{inr(b.totalPaise)}</span></div>
        <p className="small">{b.taxMode === 'EXCLUSIVE' ? 'GST shown separately.' : 'Prices include GST.'} Insured delivery across India is included. A GST invoice is emailed with your order.</p>
      </> : <p className="muted">Calculating…</p>}
    </div>
  );
  return (
    <form className="w" style={{paddingTop: 22}} onSubmit={place} noValidate>
      <div className="between" style={{marginBottom: 14}}><Link className="lnk" href="/cart">← Back to cart</Link><span className="secure"><Icon name="lock" /> Secure checkout</span></div>
      <div className="co">
        <section style={{display: 'grid', gap: 12}}>
          <button type="button" className="card msum between" style={{padding: '12px 14px', width: '100%', display: undefined}} onClick={() => setShowSummary((s) => !s)} aria-expanded={showSummary}><span><b>{showSummary ? 'Hide' : 'Show'} order summary</b> {showSummary ? '▴' : '▾'}</span><b>{total}</b></button>
          {showSummary && <div className="msum-body">{summary}</div>}
          <div className="card step"><h3><i>1</i>Contact</h3>
            <div className="g2">
              <div className="field"><label htmlFor="email">Email</label><input {...inProps('email')} type="email" autoComplete="email" inputMode="email" />{err('email') ?? <span className="hint">For your confirmation, GST invoice and the courier’s tracking link.</span>}</div>
              <div className="field"><label htmlFor="whatsapp">WhatsApp number</label><input {...inProps('whatsapp')} type="tel" autoComplete="tel" inputMode="tel" placeholder="98765 43210" />{err('whatsapp') ?? <span className="hint">Our team may message you about your order. Also given to the courier.</span>}</div>
            </div>
          </div>
          <div className="card step"><h3><i>2</i>Delivery address</h3>
            <div className="field"><label htmlFor="fullName">Full name</label><input {...inProps('fullName')} autoComplete="name" />{err('fullName')}</div>
            <div className="field"><label htmlFor="line1">House or flat, street</label><input {...inProps('line1')} autoComplete="address-line1" />{err('line1')}</div>
            <div className="field"><label htmlFor="line2">Area, landmark <span className="muted" style={{fontWeight: 500}}>(optional)</span></label><input {...inProps('line2')} autoComplete="address-line2" /></div>
            <div className="g3">
              <div className="field"><label htmlFor="postalCode">PIN code</label><input {...inProps('postalCode')} inputMode="numeric" autoComplete="postal-code" maxLength={6} />{err('postalCode')}</div>
              <div className="field"><label htmlFor="city">City</label><input {...inProps('city')} autoComplete="address-level2" />{err('city')}</div>
              <div className="field"><label htmlFor="state">State</label><select {...inProps('state')} autoComplete="address-level1"><option value="">Choose…</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select>{err('state')}</div>
            </div>
            <p className="hint">Insured delivery across India is included in the price. Our courier partner emails the tracking link when your order ships.</p>
          </div>
          <div className="card step"><h3><i>3</i>Payment</h3>
            <div className="radio"><span className="dot" aria-hidden="true" /><span><b>Pay online</b><span>UPI, cards, net banking and wallets · Razorpay</span></span><em>Prepaid</em></div>
            {pv && !pv.shippingConfigured && <p className="note warn">Delivery is being set up, so orders can’t be placed just yet. Please try again shortly or <a className="lnk" href="https://wa.me/919870197315" target="_blank" rel="noopener noreferrer">message us</a>.</p>}
            <label className="tick"><input id="terms" type="checkbox" checked={form.terms} onChange={set('terms')} aria-invalid={Boolean(errors['terms'])} /><span>I agree to the <Link href="/policies/terms" target="_blank">terms</Link>, <Link href="/policies/shipping-policy" target="_blank">delivery</Link> and <Link href="/policies/returns-policy" target="_blank">returns</Link> policies.</span></label>
            {err('terms')}
            <label className="tick"><input type="checkbox" checked={form.marketing} onChange={set('marketing')} /><span>Send me new arrivals and offers by email (optional).</span></label>
            {message && <p className="note bad" role="alert">{message}</p>}
            <button className="btn block" disabled={busy || !ready}>{busy ? 'Placing your order…' : !ready ? 'Updating total…' : `Pay ${total} securely`}</button>
            <div className="secure"><Icon name="lock" /> You finish payment in Razorpay’s window. We never see your card details.</div>
            {pv && <p className="hint" style={{textAlign: 'center'}}>Your items are held for {pv.holdMinutes} minutes while you pay.</p>}
          </div>
        </section>
        <aside className="side">{summary}</aside>
      </div>
    </form>
  );
}
