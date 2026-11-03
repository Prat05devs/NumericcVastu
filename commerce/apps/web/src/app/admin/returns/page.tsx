'use client';
import Link from 'next/link';
import {useResource, Loading, Table, Action} from '@/components/admin/kit';
import {dateTime, label} from '@/lib/format';

type R = {id: string; orderId: string; status: string; reason: string; requestedAt: string; order: {publicCode: string; status: string}};
const NEXT: Record<string, string[]> = {REQUESTED: ['APPROVED', 'REJECTED'], APPROVED: ['RECEIVED', 'CLOSED'], RECEIVED: ['CLOSED'], REJECTED: ['CLOSED'], REFUNDED: ['CLOSED']};
export default function Returns() {
  const {data, error, loading, reload} = useResource<R[]>('/admin/returns');
  return (
    <div className="stack"><h1>Returns</h1><p className="muted small">Refund separately from the order page once the item is received. “Received + restock” puts sellable items back in stock.</p>
      <Loading error={error} loading={loading} />
      <Table rows={data} cols={[['Order', (r) => <Link href={`/admin/orders/${r.orderId}`}>{r.order.publicCode}</Link>], ['Requested', (r) => dateTime(r.requestedAt)], ['Reason', (r) => r.reason], ['Status', (r) => label(r.status)],
        ['Actions', (r) => <div className="row">{(NEXT[r.status] ?? []).map((s) => <Action key={s} label={label(s)} className="btn small ghost" method="PATCH" path={`/admin/returns/${r.id}`} body={() => ({status: s, note: prompt(`Note for ${label(s)}`) ?? label(s)})} onDone={reload} />)}
          {r.status === 'APPROVED' && <Action label="Received + restock" className="btn small" method="PATCH" path={`/admin/returns/${r.id}`} body={{status: 'RECEIVED', restock: true, note: 'Received in sellable condition'}} onDone={reload} />}</div>]]} />
    </div>
  );
}
