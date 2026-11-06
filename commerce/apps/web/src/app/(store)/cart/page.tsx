'use client';
import Link from 'next/link';
import {useCallback, useEffect, useState} from 'react';
import {call, get} from '@/lib/client';
import {cartId, remember, setQty, type CartView} from '@/lib/cart';
import {inr} from '@/lib/format';
import {preview, saveCoupon, savedCoupon, type Preview} from '@/lib/preview';
import {CouponBox} from '@/components/store/CouponBox';
import type {Offer} from '@/components/store/Ticker';
import {Art, Icon, artFor, cleanTitle} from '@/components/store/ui';

export default function CartPage() {
  const [cart, setCart] = useState<CartView | null | undefined>(undefined);
  const [pv, setPv] = useState<Preview | null>(null);
  const [coupon, setCoupon] = useState('');
  const [checking, setChecking] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [error, setError] = useState('');
  const [removed, setRemoved] = useState<{variantId: string; qty: number; title: string} | null>(null);

  const price = useCallback(async (code: string) => {
    const id = cartId();
    if (!id) return;
    setChecking(true);
    const r = await preview(id, {couponCode: code || undefined});
    setChecking(false);
    if (r.ok) setPv(r.data);
  }, []);
  async function load() {
    const id = cartId();
    if (!id) return setCart(null);
    const r = await call<CartView>('GET', `/carts/${id}`);
    if (r.ok) { setCart(r.data); remember(r.data); } else { setCart(null); remember(null); }
  }
  useEffect(() => { const c = savedCoupon(); setCoupon(c); void load(); void get<Offer[]>('/offers').then((r) => r.ok && setOffers(r.data)); }, []);
  useEffect(() => { if (cart?.items.length) void price(coupon); }, [cart, coupon, price]);

  async function change(variantId: string, qty: number, title?: string) {
    const before = cart?.items.find((i) => i.variantId === variantId);
    const r = await setQty(variantId, qty);
    if (!r.ok) return setError(r.error.message);
    setError('');
    setCart(r.data);
    if (qty === 0 && before && title) { setRemoved({variantId, qty: before.qty, title}); setTimeout(() => setRemoved((x) => (x?.variantId === variantId ? null : x)), 8000); }
  }
  const apply = (c: string) => { saveCoupon(c); setCoupon(c); };
  const removeCoupon = () => { saveCoupon(''); setCoupon(''); };

  if (cart === undefined) return <div className="w" style={{padding: '40px 0'}}><p className="muted">Loading your cart…</p></div>;
  if (!cart || !cart.items.length) return (
    <div className="w" style={{paddingTop: 24}}>
      {removed && <p className="note info" style={{marginBottom: 12}}>Removed “{removed.title}”. <button className="lnk" onClick={() => change(removed.variantId, removed.qty)}>Undo</button></p>}
      <div className="card empty"><span className="pic"><Art name="bracelet-rose" /></span><h1 className="disp">Your cart is empty</h1><p className="muted">Pieces you add appear here. Delivery is included in every price.</p><div className="row" style={{justifyContent: 'center'}}><Link className="btn" href="/shop">Shop the collection</Link><Link className="btn light" href="/#finder">Find your stone</Link></div></div>
    </div>
  );
  const b = pv?.breakdown;
  const blocked = cart.items.some((i) => !i.sellable || !i.inStock);
  const count = cart.items.reduce((s, i) => s + i.qty, 0);
  return (
    <div className="w" style={{paddingTop: 24}}>
      <h1 className="disp" style={{fontSize: 'clamp(32px,4vw,44px)'}}>Your cart</h1>
      <div className="cartlay" style={{marginTop: 14}}>
        <section aria-label="Items">
          {error && <p className="note bad" role="alert">{error}</p>}
          {cart.items.map((i) => (
            <div key={i.variantId} className="line">
              <div className="pic" aria-hidden="true"><Art name={artFor(undefined, i.productTitle)} /></div>
              <div>
                <b className="t">{cleanTitle(i.productTitle)}</b>
                <div className="sub">{i.title !== 'Default' ? i.title : ''}{i.uniqueSpecimen ? ' · one of a kind' : ''}</div>
                {!i.sellable && <p className="hint err">No longer available. Please remove it.</p>}
                {i.sellable && !i.inStock && <p className="hint err">Not enough stock for this quantity.</p>}
                <div className="act">
                  {i.uniqueSpecimen ? <span className="hint">Quantity 1</span> : (
                    <span className="qty sm" aria-label={`Quantity of ${cleanTitle(i.productTitle)}`}>
                      <button type="button" aria-label="One less" onClick={() => change(i.variantId, i.qty - 1, cleanTitle(i.productTitle))}>−</button><span>{i.qty}</span><button type="button" aria-label="One more" disabled={i.qty >= 10} onClick={() => change(i.variantId, i.qty + 1)}>+</button>
                    </span>
                  )}
                  <button type="button" onClick={() => change(i.variantId, 0, cleanTitle(i.productTitle))}>Remove</button>
                </div>
              </div>
              <div className="lp price">{inr((BigInt(i.unitPricePaise) * BigInt(i.qty)).toString())}</div>
            </div>
          ))}
          {removed && <p className="hint" style={{marginTop: 12}}>Removed “{removed.title}”. <button className="lnk" onClick={() => change(removed.variantId, removed.qty)}>Undo</button></p>}
          <p className="hint" style={{marginTop: 14}}>Items are not reserved until you pay. One-of-a-kind pieces are held for you once checkout starts.</p>
        </section>
        <aside className="card sum" aria-live="polite">
          <h3>Order summary</h3>
          <CouponBox code={coupon} valid={coupon ? (pv?.coupon?.valid ?? null) : null} message={pv?.coupon?.message} saved={b && b.discountPaise !== '0' && b.coupon ? inr(b.discountPaise) : undefined} onApply={apply} onRemove={removeCoupon} busy={checking} offers={offers} />
          <div className="r"><span>Subtotal · {count} item{count === 1 ? '' : 's'}</span><b>{inr(b?.subtotalPaise ?? cart.breakdown.subtotalPaise)}</b></div>
          {b && b.discountPaise !== '0' && <div className="r save"><span>{b.coupon ? `Coupon ${coupon}` : b.campaign ? b.campaign.label : 'Discount'}</span><span>−{inr(b.discountPaise)}</span></div>}
          <div className="r"><span>Delivery</span><span>Included</span></div>
          <div className="r total"><span>Total</span><span>{inr(b?.totalPaise ?? cart.breakdown.totalPaise)}</span></div>
          {b?.notices.map((n) => <p key={n} className="small">{n}</p>)}
          <p className="small">Prices include GST and insured delivery across India. A GST invoice is emailed with your order.</p>
          {blocked ? <p className="note bad">Remove unavailable items to continue.</p> : <Link className="btn block" href="/checkout">Checkout securely · {inr(b?.totalPaise ?? cart.breakdown.totalPaise)}</Link>}
          <div className="secure"><Icon name="lock" /> UPI, cards and net banking by Razorpay</div>
        </aside>
      </div>
    </div>
  );
}
