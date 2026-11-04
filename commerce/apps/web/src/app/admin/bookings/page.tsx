'use client';
import {useState} from 'react';
import {useResource, Loading, Table, Action} from '@/components/admin/kit';
import {call} from '@/lib/client';
import {dateTime, inr, label, usd} from '@/lib/format';

type B = {id: string; offerName: string; kind: string; currency: string; amountMinor: string; environment: string; paymentStatus: string; status: string; providerOrderId: string; providerPaymentId: string | null; customerName: string; email: string; phone: string; createdAt: string; paidAt: string | null};
type Opened = {customer: Record<string, string>; details: Record<string, string>};
const FILTERS: [string, string][] = [['PAID', 'Paid'], ['CREATED', 'Not paid yet'], ['FAILED', 'Failed'], ['REFUNDED', 'Refunded'], ['', 'All']];
const NEXT: Record<string, string[]> = {NEW: ['CONTACTED', 'SCHEDULED', 'CANCELLED'], CONTACTED: ['SCHEDULED', 'COMPLETED', 'CANCELLED'], SCHEDULED: ['COMPLETED', 'CANCELLED'], COMPLETED: [], CANCELLED: ['NEW']};

/** Courses, consultations and reports bought on numericcvaastu.com. */
export default function Bookings() {
  const [filter, setFilter] = useState('PAID');
  const {data, error, loading, reload} = useResource<B[]>(`/admin/bookings${filter ? `?paymentStatus=${filter}` : ''}`);
  const [open, setOpen] = useState<Record<string, Opened>>({});
  const amount = (b: B) => (b.currency === 'USD' ? usd(b.amountMinor) : inr(b.amountMinor));
  return <div className="stack">
    <h1>Website bookings</h1>
    <p className="muted">Courses, consultations and numerology reports paid on numericcvaastu.com. “Not paid yet” lists checkouts that were started but not completed.</p>
    <div className="row">{FILTERS.map(([value, text]) => <button key={value} className={`btn small ${filter === value ? '' : 'ghost'}`} onClick={() => setFilter(value)}>{text}</button>)}</div>
    <Loading error={error} loading={loading} />
    <Table rows={data} empty="No bookings in this list yet." cols={[
      ['Received', (b) => <>{dateTime(b.createdAt)}{b.paidAt && <div className="small muted">Paid {dateTime(b.paidAt)}</div>}</>],
      ['Booking', (b) => <><strong>{b.offerName}</strong><div className="small muted">{label(b.kind)}{b.environment === 'test' ? ' · test payment' : ''}</div></>],
      ['Amount', (b) => amount(b)],
      ['Payment', (b) => <>{label(b.paymentStatus)}<div className="small muted">{b.providerPaymentId || b.providerOrderId}</div></>],
      ['Customer', (b) => open[b.id]
        ? <div className="small">{Object.entries({...open[b.id]!.customer, ...open[b.id]!.details}).filter(([, v]) => v).map(([k, v]) => <div key={k}><strong>{k}:</strong> {v}</div>)}</div>
        : <div className="small">{b.customerName}<div className="muted">{[b.email, b.phone].filter(Boolean).join(' · ')}</div><button className="btn small ghost" onClick={async () => { const r = await call<Opened>('GET', `/admin/bookings/${b.id}`); if (r.ok) setOpen({...open, [b.id]: r.data}); }}>Open details (audited)</button></div>],
      ['Follow-up', (b) => <><div>{label(b.status)}</div><div className="row">{(NEXT[b.status] ?? []).map((s) => <Action key={s} label={label(s)} className="btn small ghost" method="PATCH" path={`/admin/bookings/${b.id}`} body={{status: s}} onDone={reload} />)}</div></>],
    ]} />
  </div>;
}
