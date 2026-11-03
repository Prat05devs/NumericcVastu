'use client';
import {useCallback, useEffect, useState} from 'react';
import Link from 'next/link';
import {call, get, post} from '@/lib/client';
import {date, inr, label} from '@/lib/format';
import {OtpLogin} from '@/components/forms/OtpLogin';

type Me = {name: string; status: string; commission: {type: string; percentBp?: number; amountPaise?: string}; attributionDays: number; canCreateLinks: boolean; payout: {hasDetails: boolean; hint: string | null; minPayoutPaise: string | null; holdDays: number | null}; terms: {required: string | null; accepted: string | null; pageSlug: string | null; needsAcceptance: boolean}};
type Summary = {clicks: number; uniqueClicks: number; orders: number; conversionRate: number; salesPaise: string; earnedPaise: string; balances: {pendingPaise: string; approvedPaise: string; paidPaise: string}};
type LinkRow = {id: string; label: string; targetPath: string; shareUrl: string; active: boolean; coupon: {code: string; description: string} | null; clicks: number; orders: number};
type Commission = {id: string; date: string; order: string; via: string; link: string | null; salesPaise: string; commissionPaise: string; status: string; availableFrom: string | null; note: string | null};
type Payout = {id: string; grossPaise: string; tdsPaise: string; netPaise: string; status: string; method: string | null; reference: string | null; paidAt: string | null; createdAt: string};

const rule = (c: Me['commission']) => (c.type === 'PERCENT' ? `${(c.percentBp ?? 0) / 100}% of each sale` : c.type === 'FIXED' ? `${inr(c.amountPaise)} per sale` : 'No commission');

export default function PartnerPortal() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [range, setRange] = useState({from: '', to: ''});
  const load = useCallback(async () => {
    const r = await get<Me>('/partner/me');
    if (!r.ok) { setMe(null); if (r.status === 403) setError(r.error.message); return; }
    setMe(r.data); setError('');
    const q = new URLSearchParams(Object.entries(range).filter(([, v]) => v));
    const [s, l, c, p] = await Promise.all([get<Summary>(`/partner/summary?${q}`), get<LinkRow[]>('/partner/links'), get<Commission[]>('/partner/commissions'), get<Payout[]>('/partner/payouts')]);
    if (s.ok) setSummary(s.data); if (l.ok) setLinks(l.data); if (c.ok) setCommissions(c.data); if (p.ok) setPayouts(p.data);
  }, [range]);
  useEffect(() => { void load(); }, [load]);

  if (me === undefined) return <p>Loading…</p>;
  if (me === null) return (
    <div className="stack">
      <h1>Partner programme</h1>
      <p>For creators and affiliates we have invited. Sign in with the email your invitation was sent to.</p>
      {error && <div className="alert warn">{error}</div>}
      <OtpLogin title="Partner sign-in" onSignedIn={load} />
    </div>
  );
  if (me.terms.needsAcceptance) return <Terms me={me} onDone={load} />;
  return (
    <div className="stack">
      <div className="row spread"><h1>Hi {me.name}</h1><span className="badge">{label(me.status)}</span></div>
      {me.status === 'SUSPENDED' && <div className="alert bad">Your partner account is paused. Links are not tracking. Please contact us.</div>}
      <p className="muted">You earn {rule(me.commission)} on what customers pay for products (after discounts; excluding delivery and tax). Visits are credited to you for {me.attributionDays} days after someone clicks your link (the most recent partner link wins). Earnings stay pending until the return window passes{me.payout.holdDays !== null ? ` (${me.payout.holdDays} days after delivery)` : ''}, then become available for payout.</p>
      <form className="row" onSubmit={(e) => { e.preventDefault(); void load(); }}>
        <label className="row" style={{fontWeight: 400}}>From <input type="date" value={range.from} onChange={(e) => setRange({...range, from: e.target.value})} /></label>
        <label className="row" style={{fontWeight: 400}}>To <input type="date" value={range.to} onChange={(e) => setRange({...range, to: e.target.value})} /></label>
        <button className="btn small">Update</button>
      </form>
      {summary && (
        <div className="kpis">
          <div className="kpi"><b>{summary.uniqueClicks}</b>Unique visits</div>
          <div className="kpi"><b>{summary.orders}</b>Orders</div>
          <div className="kpi"><b>{summary.conversionRate}%</b>Conversion</div>
          <div className="kpi"><b>{inr(summary.salesPaise)}</b>Sales</div>
          <div className="kpi"><b>{inr(summary.balances.pendingPaise)}</b>Pending</div>
          <div className="kpi"><b>{inr(summary.balances.approvedPaise)}</b>Available</div>
          <div className="kpi"><b>{inr(summary.balances.paidPaise)}</b>Paid out</div>
        </div>
      )}
      <Links me={me} links={links} reload={load} />
      <section><h2>Earnings</h2>{commissions.length ? (
        <div className="tablewrap"><table className="data"><thead><tr><th>Date</th><th>Order</th><th>Via</th><th>Sale</th><th>Commission</th><th>Status</th></tr></thead><tbody>
          {commissions.map((c) => <tr key={c.id}><td>{date(c.date)}</td><td>{c.order}</td><td>{c.via === 'LINK' ? c.link ?? 'Link' : 'Your coupon'}</td><td>{inr(c.salesPaise)}</td><td>{inr(c.commissionPaise)}</td><td>{label(c.status)}{c.availableFrom ? <div className="small muted">available from {date(c.availableFrom)} if delivered</div> : null}{c.note ? <div className="small muted">{c.note}</div> : null}</td></tr>)}
        </tbody></table></div>) : <p className="muted">No sales yet — share your link to get started.</p>}</section>
      <Payouts me={me} payouts={payouts} reload={load} />
    </div>
  );
}

function Terms({me, onDone}: {me: Me; onDone: () => void}) {
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState('');
  return (
    <div className="card stack" style={{maxWidth: 640}}>
      <h1>Welcome, {me.name}</h1>
      <p>Before your links go live, please read and accept the partner terms (version {me.terms.required}).</p>
      {me.terms.pageSlug && <p><Link href={`/policies/${me.terms.pageSlug}`} target="_blank">Read the partner terms ↗</Link></p>}
      <p className="small muted">Key points: disclose that you are a paid partner when you share links (#ad / #paidpartnership); do not promise health, wealth or other outcomes; do not bid on our brand name in ads; self-purchases earn no commission.</p>
      <label className="check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> <span>I have read and accept the partner terms.</span></label>
      {err && <p className="err">{err}</p>}
      <button className="btn" disabled={!agree} onClick={async () => { const r = await post('/partner/terms', {termsVersion: me.terms.required, accept: true}); if (r.ok) onDone(); else setErr(r.error.message); }}>Accept and continue</button>
    </div>
  );
}

function Links({me, links, reload}: {me: Me; links: LinkRow[]; reload: () => void}) {
  const [path, setPath] = useState('/');
  const [labelText, setLabel] = useState('');
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState('');
  return (
    <section className="stack">
      <h2>Your links</h2>
      <div className="tablewrap"><table className="data"><thead><tr><th>Link</th><th>Goes to</th><th>Coupon</th><th>Visits</th><th>Orders</th><th /></tr></thead><tbody>
        {links.map((l) => (
          <tr key={l.id}>
            <td><code className="small">{l.shareUrl}</code><div className="small muted">{l.label}</div></td><td>{l.targetPath}</td><td>{l.coupon ? <><strong>{l.coupon.code}</strong><div className="small muted">{l.coupon.description}</div></> : '—'}</td><td>{l.clicks}</td><td>{l.orders}</td>
            <td className="row"><button className="btn small" onClick={async () => { await navigator.clipboard.writeText(l.shareUrl); setCopied(l.id); }}>{copied === l.id ? 'Copied' : 'Copy'}</button><button className="btn small ghost" onClick={async () => { await call('PATCH', `/partner/links/${l.id}`, {active: !l.active}); reload(); }}>{l.active ? 'Pause' : 'Resume'}</button></td>
          </tr>
        ))}
      </tbody></table></div>
      {me.canCreateLinks && me.status === 'ACTIVE' && (
        <form className="card row" onSubmit={async (e) => { e.preventDefault(); const r = await post('/partner/links', {targetPath: path, label: labelText}); if (r.ok) { setLabel(''); reload(); } else setErr(r.error.message); }}>
          <label style={{flex: 1}}>Page on the shop<input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/rudraksha or /products/…" /></label>
          <label style={{flex: 1}}>Label (for you)<input value={labelText} onChange={(e) => setLabel(e.target.value)} placeholder="Instagram bio, reel 12…" /></label>
          <button className="btn">Create link</button>
          {err && <p className="err" style={{width: '100%'}}>{err}</p>}
        </form>
      )}
    </section>
  );
}

function Payouts({me, payouts, reload}: {me: Me; payouts: Payout[]; reload: () => void}) {
  const [f, setF] = useState({method: 'UPI', accountName: '', upiId: '', accountNumber: '', ifsc: '', pan: ''});
  const [msg, setMsg] = useState('');
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body = f.method === 'UPI' ? {method: 'UPI', accountName: f.accountName, upiId: f.upiId, ...(f.pan && {pan: f.pan})} : {method: 'BANK', accountName: f.accountName, accountNumber: f.accountNumber, ifsc: f.ifsc, ...(f.pan && {pan: f.pan})};
    const r = await call<{hint: string}>('PUT', '/partner/payout-details', body);
    setMsg(r.ok ? `Saved: ${r.data.hint}` : r.error.message); if (r.ok) reload();
  }
  return (
    <section className="stack">
      <h2>Payouts</h2>
      {payouts.length ? <table className="data"><thead><tr><th>Created</th><th>Gross</th><th>Tax deducted</th><th>Net</th><th>Status</th><th>Reference</th></tr></thead><tbody>{payouts.map((p) => <tr key={p.id}><td>{date(p.createdAt)}</td><td>{inr(p.grossPaise)}</td><td>{inr(p.tdsPaise)}</td><td>{inr(p.netPaise)}</td><td>{label(p.status)}</td><td>{p.reference ?? '—'}{p.paidAt ? <div className="small muted">{date(p.paidAt)}</div> : null}</td></tr>)}</tbody></table> : <p className="muted">No payouts yet.{me.payout.minPayoutPaise ? ` Payouts are made once your available balance reaches ${inr(me.payout.minPayoutPaise)}.` : ''}</p>}
      <form className="card" onSubmit={save}>
        <h3>Payout details</h3>
        <p className="small muted">{me.payout.hasDetails ? `Current: ${me.payout.hint}. ` : ''}Stored encrypted; we only ever show the last few characters. Tax may be deducted at source as required by law; add your PAN to avoid delays.</p>
        <div className="row"><label className="check"><input type="radio" checked={f.method === 'UPI'} onChange={() => setF({...f, method: 'UPI'})} /> UPI</label><label className="check"><input type="radio" checked={f.method === 'BANK'} onChange={() => setF({...f, method: 'BANK'})} /> Bank account</label></div>
        <div className="field"><label htmlFor="an">Account holder name</label><input id="an" value={f.accountName} onChange={(e) => setF({...f, accountName: e.target.value})} required /></div>
        {f.method === 'UPI' ? <div className="field"><label htmlFor="upi">UPI ID</label><input id="upi" value={f.upiId} onChange={(e) => setF({...f, upiId: e.target.value})} placeholder="name@bank" required /></div> : (
          <div className="grid" style={{gridTemplateColumns: '1fr 1fr'}}>
            <div className="field"><label htmlFor="ac">Account number</label><input id="ac" inputMode="numeric" value={f.accountNumber} onChange={(e) => setF({...f, accountNumber: e.target.value})} required /></div>
            <div className="field"><label htmlFor="ifsc">IFSC</label><input id="ifsc" value={f.ifsc} onChange={(e) => setF({...f, ifsc: e.target.value})} required /></div>
          </div>
        )}
        <div className="field"><label htmlFor="pan">PAN (recommended)</label><input id="pan" value={f.pan} onChange={(e) => setF({...f, pan: e.target.value})} placeholder="ABCDE1234F" /></div>
        {msg && <p className="small" role="status">{msg}</p>}
        <button className="btn">Save payout details</button>
      </form>
    </section>
  );
}
