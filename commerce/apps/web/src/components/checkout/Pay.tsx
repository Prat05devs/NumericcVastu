'use client';
import {useEffect, useRef, useState} from 'react';
import {call, newKey, post} from '@/lib/client';
import {inr, usd} from '@/lib/format';
import {tokenHeader} from '@/lib/orders';

type Option = {provider: 'razorpay' | 'paypal'; label: string; currency: string; charge: {amountMinor: string; currency: string; exchangeRate: string | null} | null};
type Checkout = {provider: 'razorpay' | 'paypal' | 'mock'; orderId: string; keyId?: string; clientId?: string; amount: string; currency: string; description?: string; prefill?: {email: string}; simulator?: string | null};
declare global { interface Window { Razorpay?: new (o: Record<string, unknown>) => {open: () => void}; paypal?: {Buttons: (o: Record<string, unknown>) => {render: (el: HTMLElement) => Promise<void>}} } }

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src; s.async = true; s.onload = () => resolve(); s.onerror = () => reject(new Error('Could not load the payment window. Check your connection.'));
    document.head.appendChild(s);
  });
}

/**
 * Payment step. The browser only opens the provider's window; whether the order is paid is decided by the API
 * (verified webhook or server-to-server check). After the popup we ask the API to sync and show its answer.
 */
export function Pay({orderId, token, totalPaise, onDone, autoStart = false}: {orderId: string; token: string | null; totalPaise: string; onDone: () => void; autoStart?: boolean}) {
  const [options, setOptions] = useState<Option[] | null>(null);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const paypalRef = useRef<HTMLDivElement>(null);
  const keys = useRef<Record<string, string>>({});

  const started = useRef(false);
  useEffect(() => {
    void call<Option[]>('GET', `/orders/${orderId}/payment-options`, undefined, tokenHeader(token)).then((r) => setOptions(r.ok ? r.data : []));
  }, [orderId, token]);
  // Straight from checkout: open Razorpay at once when it is the only way to pay (customers already pressed “Pay”).
  useEffect(() => {
    if (!autoStart || started.current || !options || options.length !== 1 || options[0]!.provider !== 'razorpay') return;
    started.current = true;
    void start('razorpay');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, options]);

  async function sync() {
    setBusy(true);
    await post(`/orders/${orderId}/payment-sync`, {}, tokenHeader(token));
    setBusy(false);
    onDone();
  }

  async function start(provider: 'razorpay' | 'paypal') {
    setError(''); setBusy(true);
    keys.current[provider] ??= newKey(); // same key on retry → same provider order
    const r = await post<{checkout: Checkout}>(`/orders/${orderId}/payment-intents`, {provider}, {...tokenHeader(token), 'Idempotency-Key': keys.current[provider]!});
    setBusy(false);
    if (!r.ok) return setError(r.error.message);
    const c = r.data.checkout;
    setCheckout(c);
    try {
      if (c.provider === 'razorpay') {
        await loadScript('https://checkout.razorpay.com/v1/checkout.js');
        new window.Razorpay!({key: c.keyId, order_id: c.orderId, amount: c.amount, currency: c.currency, name: 'NumericcVaastu Crystal', description: c.description, prefill: c.prefill, theme: {color: '#2b211b'}, handler: () => void sync(), modal: {ondismiss: () => void sync()}}).open();
      } else if (c.provider === 'paypal') {
        await loadScript(`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(c.clientId!)}&currency=${c.currency}&intent=capture`);
        if (paypalRef.current) {
          paypalRef.current.innerHTML = '';
          await window.paypal!.Buttons({createOrder: () => c.orderId, onApprove: () => sync(), onCancel: () => sync(), onError: () => setError('PayPal could not complete the payment. You can try again.')}).render(paypalRef.current);
        }
      }
    } catch (e) { setError((e as Error).message); }
  }

  async function simulate(outcome: 'success' | 'failure') {
    setBusy(true);
    await post('/dev/mock-pay', {providerOrderId: checkout!.orderId, outcome});
    await sync();
  }

  if (!options) return <p className="muted">Loading payment options…</p>;
  if (!options.length) return <p className="note warn">Online payment isn’t available right now. Your order is saved: please WhatsApp us on +91 98701 97315 and quote your order number.</p>;
  return (
    <div style={{display: 'grid', gap: 12}}>
      {options.map((o) => (
        <div key={o.provider} className="radio" style={{flexWrap: 'wrap'}}>
          <span className="dot" aria-hidden="true" />
          <span style={{flex: 1, minWidth: 180}}><b>{o.label}</b>{o.provider === 'paypal' && o.charge ? <span>Charged as {usd(o.charge.amountMinor)} USD at ₹{o.charge.exchangeRate} per USD. Your bank may add a conversion fee.</span> : <span>UPI, cards, net banking and wallets</span>}</span>
          <button className="btn sm" disabled={busy} onClick={() => start(o.provider)}>{busy ? 'Please wait…' : o.provider === 'paypal' ? 'Pay with PayPal' : `Pay ${inr(totalPaise)}`}</button>
        </div>
      ))}
      <div ref={paypalRef} />
      {checkout?.provider === 'mock' && checkout.simulator && (
        <div className="note info">
          <b>Payment simulator (development only).</b> No money moves.
          <div className="row" style={{marginTop: 8}}><button className="btn sm" onClick={() => simulate('success')}>Simulate success</button><button className="btn light sm" onClick={() => simulate('failure')}>Simulate failure</button></div>
        </div>
      )}
      {error && <p className="note bad" role="alert">{error}</p>}
    </div>
  );
}
