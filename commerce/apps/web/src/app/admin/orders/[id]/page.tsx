'use client';
import {use, useState} from 'react';
import {useResource, Loading, Action, Table} from '@/components/admin/kit';
import {useCan} from '@/components/admin/Shell';
import {dateTime, inr, label, rupeesToPaise} from '@/lib/format';

type O = {
  id: string; publicCode: string; email: string; status: string; paymentStatus: string; totalPaise: string; refundedPaise: string; subtotalPaise: string; discountPaise: string; shippingPaise: string; taxPaise: string; taxMode: string; paymentDueAt: string;
  lines: {id: string; skuSnapshot: string; titleSnapshot: string; qty: number; totalPaise: string}[]; addresses: {type: string; snapshotJson: Record<string, string>}[];
  payments: {id: string; provider: string; environment: string; status: string; amountPaise: string; providerCurrency: string; providerAmountMinor: string; providerPaymentId: string | null; failureReason: string | null}[];
  refunds: {id: string; amountPaise: string; status: string; reason: string; createdAt: string}[];
  shipments: {id: string; provider: string; courier: string; trackingNo: string; status: string; labelUrl: string | null; events: {status: string; occurredAt: string; location: string | null; applied: boolean}[]}[];
  events: {fromStatus: string | null; toStatus: string; reason: string | null; createdAt: string}[]; reservations: {variantId: string; qty: number; status: string; expiresAt: string}[];
  commission: {amountPaise: string; status: string; affiliate: {name: string}} | null;
  actions: {markProcessing: boolean; fulfill: boolean; cancelUnpaid: boolean; refund: boolean; approveReview: boolean; reconcile: boolean};
};
const SHIP_NEXT = ['PACKED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED'];

export default function OrderDetail({params}: {params: Promise<{id: string}>}) {
  const {id} = use(params);
  const can = useCan();
  const {data: o, error, loading, reload} = useResource<O>(`/admin/orders/${id}`);
  const [ship, setShip] = useState({provider: 'manual', courier: '', trackingNo: '', expectedBy: ''});
  const [refund, setRefund] = useState({rupees: '', reason: '', restock: false});
  const [note, setNote] = useState('');
  if (!o) return <Loading error={error} loading={loading} />;
  const ad = o.addresses.find((a) => a.type === 'SHIPPING')?.snapshotJson;
  const remaining = BigInt(o.totalPaise) - BigInt(o.refundedPaise);
  return (
    <div className="stack">
      <div className="row spread"><h1>Order {o.publicCode}</h1><span className="badge">{label(o.status)}</span></div>
      <div className="two">
        <section className="stack">
          <div className="card"><h2>Items</h2><Table rows={o.lines} cols={[['SKU', (l) => l.skuSnapshot], ['Item', (l) => l.titleSnapshot], ['Qty', (l) => l.qty], ['Total', (l) => inr(l.totalPaise)]]} />
            <p className="small">Subtotal {inr(o.subtotalPaise)} · discount {inr(o.discountPaise)} · delivery {inr(o.shippingPaise)} · tax {inr(o.taxPaise)} ({o.taxMode}) · <strong>total {inr(o.totalPaise)}</strong>{o.refundedPaise !== '0' ? ` · refunded ${inr(o.refundedPaise)}` : ''}</p>
          </div>
          {o.actions.fulfill && can('orders.fulfill') && (
            <div className="card stack"><h2>Ship</h2>
              <div className="row">
                {o.actions.markProcessing && <Action label="Start packing" path={`/admin/orders/${o.id}/processing`} onDone={reload} />}
              </div>
              <div className="grid" style={{gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))'}}>
                <label>Courier<input value={ship.courier} onChange={(e) => setShip({...ship, courier: e.target.value})} placeholder="e.g. delhivery" /></label>
                <label>Tracking number<input value={ship.trackingNo} onChange={(e) => setShip({...ship, trackingNo: e.target.value})} /></label>
                <label>Expected by<input type="date" value={ship.expectedBy} onChange={(e) => setShip({...ship, expectedBy: e.target.value})} /></label>
              </div>
              <Action label="Mark shipped" path={`/admin/orders/${o.id}/fulfill`} body={() => ({provider: ship.provider, courier: ship.courier, ...(ship.trackingNo && {trackingNo: ship.trackingNo}), ...(ship.expectedBy && {expectedBy: new Date(`${ship.expectedBy}T18:00:00Z`).toISOString()})})} onDone={(r) => r.ok && reload()} />
              <p className="small muted">The customer is emailed the courier and tracking link. Couriers with a tracking webhook update the order automatically.</p>
            </div>
          )}
          {o.shipments.map((s) => (
            <div key={s.id} className="card"><div className="row spread"><h3>{s.courier} · {s.trackingNo}</h3><span className="badge">{label(s.status)}</span></div>
              <ul className="small">{s.events.map((e, i) => <li key={i} className={e.applied ? '' : 'muted'}>{dateTime(e.occurredAt)} — {label(e.status)}{e.location ? `, ${e.location}` : ''}{e.applied ? '' : ' (ignored: out of order)'}</li>)}</ul>
              {can('orders.fulfill') && !['DELIVERED', 'RETURNED'].includes(s.status) && <div className="row">{SHIP_NEXT.map((st) => <Action key={st} label={label(st)} className="btn small ghost" method="PATCH" path={`/admin/shipments/${s.id}`} body={{status: st}} onDone={(r) => r.ok && reload()} />)}</div>}
            </div>
          ))}
          {o.actions.refund && can('refunds.write') && (
            <div className="card stack"><h2>Refund</h2><p className="small">Up to {inr(remaining.toString())} can still be refunded. The provider is called after the refund is recorded; a retry never refunds twice.</p>
              <div className="row"><label>Amount (₹)<input value={refund.rupees} onChange={(e) => setRefund({...refund, rupees: e.target.value})} inputMode="decimal" /></label><label style={{flex: 1}}>Reason<input value={refund.reason} onChange={(e) => setRefund({...refund, reason: e.target.value})} /></label></div>
              <label className="check"><input type="checkbox" checked={refund.restock} onChange={(e) => setRefund({...refund, restock: e.target.checked})} /> Put items back in stock (only for orders not yet shipped)</label>
              <Action label="Issue refund" idempotent confirm="Refund this amount to the customer?" path={`/admin/orders/${o.id}/refund`} body={() => ({amountPaise: rupeesToPaise(refund.rupees) ?? '0', reason: refund.reason, restock: refund.restock})} onDone={(r) => r.ok && reload()} />
            </div>
          )}
          {o.actions.approveReview && can('orders.cancel') && (
            <div className="card stack"><h2>Paid — needs review</h2><p className="small">Payment arrived after the stock hold lapsed or the amount did not match. Approve only if the item can really be shipped; otherwise refund in full.</p>
              <input aria-label="Review note" placeholder="Note (e.g. stock received on 4 Nov)" value={note} onChange={(e) => setNote(e.target.value)} /><Action label="Approve and allocate stock" path={`/admin/orders/${o.id}/approve-review`} body={() => ({note})} onDone={(r) => r.ok && reload()} />
            </div>
          )}
          <div className="row">
            {o.actions.cancelUnpaid && can('orders.cancel') && <Action label="Cancel unpaid order" className="btn small danger" confirm="Cancel this order and release its stock?" path={`/admin/orders/${o.id}/cancel`} body={{reason: 'Cancelled by staff'}} onDone={(r) => r.ok && reload()} />}
            {o.actions.reconcile && <Action label="Check payment with provider" className="btn small ghost" path={`/admin/orders/${o.id}/reconcile`} onDone={reload} />}
          </div>
        </section>
        <aside className="stack">
          <div className="card"><h2>Customer</h2><p>{o.email}</p>{ad && <p className="small">{ad['fullName']}<br />{ad['line1']}{ad['line2'] ? `, ${ad['line2']}` : ''}<br />{ad['city']}, {ad['state']} {ad['postalCode']}<br />{ad['phone']}</p>}</div>
          <div className="card"><h2>Payments</h2><Table rows={o.payments} cols={[['Provider', (p) => `${p.provider} (${p.environment})`], ['Amount', (p) => p.providerCurrency === 'INR' ? inr(p.amountPaise) : `${inr(p.amountPaise)} = ${p.providerCurrency} ${(Number(p.providerAmountMinor) / 100).toFixed(2)}`], ['Status', (p) => <>{label(p.status)}{p.failureReason && <div className="small err">{p.failureReason}</div>}</>]]} />
            {o.refunds.length > 0 && <Table rows={o.refunds} cols={[['Refund', (r) => inr(r.amountPaise)], ['Status', (r) => label(r.status)], ['Reason', (r) => r.reason]]} />}</div>
          {o.commission && <div className="card"><h2>Partner</h2><p>{o.commission.affiliate.name}: {inr(o.commission.amountPaise)} ({label(o.commission.status)})</p></div>}
          <div className="card"><h2>Stock holds</h2><Table rows={o.reservations} cols={[['Qty', (r) => r.qty], ['Status', (r) => label(r.status)], ['Until', (r) => dateTime(r.expiresAt)]]} /></div>
          <div className="card"><h2>Timeline</h2><ul className="small">{o.events.map((e, i) => <li key={i}>{dateTime(e.createdAt)} — {e.fromStatus ? `${label(e.fromStatus)} → ` : ''}{label(e.toStatus)}{e.reason ? `: ${e.reason}` : ''}</li>)}</ul></div>
        </aside>
      </div>
    </div>
  );
}
