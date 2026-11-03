'use client';
import Link from 'next/link';
import {useCallback, useEffect, useState} from 'react';
import {call, get, post} from '@/lib/client';
import {date, inr, label} from '@/lib/format';
import {OtpLogin} from '@/components/forms/OtpLogin';

type Me = {email: string; name: string | null; phone: string | null; roles: string[]};
type OrderRow = {id: string; publicCode: string; status: string; totalPaise: string; createdAt: string};
type Address = {id: string; fullName: string; line1: string; city: string; region: string; postalCode: string};

export default function AccountPage() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
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
  if (me === undefined) return <div className="wrap" style={{marginTop: '2rem'}}><p>Loading…</p></div>;
  if (me === null) return <div className="wrap" style={{marginTop: '2rem'}}><h1>Your account</h1><OtpLogin onSignedIn={load} /></div>;
  return (
    <div className="wrap stack" style={{marginTop: '2rem'}}>
      <div className="row spread"><h1>Hello{me.name ? `, ${me.name}` : ''}</h1><button className="btn ghost small" onClick={async () => { await post('/auth/logout'); setMe(null); }}>Sign out</button></div>
      {me.roles.includes('PARTNER') && <div className="alert info">You are part of the partner programme. <Link href="/partner">Open your partner dashboard →</Link></div>}
      <section><h2>Orders</h2>{orders.length ? (
        <table className="data"><thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Total</th></tr></thead><tbody>
          {orders.map((o) => <tr key={o.id}><td><Link href={`/orders/${o.id}`}>{o.publicCode}</Link></td><td>{date(o.createdAt)}</td><td>{label(o.status)}</td><td>{inr(o.totalPaise)}</td></tr>)}
        </tbody></table>) : <p className="muted">No orders yet.</p>}</section>
      <section><h2>Saved addresses</h2>{addresses.length ? <ul>{addresses.map((a) => <li key={a.id}>{a.fullName}, {a.line1}, {a.city}, {a.region} {a.postalCode}</li>)}</ul> : <p className="muted">None saved.</p>}</section>
      <section className="card"><h2>Your data</h2><p className="small">Download a copy of your personal data, or erase your account.</p><div className="row"><button className="btn ghost" onClick={exportData}>Download my data</button><button className="btn danger" onClick={erase}>Erase my account</button></div>{msg && <p className="err">{msg}</p>}</section>
    </div>
  );
}
