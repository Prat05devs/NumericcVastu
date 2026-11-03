'use client';
import {useState} from 'react';
import {useResource, Loading, Table, Action} from '@/components/admin/kit';
import {useCan} from '@/components/admin/Shell';
import {post} from '@/lib/client';
import {date, label} from '@/lib/format';

type Cert = {id: string; issuer: string; reportNo: string; reportType: string; issuedOn: string | null; verifiedStatus: string; evidenceNote: string; objectKey: string | null; variant: {sku: string; product: {title: string}}};
type P = {id: string; title: string; variants: {id: string; sku: string; title: string}[]};

export default function Certificates() {
  const can = useCan();
  const {data, error, loading, reload} = useResource<Cert[]>('/admin/certificates');
  const {data: products} = useResource<P[]>('/admin/products');
  const [f, setF] = useState({productId: '', variantId: '', issuer: '', reportNo: '', reportType: '', issuedOn: '', evidenceNote: ''});
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState('');
  async function register(e: React.FormEvent) {
    e.preventDefault(); setMsg('');
    let objectKey: string | undefined;
    if (file) {
      const pre = await post<{url: string; headers: Record<string, string>; objectKey: string}>(`/admin/products/${f.productId}/media/presign`, {contentType: 'application/pdf', purpose: 'certificate'});
      if (!pre.ok) return setMsg(pre.error.message);
      const local = pre.data.url.includes('/api/v1/admin/uploads/');
      const csrf = decodeURIComponent(document.cookie.split('; ').find((c) => c.startsWith('sc_csrf='))?.slice(8) ?? '');
      const put = await fetch(local ? pre.data.url.slice(pre.data.url.indexOf('/api/v1/')) : pre.data.url, {method: 'PUT', body: file, headers: {...pre.data.headers, ...(local && {'X-CSRF-Token': csrf})}, credentials: local ? 'include' : 'omit'});
      if (!put.ok) return setMsg('Upload failed.');
      objectKey = pre.data.objectKey;
    }
    const r = await post('/admin/certificates', {variantId: f.variantId, issuer: f.issuer, reportNo: f.reportNo, reportType: f.reportType, issuedOn: f.issuedOn, evidenceNote: f.evidenceNote, ...(objectKey && {objectKey})});
    setMsg(r.ok ? 'Registered as unverified. Verify it against the issuer before it is shown.' : r.error.message);
    if (r.ok) reload();
  }
  const product = products?.find((p) => p.id === f.productId);
  return (
    <div className="stack"><h1>Lab reports & certificates</h1>
      <div className="alert info small">Register only real reports from the issuing laboratory. A report is shown to customers only after someone checks it against the issuer (number, weight, photo) and marks it verified. Never mark a product “Certified” without this.</div>
      <Loading error={error} loading={loading} />
      <Table rows={data} cols={[['Item', (c) => `${c.variant.product.title} (${c.variant.sku})`], ['Issuer', (c) => c.issuer], ['Report', (c) => `${c.reportType} ${c.reportNo}`], ['Issued', (c) => date(c.issuedOn)], ['Document', (c) => (c.objectKey ? 'Uploaded' : <span className="err">Missing</span>)], ['Status', (c) => <span className="badge">{label(c.verifiedStatus)}</span>],
        ['', (c) => can('certificates.write') && c.verifiedStatus === 'UNVERIFIED' ? <div className="row"><Action label="Mark verified" path={`/admin/certificates/${c.id}/decision`} body={() => ({decision: 'VERIFIED', note: prompt('How did you verify it? (e.g. matched on the issuer website)') ?? ''})} onDone={reload} /><Action label="Reject" className="btn small ghost" path={`/admin/certificates/${c.id}/decision`} body={() => ({decision: 'REJECTED', note: prompt('Reason') ?? ''})} onDone={reload} /></div> : null]]} />
      {can('certificates.write') && products && (
        <form className="card stack" onSubmit={register}><h2>Register a report</h2>
          <div className="grid" style={{gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))'}}>
            <label>Product<select value={f.productId} onChange={(e) => setF({...f, productId: e.target.value, variantId: ''})} required><option value="">Choose…</option>{products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
            <label>Variant<select value={f.variantId} onChange={(e) => setF({...f, variantId: e.target.value})} required><option value="">Choose…</option>{product?.variants.map((v) => <option key={v.id} value={v.id}>{v.sku}</option>)}</select></label>
            <label>Issuing laboratory<input value={f.issuer} onChange={(e) => setF({...f, issuer: e.target.value})} required /></label>
            <label>Report number<input value={f.reportNo} onChange={(e) => setF({...f, reportNo: e.target.value})} required /></label>
            <label>Report type<input value={f.reportType} onChange={(e) => setF({...f, reportType: e.target.value})} placeholder="e.g. Gemstone identification" required /></label>
            <label>Issued on<input type="date" value={f.issuedOn} onChange={(e) => setF({...f, issuedOn: e.target.value})} required /></label>
          </div>
          <label>Report PDF (kept private)<input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
          <label>Evidence note<textarea value={f.evidenceNote} onChange={(e) => setF({...f, evidenceNote: e.target.value})} placeholder="Original report received with the stone; weight matches" required /></label>
          {msg && <p className="small" role="status">{msg}</p>}
          <div><button className="btn">Register (unverified)</button></div>
        </form>
      )}
    </div>
  );
}
