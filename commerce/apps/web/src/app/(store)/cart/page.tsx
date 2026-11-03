'use client';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import {call} from '@/lib/client';
import {cartId, remember, setQty, type CartView} from '@/lib/cart';
import {inr} from '@/lib/format';

export default function CartPage() {
  const [cart, setCart] = useState<CartView | null | undefined>(undefined);
  const [error, setError] = useState('');
  async function load() {
    const id = cartId();
    if (!id) return setCart(null);
    const r = await call<CartView>('GET', `/carts/${id}`);
    if (r.ok) { setCart(r.data); remember(r.data); } else { setCart(null); remember(null); }
  }
  useEffect(() => { void load(); }, []);
  async function change(variantId: string, qty: number) {
    const r = await setQty(variantId, qty);
    if (r.ok) setCart(r.data); else setError(r.error.message);
  }
  if (cart === undefined) return <div className="wrap" style={{marginTop: '2rem'}}><p>Loading your cart…</p></div>;
  if (!cart || !cart.items.length) return <div className="wrap" style={{marginTop: '2rem'}}><h1>Your cart</h1><p>Your cart is empty. <Link href="/shop">Start shopping →</Link></p></div>;
  const blocked = cart.items.some((i) => !i.sellable || !i.inStock);
  return (
    <div className="wrap two" style={{marginTop: '2rem'}}>
      <section>
        <h1>Your cart</h1>
        {error && <p className="err" role="alert">{error}</p>}
        <table className="data"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th /></tr></thead><tbody>
          {cart.items.map((i) => (
            <tr key={i.variantId}>
              <td><strong>{i.productTitle}</strong><div className="small muted">{i.title} · {i.sku}</div>{!i.sellable && <div className="err small">No longer available</div>}{i.sellable && !i.inStock && <div className="err small">Not enough stock for this quantity</div>}</td>
              <td>{i.uniqueSpecimen ? 1 : <select aria-label={`Quantity of ${i.productTitle}`} value={i.qty} onChange={(e) => change(i.variantId, Number(e.target.value))} style={{width: '4.5rem'}}>{Array.from({length: 10}, (_, n) => n + 1).map((n) => <option key={n}>{n}</option>)}</select>}</td>
              <td>{inr((BigInt(i.unitPricePaise) * BigInt(i.qty)).toString())}</td>
              <td><button className="btn ghost small" onClick={() => change(i.variantId, 0)}>Remove</button></td>
            </tr>
          ))}
        </tbody></table>
      </section>
      <aside className="card stack">
        <h2>Summary</h2>
        <table className="summary" style={{width: '100%'}}><tbody>
          <tr><td>Subtotal</td><td>{inr(cart.breakdown.subtotalPaise)}</td></tr>
          {cart.breakdown.discountPaise !== '0' && <tr><td>Sale discount</td><td>−{inr(cart.breakdown.discountPaise)}</td></tr>}
        </tbody></table>
        {cart.breakdown.notices.map((n) => <p key={n} className="small muted">{n}</p>)}
        <p className="small muted">Delivery, coupon and any tax are calculated at checkout.</p>
        {blocked ? <p className="err">Remove unavailable items to continue.</p> : <Link className="btn" href="/checkout">Checkout</Link>}
      </aside>
    </div>
  );
}
