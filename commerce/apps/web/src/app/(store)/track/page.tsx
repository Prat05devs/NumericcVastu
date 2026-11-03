'use client';
import {useState} from 'react';
import {post} from '@/lib/client';
import {Tracking, type TrackingView} from '@/components/store/Tracking';

export default function TrackPage() {
  const [orderCode, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [view, setView] = useState<TrackingView | null>(null);
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    const r = await post<TrackingView>('/track', {orderCode, email});
    if (r.ok) setView(r.data); else { setView(null); setError(r.error.message); }
  }
  return (
    <div className="wrap" style={{marginTop: '2rem', maxWidth: 720}}>
      <h1>Track your order</h1>
      <form className="card" onSubmit={submit}>
        <div className="field"><label htmlFor="code">Order number</label><input id="code" placeholder="NVC-XXXXXXXX" value={orderCode} onChange={(e) => setCode(e.target.value)} required /></div>
        <div className="field"><label htmlFor="em">Email used at checkout</label><input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn">Track</button>
      </form>
      {view && <section style={{marginTop: '1.5rem'}}><h2>Order {view.orderCode} — {view.statusLabel}</h2><Tracking t={view} /></section>}
    </div>
  );
}
