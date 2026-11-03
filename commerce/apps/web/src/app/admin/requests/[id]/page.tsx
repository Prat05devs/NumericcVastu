'use client';
import {use, useState} from 'react';
import {useResource, Loading, Action, Table} from '@/components/admin/kit';
import {date, inr, label, rupeesToPaise} from '@/lib/format';

type R = {id: string; referenceCode: string; status: string; budgetBand: string; publicNotes: string; details: Record<string, string | null>; quotations: {version: number; status: string; totalPaise: string; expiresAt: string; orderId: string | null; items: {description: string; qty: number; unitPaise: string; taxPaise: string}[]}[]};
const NEXT: Record<string, string[]> = {REQUESTED: ['REVIEWING', 'DECLINED', 'CANCELLED'], REVIEWING: ['DECLINED', 'CANCELLED'], QUOTED: ['DECLINED', 'CANCELLED'], IN_PROGRESS: ['COMPLETED', 'REFUND_REVIEW'], REFUND_REVIEW: ['IN_PROGRESS', 'CANCELLED']};

export default function RequestDetail({params}: {params: Promise<{id: string}>}) {
  const {id} = use(params);
  const {data: r, error, loading, reload} = useResource<R>(`/admin/custom-requests/${id}`);
  const [items, setItems] = useState([{description: '', qty: 1, rupees: '', taxRupees: '0'}]);
  const [validDays, setValidDays] = useState(7);
  const [terms, setTerms] = useState('Made to order. Production starts after payment. Delivery timeline and care instructions are confirmed in writing.');
  if (!r) return <Loading error={error} loading={loading} />;
  const canQuote = ['REVIEWING', 'QUOTED'].includes(r.status);
  return (
    <div className="stack">
      <div className="row spread"><h1>{r.referenceCode}</h1><span className="badge">{label(r.status)}</span></div>
      <div className="card"><h2>Request</h2><table className="specs"><tbody>{Object.entries(r.details).map(([k, v]) => <tr key={k}><th>{label(k)}</th><td style={{whiteSpace: 'pre-wrap'}}>{v ?? '—'}</td></tr>)}<tr><th>Budget</th><td>{label(r.budgetBand)}</td></tr></tbody></table></div>
      <div className="row">{(NEXT[r.status] ?? []).map((s) => <Action key={s} label={label(s)} className="btn small ghost" method="PATCH" path={`/admin/custom-requests/${r.id}/status`} body={() => ({status: s, note: prompt('Message shown to the customer (optional)') || undefined})} onDone={reload} />)}</div>
      {r.quotations.map((q) => <div key={q.version} className="card"><h3>Quotation v{q.version} · {label(q.status)} · {inr(q.totalPaise)} · valid until {date(q.expiresAt)}</h3><Table rows={q.items} cols={[['Item', (i) => i.description], ['Qty', (i) => i.qty], ['Unit', (i) => inr(i.unitPaise)], ['Tax', (i) => inr(i.taxPaise)]]} />{q.orderId && <a href={`/admin/orders/${q.orderId}`}>Order →</a>}</div>)}
      {canQuote && (
        <div className="card stack"><h2>{r.quotations.length ? 'Send a revised quotation' : 'Send a quotation'}</h2>
          {items.map((it, i) => (
            <div key={i} className="rows"><div className="rowedit">
              <label>Description<input value={it.description} onChange={(e) => setItems(items.map((x, j) => (j === i ? {...x, description: e.target.value} : x)))} /></label>
              <label>Qty<input type="number" min={1} value={it.qty} onChange={(e) => setItems(items.map((x, j) => (j === i ? {...x, qty: Number(e.target.value)} : x)))} /></label>
              <label>Unit price (₹)<input inputMode="decimal" value={it.rupees} onChange={(e) => setItems(items.map((x, j) => (j === i ? {...x, rupees: e.target.value} : x)))} /></label>
              <label>Tax (₹)<input inputMode="decimal" value={it.taxRupees} onChange={(e) => setItems(items.map((x, j) => (j === i ? {...x, taxRupees: e.target.value} : x)))} /></label>
            </div></div>
          ))}
          <button className="btn small ghost" onClick={() => setItems([...items, {description: '', qty: 1, rupees: '', taxRupees: '0'}])}>Add line</button>
          <label>Valid for (days)<input type="number" min={1} max={60} value={validDays} onChange={(e) => setValidDays(Number(e.target.value))} style={{maxWidth: 120}} /></label>
          <label>Terms<textarea value={terms} onChange={(e) => setTerms(e.target.value)} /></label>
          <Action label="Send quotation" path={`/admin/custom-requests/${r.id}/quotes`} body={() => ({items: items.map((i) => ({description: i.description, qty: i.qty, unitPaise: rupeesToPaise(i.rupees) ?? '0', taxPaise: rupeesToPaise(i.taxRupees) ?? '0'})), validDays, terms})} onDone={(x) => x.ok && reload()} />
        </div>
      )}
    </div>
  );
}
