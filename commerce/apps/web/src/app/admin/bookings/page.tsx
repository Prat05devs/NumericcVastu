'use client';
import {useState} from 'react';
import {useResource, Loading, Table, Action} from '@/components/admin/kit';
import {call} from '@/lib/client';
import {dateTime, inr, label, usd} from '@/lib/format';

type B = {id: string; offerName: string; kind: string; currency: string; amountMinor: string; environment: string; paymentStatus: string; status: string; providerOrderId: string; providerPaymentId: string | null; customerName: string; email: string; phone: string; createdAt: string; paidAt: string | null};
type Opened = {customer: Record<string, string>; details: Record<string, string>};
const LABELS: Record<string, string> = {name: 'Name', email: 'Email', phone: 'WhatsApp', city: 'City', fullName: 'Name on report', dob: 'Date of birth', gender: 'Gender', reportPhone: 'Phone analysed', partnerDob: 'Partner’s date of birth', relationship: 'Relationship', updates: 'Agreed to offers', language: 'Language'};
const FILTERS: [string, string][] = [['PAID', 'Paid'], ['CREATED', 'Not paid yet'], ['FAILED', 'Failed'], ['REFUNDED', 'Refunded'], ['', 'All']];
const digits = (phone = '') => phone.replace(/\D/g, '');
/** WhatsApp needs the country code: a bare 10-digit number is Indian. */
const waLink = (phone: string) => { const d = digits(phone); return `https://wa.me/${d.length === 10 ? `91${d}` : d}`; };
function Contact({customer}: {customer: Record<string, string>}) {
  const phone = customer.phone || '';
  return <div className="row" style={{flexWrap: 'wrap', gap: 6, margin: '6px 0'}}>
    {digits(phone).length >= 10 && <a className="btn small" href={waLink(phone)} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
    {digits(phone).length >= 10 && <a className="btn small ghost" href={`tel:${phone.startsWith('+') ? '+' : ''}${digits(phone)}`}>Call</a>}
    {customer.email && <a className="btn small ghost" href={`mailto:${customer.email}`}>Email</a>}
  </div>;
}
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
        ? <div className="small"><Contact customer={open[b.id]!.customer} />{Object.entries({...open[b.id]!.customer, ...open[b.id]!.details}).filter(([, v]) => v).map(([k, v]) => <div key={k}><strong>{LABELS[k] ?? k}:</strong> {v}</div>)}</div>
        : <div className="small">{b.customerName}<div className="muted">{[b.email, b.phone].filter(Boolean).join(' · ')}</div><button className="btn small ghost" onClick={async () => { const r = await call<Opened>('GET', `/admin/bookings/${b.id}`); if (r.ok) setOpen({...open, [b.id]: r.data}); }}>Open details (audited)</button></div>],
      ['Follow-up', (b) => <><div>{label(b.status)}</div><div className="row">{(NEXT[b.status] ?? []).map((s) => <Action key={s} label={label(s)} className="btn small ghost" method="PATCH" path={`/admin/bookings/${b.id}`} body={{status: s}} onDone={reload} />)}</div></>],
    ]} />
  </div>;
}
