'use client';
import {Suspense} from 'react';
import {use, useCallback, useEffect, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {call} from '@/lib/client';
import {inr, dateTime, label} from '@/lib/format';
import {orderToken, tokenHeader} from '@/lib/orders';
import {Pay} from '@/components/checkout/Pay';
import {Tracking, type TrackingView} from '@/components/store/Tracking';

type Order = {id: string; publicCode: string; status: string; paymentStatus: string; totalPaise: string; subtotalPaise: string; discountPaise: string; shippingPaise: string; taxPaise: string; refundedPaise: string; paymentDueAt: string; lines: {id: string; title: string; qty: number; totalPaise: string}[]; verifyingPayment: boolean};

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
  // After returning from the payment window, keep checking briefly: the webhook may land a few seconds later.
  useEffect(() => {
    if (!order || order.status !== 'AWAITING_PAYMENT' || !order.verifyingPayment || polls > 10) return;
    const t = setTimeout(() => { setPolls((p) => p + 1); void load(token); }, 3000);
    return () => clearTimeout(t);
  }, [order, polls, token, load]);

  if (order === undefined) return <div className="wrap" style={{marginTop: '2rem'}}><p>Loading your order…</p></div>;
  if (order === null) return <div className="wrap" style={{marginTop: '2rem'}}><h1>Order not found</h1><p>Open the link from your confirmation email, <Link href="/account">sign in</Link>, or <Link href="/track">track by order number</Link>.</p></div>;
  const unpaid = ['AWAITING_PAYMENT', 'PAYMENT_FAILED'].includes(order.status);
  return (
    <div className="wrap two" style={{marginTop: '2rem'}}>
      <section className="stack">
        <h1>Order {order.publicCode}</h1>
        {order.status === 'AWAITING_PAYMENT' && order.verifyingPayment && <div className="alert info" role="status">Verifying your payment with the provider… this can take a few seconds. Please do not pay again.</div>}
        {order.status === 'PAYMENT_FAILED' && <div className="alert warn">The last payment attempt did not go through. Your items are still held until {dateTime(order.paymentDueAt)} — you can try again.</div>}
        {order.status === 'PAID' && <div className="alert good">Payment confirmed. Thank you! We will email you when it ships.</div>}
        {order.status === 'PAID_REVIEW' && <div className="alert warn">We received your payment and are checking stock for your order. Our team will contact you shortly; if we cannot fulfil it you get a full refund.</div>}
        {order.status === 'CANCELLED' && <div className="alert bad">This order was cancelled.</div>}
        {unpaid && !order.verifyingPayment && <Pay orderId={order.id} token={token} totalPaise={order.totalPaise} onDone={() => { setPolls(0); void load(token); }} />}
        {tracking && <Tracking t={tracking} orderId={order.id} token={token} />}
      </section>
      <aside className="card">
        <h2>Summary</h2>
        <ul style={{paddingLeft: '1rem'}}>{order.lines.map((l) => <li key={l.id}>{l.title} × {l.qty} — {inr(l.totalPaise)}</li>)}</ul>
        <table className="summary" style={{width: '100%'}}><tbody>
          <tr><td>Subtotal</td><td>{inr(order.subtotalPaise)}</td></tr>
          {order.discountPaise !== '0' && <tr><td>Discount</td><td>−{inr(order.discountPaise)}</td></tr>}
          <tr><td>Delivery</td><td>{inr(order.shippingPaise)}</td></tr>
          {order.taxPaise !== '0' && <tr><td>Tax</td><td>{inr(order.taxPaise)}</td></tr>}
          <tr className="total"><td>Total</td><td>{inr(order.totalPaise)}</td></tr>
          {order.refundedPaise !== '0' && <tr><td>Refunded</td><td>{inr(order.refundedPaise)}</td></tr>}
        </tbody></table>
        <p className="small muted">Status: {label(order.status)} · Payment: {label(order.paymentStatus)}</p>
      </aside>
    </div>
  );
}

export default function OrderPage(props: {params: Promise<{id: string}>}) {
  return <Suspense fallback={<div className="wrap" style={{marginTop: '2rem'}}><p>Loading…</p></div>}><OrderPageInner {...props} /></Suspense>;
}
