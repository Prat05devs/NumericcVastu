'use client';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {Suspense, useState} from 'react';
import {useResource, Loading, Table} from '@/components/admin/kit';
import {dateTime, inr, label} from '@/lib/format';

type Row = {id: string; publicCode: string; email: string; status: string; paymentStatus: string; totalPaise: string; createdAt: string; customRequestId: string | null; affiliateLinkId: string | null};
const STATUSES = ['', 'AWAITING_PAYMENT', 'PAYMENT_FAILED', 'PAID', 'PAID_REVIEW', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'RETURN_REQUESTED', 'RETURNED', 'CANCELLED', 'REFUNDED'];

function Orders() {
  const sp = useSearchParams();
  const [status, setStatus] = useState(sp.get('status') ?? '');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const {data, meta, error, loading} = useResource<Row[]>(`/admin/orders?page=${page}${status ? `&status=${status}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`);
  return (
    <div className="stack">
      <h1>Orders</h1>
      <div className="row">
        <select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={{maxWidth: 240}}>{STATUSES.map((s) => <option key={s} value={s}>{s ? label(s) : 'All statuses'}</option>)}</select>
        <input aria-label="Order code or email" placeholder="Order code or exact email" value={q} onChange={(e) => setQ(e.target.value)} style={{maxWidth: 280}} />
      </div>
      <Loading error={error} loading={loading} />
      <Table rows={data} cols={[
        ['Order', (r) => <Link href={`/admin/orders/${r.id}`}>{r.publicCode}</Link>], ['Placed', (r) => dateTime(r.createdAt)], ['Customer', (r) => r.email],
        ['Status', (r) => <span className="badge">{label(r.status)}</span>], ['Payment', (r) => label(r.paymentStatus)], ['Total', (r) => inr(r.totalPaise)],
        ['', (r) => <>{r.customRequestId && <span className="badge grey">Made to order</span>} {r.affiliateLinkId && <span className="badge grey">Partner</span>}</>],
      ]} />
      <div className="row"><button className="btn small ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span className="small">Page {page} · {String(meta['total'] ?? '')} orders</span><button className="btn small ghost" disabled={(data?.length ?? 0) < 50} onClick={() => setPage(page + 1)}>Next</button></div>
    </div>
  );
}
export default function Page() { return <Suspense><Orders /></Suspense>; }
