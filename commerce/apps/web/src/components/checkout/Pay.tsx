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
export function Pay({orderId, token, totalPaise, onDone}: {orderId: string; token: string | null; totalPaise: string; onDone: () => void}) {
  const [options, setOptions] = useState<Option[] | null>(null);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const paypalRef = useRef<HTMLDivElement>(null);
  const keys = useRef<Record<string, string>>({});

  useEffect(() => {
    void call<Option[]>('GET', `/orders/${orderId}/payment-options`, undefined, tokenHeader(token)).then((r) => setOptions(r.ok ? r.data : []));
  }, [orderId, token]);

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
        new window.Razorpay!({key: c.keyId, order_id: c.orderId, amount: c.amount, currency: c.currency, name: 'NumericcVaastu Crystal', description: c.description, prefill: c.prefill, theme: {color: '#4b2a7b'}, handler: () => void sync(), modal: {ondismiss: () => void sync()}}).open();
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

  if (!options) return <p>Loading payment options…</p>;
  if (!options.length) return <div className="alert warn">Online payment is not available right now. Your order is saved — please contact us and quote your order number.</div>;
  return (
    <div className="stack">
      <h2>Pay {inr(totalPaise)}</h2>
      {options.map((o) => (
        <div key={o.provider} className="card row spread">
          <div><strong>{o.label}</strong>{o.provider === 'paypal' && o.charge && <div className="small muted">Charged as {usd(o.charge.amountMinor)} USD at ₹{o.charge.exchangeRate} per USD. Your bank may add its own conversion fee.</div>}</div>
          <button className="btn" disabled={busy} onClick={() => start(o.provider)}>{busy ? 'Please wait…' : o.provider === 'paypal' ? 'Pay with PayPal' : 'Pay now'}</button>
        </div>
      ))}
      <div ref={paypalRef} />
      {checkout?.provider === 'mock' && checkout.simulator && (
        <div className="alert info">
          <strong>Payment simulator (development only).</strong> No money moves.
          <div className="row" style={{marginTop: '.5rem'}}><button className="btn small" onClick={() => simulate('success')}>Simulate success</button><button className="btn small ghost" onClick={() => simulate('failure')}>Simulate failure</button></div>
        </div>
      )}
      {error && <p className="err" role="alert">{error}</p>}
    </div>
  );
}
