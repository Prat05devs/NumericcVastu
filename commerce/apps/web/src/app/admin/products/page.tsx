'use client';
import Link from 'next/link';
import {useState} from 'react';
import {useResource, Loading, Table} from '@/components/admin/kit';
import {useCan} from '@/components/admin/Shell';
import {inr, label} from '@/lib/format';

type P = {id: string; title: string; slug: string; status: string; isDemo: boolean; category: {title: string}; media: number; variants: {sku: string; pricePaise: string; onHand: number; reserved: number}[]};
export default function Products() {
  const can = useCan();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const {data, error, loading} = useResource<P[]>(`/admin/products?${new URLSearchParams({...(q && {q}), ...(status && {status})})}`);
  return (
    <div className="stack">
      <div className="row spread"><h1>Products</h1>{can('catalogue.write') && <Link className="btn" href="/admin/products/new">New product</Link>}</div>
      <div className="row"><input aria-label="Search" placeholder="Title, slug or SKU" value={q} onChange={(e) => setQ(e.target.value)} style={{maxWidth: 280}} /><select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} style={{maxWidth: 180}}><option value="">All</option><option>DRAFT</option><option>PUBLISHED</option><option>ARCHIVED</option></select></div>
      <Loading error={error} loading={loading} />
      <Table rows={data} cols={[['Product', (p) => <><Link href={`/admin/products/${p.id}`}>{p.title}</Link>{p.isDemo && <> <span className="badge demo">DEMO</span></>}</>], ['Category', (p) => p.category.title], ['Status', (p) => <span className="badge">{label(p.status)}</span>],
        ['Variants', (p) => p.variants.map((v) => <div key={v.sku} className="small">{v.sku} · {inr(v.pricePaise)} · {v.onHand - v.reserved} free</div>)], ['Photos', (p) => p.media]]} />
    </div>
  );
}
