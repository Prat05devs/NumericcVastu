'use client';
import {Suspense} from 'react';
import {useEffect, useRef, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {call, newKey, post} from '@/lib/client';
import {date, inr, label} from '@/lib/format';
import {saveOrderToken} from '@/lib/orders';

type Req = {referenceCode: string; status: string; notes: string; details: {preferredStyle: string; requirements: string}; quotes: {version: number; status: string; totalPaise: string; expiresAt: string; terms: string; orderId: string | null; items: {description: string; qty: number; unitPaise: string; taxPaise: string}[]}[]};

function RequestStatusInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [ref, setRef] = useState(sp.get('ref') ?? '');
  const [token, setToken] = useState(sp.get('t') ?? '');
  const [req, setReq] = useState<Req | null>(null);
  const [err, setErr] = useState('');
  const key = useRef(newKey());
  async function load(r = ref, t = token) {
    const res = await call<Req>('GET', `/custom-requests/${encodeURIComponent(r)}`, undefined, t ? {'X-Request-Token': t} : {});
    if (res.ok) setReq(res.data); else setErr(res.error.message);
  }
  useEffect(() => {
    const r = sp.get('ref'); if (!r) return;
    const t = sp.get('t') ?? localStorage.getItem(`sc_req_${r}`) ?? '';
    setToken(t); void load(r, t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function accept(version: number) {
    if (!confirm('Accept this quotation? You will then be asked to pay.')) return;
    const r = await post<{orderId: string; orderAccessToken: string}>(`/custom-requests/${ref}/accept-quote`, {version, acceptTerms: true}, {'X-Request-Token': token, 'Idempotency-Key': key.current});
    if (!r.ok) return setErr(r.error.message);
    saveOrderToken(r.data.orderId, r.data.orderAccessToken);
    router.push(`/orders/${r.data.orderId}`);
  }
  return (
    <div className="wrap" style={{marginTop: '2rem', maxWidth: 760}}>
      <h1>Your wristwatch request</h1>
      {!req && (
        <form className="card pad" onSubmit={(e) => { e.preventDefault(); void load(); }}>
          <div className="field"><label htmlFor="ref">Reference</label><input id="ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="NVW-…" required /></div>
          <div className="field"><label htmlFor="tok">Access code (from your email link)</label><input id="tok" value={token} onChange={(e) => setToken(e.target.value)} /></div>
          <button className="btn">View</button>
        </form>
      )}
      {err && <p className="err" role="alert">{err}</p>}
      {req && (
        <div className="stack">
          <p>Reference <strong>{req.referenceCode}</strong> · Status: <span className="badge">{label(req.status)}</span></p>
          {req.notes && <div className="alert info">{req.notes}</div>}
          {req.quotes.length === 0 && <p className="muted">We are reviewing your request. You will receive an email when your quotation is ready.</p>}
          {req.quotes.map((q) => (
            <div key={q.version} className="card pad stack">
              <div className="row spread"><h2>Quotation v{q.version}</h2><span className="badge">{label(q.status)}</span></div>
              <table className="data"><tbody>{q.items.map((i, n) => <tr key={n}><td>{i.description} × {i.qty}</td><td>{inr((BigInt(i.unitPaise) * BigInt(i.qty)).toString())}</td><td className="small muted">tax {inr(i.taxPaise)}</td></tr>)}</tbody></table>
              <p><strong>Total {inr(q.totalPaise)}</strong> · valid until {date(q.expiresAt)}</p>
              <p className="small" style={{whiteSpace: 'pre-wrap'}}>{q.terms}</p>
              {q.status === 'SENT' && req.status === 'QUOTED' && <button className="btn" onClick={() => accept(q.version)}>Accept and pay</button>}
              {q.orderId && <a className="btn ghost" href={`/orders/${q.orderId}`}>View order</a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RequestStatus() {
  return <Suspense fallback={<div className="wrap" style={{marginTop: '2rem'}}><p>Loading…</p></div>}><RequestStatusInner /></Suspense>;
}
