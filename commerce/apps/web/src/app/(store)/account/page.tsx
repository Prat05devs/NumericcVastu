'use client';
import Link from 'next/link';
import {useCallback, useEffect, useState} from 'react';
import {call, get, post} from '@/lib/client';
import {date, inr, label} from '@/lib/format';

type Me = {email: string; name: string | null; phone: string | null; roles: string[]};
type OrderRow = {id: string; publicCode: string; status: string; totalPaise: string; createdAt: string};
type Address = {id: string; fullName: string; line1: string; city: string; region: string; postalCode: string};
const TONE: Record<string, string> = {DELIVERED: 'ok', SHIPPED: 'warn', PROCESSING: 'warn', PAID: 'ok', PAID_REVIEW: 'warn', PAYMENT_FAILED: 'bad', CANCELLED: '', AWAITING_PAYMENT: 'warn'};

/** Sign in with a 6-digit code sent by email: no passwords to forget or leak. */
function SignIn({onSignedIn}: {onSignedIn: () => void}) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [wait, setWait] = useState(0);
  useEffect(() => { if (!wait) return; const t = setTimeout(() => setWait((w) => w - 1), 1000); return () => clearTimeout(t); }, [wait]);
  async function request(e?: React.FormEvent) {
    e?.preventDefault(); setMsg(''); setBusy(true);
    const r = await post<{message: string}>('/auth/otp/request', {email});
    setBusy(false);
    if (r.ok) { setSent(true); setWait(45); } else setMsg(r.error.message);
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg('');
    const r = await post('/auth/otp/verify', {email, code});
    setBusy(false);
    if (r.ok) onSignedIn(); else setMsg(r.error.message);
  }
  return (
    <div className="card" style={{padding: 28, display: 'grid', gap: 14, maxWidth: 480, margin: '0 auto'}}>
      <span className="eyebrow">Your account</span>
      {!sent ? <>
        <h1 className="disp" style={{fontSize: 34}}>Sign in</h1>
        <p className="muted">See your orders and save your details. We email you a 6-digit code; no password needed.</p>
        <form onSubmit={request} style={{display: 'grid', gap: 12}}>
          <div className="field"><label htmlFor="otp-email">Email</label><input id="otp-email" className="in" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          {msg && <p className="note bad" role="alert">{msg}</p>}
          <button className="btn block" disabled={busy}>{busy ? 'Sending…' : 'Email me a code'}</button>
        </form>
      </> : <>
        <h1 className="disp" style={{fontSize: 34}}>Enter the code we emailed</h1>
        <p className="hint">Sent to {email} · <button className="lnk" style={{fontSize: 12.5}} onClick={() => { setSent(false); setCode(''); setMsg(''); }}>Change</button></p>
        <form onSubmit={verify} style={{display: 'grid', gap: 12}}>
          <label className="sr" htmlFor="otp-code">6-digit code</label>
          <input id="otp-code" className="in otp-in" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required autoFocus />
          {msg && <p className="note bad" role="alert">{msg}</p>}
          <button className="btn block" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Verify'}</button>
        </form>
        <p className="hint" style={{textAlign: 'center'}}>{wait ? `Resend code in 0:${String(wait).padStart(2, '0')}` : <button className="lnk" style={{fontSize: 12.5}} onClick={() => request()}>Resend the code</button>}</p>
      </>}
    </div>
  );
}

export default function AccountPage() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [tab, setTab] = useState<'orders' | 'addresses' | 'data'>('orders');
  const [msg, setMsg] = useState('');
  const load = useCallback(async () => {
    const r = await get<Me>('/me');
    if (!r.ok) return setMe(null);
    setMe(r.data);
    const [o, a] = await Promise.all([get<OrderRow[]>('/me/orders'), get<Address[]>('/me/addresses')]);
    if (o.ok) setOrders(o.data);
    if (a.ok) setAddresses(a.data);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function exportData() {
    const r = await get('/me/export');
    if (!r.ok) return setMsg(r.error.message);
    const url = URL.createObjectURL(new Blob([JSON.stringify(r.data, null, 2)], {type: 'application/json'}));
    Object.assign(document.createElement('a'), {href: url, download: 'my-numericcvaastu-data.json'}).click();
  }
  async function erase() {
    if (!confirm('Erase your account? Orders stay only as legally required records and are no longer linked to a sign-in.')) return;
    const r = await call('DELETE', '/me');
    if (r.ok) setMe(null); else setMsg(r.error.message);
  }
  if (me === undefined) return <div className="w" style={{padding: '40px 0'}}><p className="muted">Loading…</p></div>;
  if (me === null) return <div className="w" style={{paddingTop: 30}}><SignIn onSignedIn={load} /></div>;
  return (
    <div className="w" style={{paddingTop: 30}}>
      <div className="between" style={{marginBottom: 20}}><h1 className="disp" style={{fontSize: 'clamp(30px,4vw,42px)'}}>Hello{me.name ? `, ${me.name.split(' ')[0]}` : ''}</h1><span className="hint">{me.email}</span></div>
      {me.roles.includes('PARTNER') && <p className="note info" style={{marginBottom: 16}}>You are part of the partner programme. <Link className="lnk" href="/partner">Open your partner dashboard →</Link></p>}
      <div className="acct">
        <nav className="side-nav" aria-label="Account">
          {(['orders', 'addresses', 'data'] as const).map((t) => <button key={t} type="button" aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)}>{{orders: 'Orders', addresses: 'Addresses', data: 'Your data'}[t]}</button>)}
          <Link href="/wishlist">Wishlist</Link>
          <button type="button" onClick={async () => { await post('/auth/logout'); setMe(null); }}>Sign out</button>
        </nav>
        <section style={{display: 'grid', gap: 10}}>
          {tab === 'orders' && (orders.length ? orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} className="card order-row"><span><b>{o.publicCode}</b><span className="hint">{date(o.createdAt)} · {inr(o.totalPaise)}</span></span><span className={`pill ${TONE[o.status] ?? ''}`}>{label(o.status)}</span></Link>
          )) : <div className="card" style={{padding: 22}}><p className="muted">No orders yet. <Link className="lnk" href="/shop">Browse the shop</Link></p></div>)}
          {tab === 'addresses' && (addresses.length ? addresses.map((a) => <div key={a.id} className="card" style={{padding: 18}}><b>{a.fullName}</b><p className="muted">{a.line1}, {a.city}, {a.region} {a.postalCode}</p></div>) : <div className="card" style={{padding: 22}}><p className="muted">Addresses you use at checkout can be saved here.</p></div>)}
          {tab === 'data' && <div className="card" style={{padding: 22, display: 'grid', gap: 12}}><p>Download a copy of your personal data, or erase your account.</p><div className="row"><button className="btn light" onClick={exportData}>Download my data</button><button className="btn light" style={{color: 'var(--bad)'}} onClick={erase}>Erase my account</button></div>{msg && <p className="note bad">{msg}</p>}</div>}
        </section>
      </div>
    </div>
  );
}
