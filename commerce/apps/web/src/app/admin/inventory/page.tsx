'use client';
import Link from 'next/link';
import {useState} from 'react';
import {useResource, Loading, Table, Action} from '@/components/admin/kit';
import {useCan} from '@/components/admin/Shell';

type Row = {variantId: string; sku: string; title: string; productId: string; productStatus: string; isDemo: boolean; onHand: number; reserved: number; available: number; version: number; low: boolean};
const REASONS = ['RECEIPT', 'ADJUSTMENT', 'DAMAGE', 'CORRECTION', 'RETURN_RESTOCK'];
export default function Inventory() {
  const can = useCan();
  const [q, setQ] = useState('');
  const [low, setLow] = useState(false);
  const {data, error, loading, reload} = useResource<Row[]>(`/admin/inventory?${new URLSearchParams({...(q && {q}), ...(low && {lowOnly: 'true'})})}`);
  const [adj, setAdj] = useState<Record<string, {delta: string; reason: string}>>({});
  const edit = (id: string, patch: Partial<{delta: string; reason: string}>) => setAdj({...adj, [id]: Object.assign({delta: '', reason: 'RECEIPT'}, adj[id], patch)});
  return (
    <div className="stack"><h1>Stock</h1><p className="muted small">Every change is recorded in the movement ledger. If a checkout changed the stock since you loaded the page, the change is refused — reload and try again. Stock cannot go below what is held for open orders.</p>
      <div className="row"><input aria-label="Search" placeholder="SKU or product" value={q} onChange={(e) => setQ(e.target.value)} style={{maxWidth: 260}} /><label className="check"><input type="checkbox" checked={low} onChange={(e) => setLow(e.target.checked)} /> Low stock only</label></div>
      <Loading error={error} loading={loading} />
      <Table rows={data} cols={[['SKU', (r) => r.sku], ['Item', (r) => <Link href={`/admin/products/${r.productId}`}>{r.title}</Link>], ['On hand', (r) => r.onHand], ['Held', (r) => r.reserved], ['Free', (r) => <span className={r.low ? 'err' : ''}>{r.available}</span>],
        ['Adjust', (r) => can('inventory.adjust') ? <div className="row" style={{gap: '.3rem'}}>
          <input aria-label="Change" style={{width: 70}} placeholder="+/−" value={adj[r.variantId]?.delta ?? ''} onChange={(e) => edit(r.variantId, {delta: e.target.value})} />
          <select aria-label="Reason" style={{width: 140}} value={adj[r.variantId]?.reason ?? 'RECEIPT'} onChange={(e) => edit(r.variantId, {reason: e.target.value})}>{REASONS.map((x) => <option key={x}>{x}</option>)}</select>
          <Action label="Apply" method="PATCH" path={`/admin/inventory/${r.variantId}`} body={() => ({delta: Number(adj[r.variantId]?.delta ?? 0), reason: adj[r.variantId]?.reason ?? 'RECEIPT', expectedVersion: r.version})} onDone={(x) => x.ok && reload()} />
        </div> : null]]} />
    </div>
  );
}
