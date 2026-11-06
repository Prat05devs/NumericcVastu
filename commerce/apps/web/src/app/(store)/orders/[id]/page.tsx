'use client';
import {Suspense} from 'react';
import {use, useCallback, useEffect, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {call} from '@/lib/client';
import {inr, dateTime, date, label} from '@/lib/format';
import {orderToken, tokenHeader} from '@/lib/orders';
import {Pay} from '@/components/checkout/Pay';
import type {TrackingView} from '@/components/store/Tracking';
import {Art, Icon, artFor, cleanTitle, waLink, WhatsAppIcon} from '@/components/store/ui';

type Order = {id: string; publicCode: string; status: string; paymentStatus: string; totalPaise: string; subtotalPaise: string; discountPaise: string; shippingPaise: string; taxPaise: string; refundedPaise: string; paymentDueAt: string; createdAt?: string; lines: {id: string; title: string; qty: number; totalPaise: string}[]; verifyingPayment: boolean};
const PAID = ['PAID', 'PAID_REVIEW', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

function OrderPageInner({params}: {params: Promise<{id: string}>}) {
  const {id} = use(params);
  const sp = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [tracking, setTracking] = useState<TrackingView | null>(null);
  const [polls, setPolls] = useState(0);

  const load = useCallback(async (t: string | null) => {
    const r = await call<Order>('GET', `/orders/${id}`, undefined, tokenHeader(t));
    setOrder(r.ok ? r.data : null);
    if (r.ok && !['AWAITING_PAYMENT', 'PAYMENT_FAILED', 'CANCELLED'].includes(r.data.status)) {
      const tr = await call<TrackingView>('GET', `/orders/${id}/tracking`, undefined, tokenHeader(t));
      if (tr.ok) setTracking(tr.data);
    }
  }, [id]);
  useEffect(() => { const t = orderToken(id, sp.get('t')); setToken(t); void load(t); }, [id, sp, load]);
  // After the payment window the webhook may land a few seconds later: keep checking briefly.
  useEffect(() => {
    if (!order || order.status !== 'AWAITING_PAYMENT' || !order.verifyingPayment || polls > 10) return;
    const t = setTimeout(() => { setPolls((p) => p + 1); void load(token); }, 3000);
    return () => clearTimeout(t);
  }, [order, polls, token, load]);

  if (order === undefined) return <div className="w" style={{padding: '40px 0'}}><p className="muted">Loading your order…</p></div>;
  if (order === null) return <div className="w" style={{paddingTop: 24}}><div className="card empty"><span className="pic"><Art name="cluster" /></span><h1 className="disp">We couldn’t open this order</h1><p className="muted">Open the link in your confirmation email, or sign in with the email you used.</p><Link className="btn" href="/account">Sign in</Link></div></div>;
  const unpaid = ['AWAITING_PAYMENT', 'PAYMENT_FAILED'].includes(order.status);
  const paid = PAID.includes(order.status);
  const steps = tracking?.steps ?? [];
  const summary = (
    <aside className="card sum">
      <h3>Order {order.publicCode}</h3>
      {order.lines.map((l) => <div key={l.id} className="mini-line"><div className="pic"><span className="q">{l.qty}</span><Art name={artFor(undefined, l.title)} /></div><b style={{fontSize: 13.5}}>{cleanTitle(l.title)}</b><b>{inr(l.totalPaise)}</b></div>)}
      <div className="r"><span>Subtotal</span><b>{inr(order.subtotalPaise)}</b></div>
      {order.discountPaise !== '0' && <div className="r save"><span>Discount</span><span>−{inr(order.discountPaise)}</span></div>}
      <div className="r"><span>Delivery</span><span>{order.shippingPaise === '0' ? 'Included' : inr(order.shippingPaise)}</span></div>
      <div className="r total"><span>Total</span><span>{inr(order.totalPaise)}</span></div>
      {order.refundedPaise !== '0' && <div className="r"><span>Refunded</span><span>{inr(order.refundedPaise)}</span></div>}
      <p className="small">Status: {label(order.status)}</p>
    </aside>
  );
  return (
    <div className="w" style={{padding: '30px 0 0'}}>
      {paid ? (
        <div className="center"><div className="okmark"><Icon name="check" /></div><span className="eyebrow">Order {order.publicCode}</span><h1 className="disp" style={{fontSize: 'clamp(32px,4vw,44px)', marginTop: 8}}>{order.status === 'PAID_REVIEW' ? 'Payment received. We’re checking stock.' : 'Thank you. Your order is confirmed.'}</h1><p className="muted" style={{marginTop: 10}}>{order.status === 'PAID_REVIEW' ? 'Our team will contact you shortly. If we can’t fulfil it, you get a full refund.' : 'We’ve emailed your confirmation and GST invoice. Our team may also reach you on WhatsApp.'}</p></div>
      ) : (
        <div className="center"><span className="eyebrow">Order {order.publicCode}</span><h1 className="disp" style={{fontSize: 'clamp(30px,4vw,42px)', marginTop: 8}}>{order.status === 'CANCELLED' ? 'This order was cancelled' : !unpaid ? label(order.status) : order.verifyingPayment ? 'Confirming your payment…' : 'One last step: payment'}</h1></div>
      )}
      <div className="cartlay" style={{marginTop: 28}}>
        <div className="card" style={{padding: 22, display: 'grid', gap: 16}}>
          {order.status === 'AWAITING_PAYMENT' && order.verifyingPayment && <p className="note info" role="status">We’re confirming your payment with the bank. This usually takes a few seconds; you’ll get an email as soon as it’s done. Please don’t pay again.</p>}
          {order.status === 'PAYMENT_FAILED' && <p className="note warn">The payment didn’t go through and no money was taken. Your items are held until {dateTime(order.paymentDueAt)}: try again, perhaps with UPI or another card.</p>}
          {unpaid && !order.verifyingPayment && <><h3 style={{fontSize: 16, fontWeight: 800}}>Pay {inr(order.totalPaise)}</h3><Pay orderId={order.id} token={token} totalPaise={order.totalPaise} autoStart={sp.get('pay') === '1' && order.status === 'AWAITING_PAYMENT'} onDone={() => { setPolls(0); void load(token); }} /></>}
          {paid && <>
            <h3 style={{fontSize: 16, fontWeight: 800}}>What happens next</h3>
            <div className="timeline">
              {(steps.length ? steps : [{key: 'paid', label: 'Payment received', at: null, done: true}, {key: 'packed', label: 'Checked and packed', at: null, done: false}, {key: 'shipped', label: 'Shipped', at: null, done: false}, {key: 'delivered', label: 'Delivered', at: null, done: false}]).map((s, i, arr) => {
                const now = !s.done && (i === 0 || arr[i - 1]!.done);
                return <div key={s.key} className={`tl${s.done ? ' done' : now ? ' now' : ''}`}><i>{s.done ? '✓' : i + 1}</i><div><b>{s.label}</b>{s.key.includes('ship') && <span>Our courier partner’s tracking link arrives by email.</span>}</div>{s.at ? <time>{date(s.at)}</time> : <span />}</div>;
              })}
            </div>
            {tracking?.shipments.map((s) => <p key={s.trackingNo} className="note info">{s.courier} · {s.trackingNo}{s.trackingUrl && <> · <a className="lnk" href={s.trackingUrl} target="_blank" rel="noopener noreferrer">Track with the courier ↗</a></>}</p>)}
          </>}
          <div className="row"><Link className="btn" href="/shop">Continue shopping</Link><a className="btn light" href={waLink(`Namaste, I have a question about order ${order.publicCode}.`)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon /> Questions? WhatsApp us</a></div>
        </div>
        {summary}
      </div>
      {paid && <div className="card" style={{padding: 20, marginTop: 18}}><div className="between"><span><b>Save your details for next time?</b><span className="hint">Sign in with a 6-digit code sent to your email. No password.</span></span><Link className="btn light" href="/account">Sign in</Link></div></div>}
    </div>
  );
}

export default function OrderPage(props: {params: Promise<{id: string}>}) {
  return <Suspense fallback={<div className="w" style={{padding: '40px 0'}}><p className="muted">Loading…</p></div>}><OrderPageInner {...props} /></Suspense>;
}
