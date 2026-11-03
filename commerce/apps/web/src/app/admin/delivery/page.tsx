'use client';
import {useResource, Loading, Table, Action} from '@/components/admin/kit';
import {date} from '@/lib/format';

type F = {byCourier: Record<string, {count: number; average: number; onTimeRate: number | null}>; items: {id: string; orderCode: string; rating: number; onTime: boolean | null; packagingOk: boolean | null; comment: string | null; status: string; createdAt: string; shipment: {courier: string} | null}[]};
const yn = (v: boolean | null) => (v === null ? '—' : v ? 'Yes' : 'No');
export default function Delivery() {
  const {data, error, loading, reload} = useResource<F>('/admin/delivery-feedback');
  return (
    <div className="stack"><h1>Delivery feedback</h1><p className="muted small">Customers can rate the delivery once an order is delivered. Use this to compare couriers.</p>
      <Loading error={error} loading={loading} />
      {data && <>
        <div className="kpis">{Object.entries(data.byCourier).map(([c, s]) => <div key={c} className="kpi"><b>{s.average}★</b>{c} · {s.count} ratings{s.onTimeRate !== null ? ` · ${Math.round(s.onTimeRate * 100)}% on time` : ''}</div>)}</div>
        <Table rows={data.items} cols={[['Date', (f) => date(f.createdAt)], ['Order', (f) => f.orderCode], ['Courier', (f) => f.shipment?.courier ?? '—'], ['Rating', (f) => `${f.rating}★`], ['On time', (f) => yn(f.onTime)], ['Packaging OK', (f) => yn(f.packagingOk)], ['Comment', (f) => f.comment ?? ''], ['', (f) => f.status === 'NEW' ? <Action label="Mark reviewed" className="btn small ghost" method="PATCH" path={`/admin/delivery-feedback/${f.id}`} body={{status: 'REVIEWED'}} onDone={reload} /> : 'Reviewed']]} />
      </>}
    </div>
  );
}
