'use client';
import {useState} from 'react';
import {useResource, Loading, Table} from '@/components/admin/kit';
import {get} from '@/lib/client';
import {inr} from '@/lib/format';

type Row = {day: string; orders: number; grossPaise: string; discountPaise: string; shippingPaise: string; taxPaise: string; refundedPaise: string};
const iso = (d: Date) => d.toISOString().slice(0, 10);
export default function Reports() {
  const [range, setRange] = useState({from: iso(new Date(Date.now() - 30 * 86_400_000)), to: iso(new Date())});
  const {data, error, loading} = useResource<Row[]>(`/admin/reports/sales?from=${range.from}&to=${range.to}`);
  const sum = (k: keyof Row) => (data ?? []).reduce((s, r) => s + BigInt(r[k] as string), 0n).toString();
  async function csv() {
    const r = await get<string>(`/admin/reports/sales?from=${range.from}&to=${range.to}&format=csv`);
    if (r.ok) Object.assign(document.createElement('a'), {href: URL.createObjectURL(new Blob([r.data], {type: 'text/csv'})), download: `sales-${range.from}-${range.to}.csv`}).click();
  }
  return (
    <div className="stack"><h1>Sales report</h1>
      <div className="row"><label className="row" style={{fontWeight: 400}}>From <input type="date" value={range.from} onChange={(e) => setRange({...range, from: e.target.value})} /></label><label className="row" style={{fontWeight: 400}}>To <input type="date" value={range.to} onChange={(e) => setRange({...range, to: e.target.value})} /></label><button className="btn small ghost" onClick={csv}>Download CSV</button></div>
      <Loading error={error} loading={loading} />
      {data && <div className="kpis"><div className="kpi"><b>{data.reduce((s, r) => s + r.orders, 0)}</b>Paid orders</div><div className="kpi"><b>{inr(sum('grossPaise'))}</b>Gross</div><div className="kpi"><b>{inr(sum('discountPaise'))}</b>Discounts</div><div className="kpi"><b>{inr(sum('taxPaise'))}</b>Tax collected</div><div className="kpi"><b>{inr(sum('refundedPaise'))}</b>Refunded</div></div>}
      <Table rows={data} cols={[['Day', (r) => r.day], ['Orders', (r) => r.orders], ['Gross', (r) => inr(r.grossPaise)], ['Discounts', (r) => inr(r.discountPaise)], ['Delivery', (r) => inr(r.shippingPaise)], ['Tax', (r) => inr(r.taxPaise)], ['Refunded', (r) => inr(r.refundedPaise)]]} empty="No paid orders in this range." />
    </div>
  );
}
