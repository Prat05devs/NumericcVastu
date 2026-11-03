'use client';
import Link from 'next/link';
import {useResource, Loading, Table} from '@/components/admin/kit';
import {dateTime, label} from '@/lib/format';

type R = {id: string; referenceCode: string; status: string; budgetBand: string; createdAt: string; _count: {quotations: number}};
export default function Requests() {
  const {data, error, loading} = useResource<R[]>('/admin/custom-requests');
  return <div className="stack"><h1>Made-to-order wristwatch requests</h1><p className="muted small">Personal details stay encrypted; opening a request is recorded in the audit log.</p><Loading error={error} loading={loading} />
    <Table rows={data} cols={[['Reference', (r) => <Link href={`/admin/requests/${r.id}`}>{r.referenceCode}</Link>], ['Received', (r) => dateTime(r.createdAt)], ['Budget', (r) => label(r.budgetBand)], ['Quotes', (r) => r._count.quotations], ['Status', (r) => <span className="badge">{label(r.status)}</span>]]} /></div>;
}
