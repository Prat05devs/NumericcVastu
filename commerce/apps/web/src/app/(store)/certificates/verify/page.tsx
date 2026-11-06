'use client';
import {Suspense} from 'react';
import {useEffect, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {get} from '@/lib/client';
import {date} from '@/lib/format';

type Cert = {issuer: string; reportNo: string; reportType: string; issuedOn: string | null; product: {title: string; slug: string}; sku: string; disclosure: Record<string, string>; isDemo: boolean};
function VerifyInner() {
  const sp = useSearchParams();
  const [no, setNo] = useState(sp.get('reportNo') ?? '');
  const [cert, setCert] = useState<Cert | null>(null);
  const [err, setErr] = useState('');
  async function check(n = no) { setErr(''); const r = await get<Cert>(`/certificates/verify/${encodeURIComponent(n)}`); if (r.ok) setCert(r.data); else { setCert(null); setErr(r.error.message); } }
  useEffect(() => { if (sp.get('reportNo')) void check(sp.get('reportNo')!); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="wrap" style={{marginTop: '2rem', maxWidth: 720}}>
      <h1>Verify a lab report</h1>
      <p className="muted">Only reports our team has checked against the issuing laboratory are shown here.</p>
      <form className="row" onSubmit={(e) => { e.preventDefault(); void check(); }}><input aria-label="Report number" value={no} onChange={(e) => setNo(e.target.value)} placeholder="Report number" required style={{flex: 1}} /><button className="btn">Verify</button></form>
      {err && <p className="err" role="alert" style={{marginTop: '1rem'}}>{err}</p>}
      {cert && (
        <div className="card pad" style={{marginTop: '1rem'}}>
          {cert.isDemo && <p className="badge demo">Demo record</p>}
          <p><strong>{cert.issuer}</strong> — {cert.reportType} no. {cert.reportNo}{cert.issuedOn ? `, issued ${date(cert.issuedOn)}` : ''}</p>
          <p>For: <Link href={`/products/${cert.product.slug}`}>{cert.product.title}</Link> (SKU {cert.sku})</p>
          {Object.keys(cert.disclosure).length > 0 && <table className="specs"><tbody>{Object.entries(cert.disclosure).map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody></table>}
        </div>
      )}
    </div>
  );
}

export default function Verify() {
  return <Suspense fallback={<div className="wrap" style={{marginTop: '2rem'}}><p>Loading…</p></div>}><VerifyInner /></Suspense>;
}
