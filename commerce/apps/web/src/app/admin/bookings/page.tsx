'use client';
import {useMemo, useState} from 'react';
import {Download, Eye, FileDown, Mail, MessageCircle, Phone, Search, Users} from 'lucide-react';
import {useResource, Loading} from '@/components/admin/kit';
import {call} from '@/lib/client';
import {dateTime, inr, label, usd} from '@/lib/format';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';

type B = {id: string; offerName: string; kind: string; currency: string; amountMinor: string; environment: string; paymentStatus: string; status: string; providerOrderId: string; providerPaymentId: string | null; customerName: string; email: string; phone: string; createdAt: string; paidAt: string | null; couponCode: string | null; discountMinor: string; marketingConsent: boolean};
type Opened = {customer: Record<string, string>; details: Record<string, string>};
type ReportLinks = {view: {en: string; hi: string}; download: {en: string; hi: string}; customerLink: string};

const FILTERS: [string, string][] = [['PAID', 'Paid'], ['CREATED', 'Not paid yet'], ['FAILED', 'Failed'], ['REFUNDED', 'Refunded'], ['', 'All']];
const PAY: Record<string, ['success' | 'muted' | 'destructive' | 'warning', string]> = {PAID: ['success', 'Paid'], CREATED: ['muted', 'Not paid yet'], FAILED: ['destructive', 'Failed'], REFUNDED: ['warning', 'Refunded']};
const FOLLOW: Record<string, 'default' | 'warning' | 'success' | 'muted'> = {NEW: 'default', CONTACTED: 'warning', SCHEDULED: 'warning', COMPLETED: 'success', CANCELLED: 'muted'};
const NEXT: Record<string, string[]> = {NEW: ['CONTACTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED'], CONTACTED: ['SCHEDULED', 'COMPLETED', 'CANCELLED'], SCHEDULED: ['COMPLETED', 'CANCELLED'], COMPLETED: ['NEW'], CANCELLED: ['NEW']};
const LABELS: Record<string, string> = {name: 'Name', email: 'Email', phone: 'WhatsApp', city: 'City', fullName: 'Name on report', dob: 'Date of birth', gender: 'Gender', reportPhone: 'Phone analysed', partnerDob: 'Second person’s date of birth', relationship: 'Relationship', updates: 'Agreed to offers', language: 'Language', preferredDate: 'Preferred date', preferredTime: 'Preferred time', mode: 'Session mode', coupon: 'Coupon', discount: 'Discount (₹)'};
const HIDE = new Set(['offer', 'offer_id', 'details']);
const digits = (phone = '') => phone.replace(/\D/g, '');
/** WhatsApp needs the country code: a bare 10-digit number is Indian. */
const waLink = (phone: string, text = '') => { const d = digits(phone); return `https://wa.me/${d.length === 10 ? `91${d}` : d}${text ? `?text=${encodeURIComponent(text)}` : ''}`; };

/** Courses, consultations and reports bought on numericcvaastu.com. */
export default function Bookings() {
  const [filter, setFilter] = useState('PAID');
  const [q, setQ] = useState('');
  const {data, error, loading, reload} = useResource<B[]>(`/admin/bookings${filter ? `?paymentStatus=${filter}` : ''}`);
  const [open, setOpen] = useState<Record<string, Opened>>({});
  const [reports, setReports] = useState<Record<string, ReportLinks | string>>({});
  const [busy, setBusy] = useState<string>('');
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!data || !t) return data;
    return data.filter((b) => [b.customerName, b.offerName, b.providerPaymentId, b.providerOrderId, b.phone, b.email, b.couponCode].some((v) => String(v ?? '').toLowerCase().includes(t)));
  }, [data, q]);
  const amount = (b: B) => (b.currency === 'USD' ? usd(b.amountMinor) : inr(b.amountMinor));
  async function details(b: B) {
    setBusy(`open:${b.id}`);
    const r = await call<Opened>('GET', `/admin/bookings/${b.id}`);
    setBusy('');
    if (r.ok) setOpen((o) => ({...o, [b.id]: r.data}));
  }
  async function report(b: B) {
    setBusy(`report:${b.id}`);
    const r = await call<ReportLinks>('GET', `/admin/bookings/${b.id}/report`);
    setBusy('');
    setReports((x) => ({...x, [b.id]: r.ok ? r.data : r.error.message}));
  }
  async function move(b: B, status: string) {
    setBusy(`status:${b.id}`);
    await call('PATCH', `/admin/bookings/${b.id}`, {status});
    setBusy('');
    void reload();
  }
  return <>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="m-0 text-[26px] font-extrabold text-deep">Website bookings</h2><p className="m-0 max-w-[70ch] text-muted-foreground">Courses, consultations and numerology reports paid on numericcvaastu.com. “Not paid yet” lists checkouts that were started but not completed.</p></div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild><a href="/api/v1/admin/bookings/export"><Download /> Export CSV</a></Button>
        <Button variant="outline" asChild><a href="/api/v1/admin/bookings/export?consent=1" title="Only customers who agreed to hear about offers"><Users /> Opted-in customers</a></Button>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <Tabs value={filter} onValueChange={setFilter} className="min-w-0 max-w-full"><TabsList>{FILTERS.map(([value, text]) => <TabsTrigger key={value || 'all'} value={value}>{text}</TabsTrigger>)}</TabsList></Tabs>
      <label className="relative ml-auto w-full max-w-[320px] sm:w-[300px]"><span className="sr-only">Search bookings</span><Search className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" aria-hidden="true" /><Input className="pl-9" placeholder="Name, phone or payment ID" value={q} onChange={(e) => setQ(e.target.value)} /></label>
    </div>
    <Loading error={error} loading={loading} />
    {rows && (rows.length ? <Table>
      <TableHeader><TableRow><TableHead>Received</TableHead><TableHead>Booking</TableHead><TableHead>Amount</TableHead><TableHead>Customer</TableHead><TableHead>Follow-up</TableHead></TableRow></TableHeader>
      <TableBody>{rows.map((b) => {
        const [pv, pt] = PAY[b.paymentStatus] ?? ['muted', label(b.paymentStatus)];
        const o = open[b.id];
        const rep = reports[b.id];
        const phone = o?.customer.phone ?? '';
        return <TableRow key={b.id}>
          <TableCell label="Received" className="whitespace-nowrap">{dateTime(b.createdAt)}{b.paidAt && <div className="text-xs text-muted-foreground">Paid {dateTime(b.paidAt)}</div>}</TableCell>
          <TableCell label="Booking" className="min-w-[200px]"><b>{b.offerName}</b><div className="text-xs text-muted-foreground"><span className="capitalize">{b.kind}</span>{b.environment === 'test' ? ' · test payment' : ''}</div><div className="font-mono text-[11.5px] break-all text-muted-foreground">{b.providerPaymentId || b.providerOrderId}</div></TableCell>
          <TableCell label="Amount"><b className="tabular-nums">{amount(b)}</b>{b.couponCode && <div className="text-xs text-muted-foreground">{b.couponCode} · −{b.currency === 'USD' ? usd(b.discountMinor) : inr(b.discountMinor)}</div>}<div className="mt-1"><Badge variant={pv} dot>{pt}</Badge></div></TableCell>
          <TableCell label="Customer" className="min-w-[240px]">
            <b>{b.customerName || '—'}</b>{b.marketingConsent && <Badge variant="default" className="ml-2 align-middle">Offers OK</Badge>}
            {!o && <div className="text-xs text-muted-foreground">{[b.email, b.phone].filter(Boolean).join(' · ')}</div>}
            {o ? <>
              <div className="mt-2 flex flex-wrap gap-2">
                {digits(phone).length >= 10 && <Button variant="whatsapp" size="sm" asChild><a href={waLink(phone, `Namaste ${o.customer.name || ''}, this is the NumericcVaastu team about your ${b.offerName}.`)} target="_blank" rel="noopener noreferrer"><MessageCircle /> WhatsApp</a></Button>}
                {digits(phone).length >= 10 && <Button variant="outline" size="sm" asChild><a href={`tel:${phone.startsWith('+') ? '+' : ''}${digits(phone)}`}><Phone /> Call</a></Button>}
                {o.customer.email && <Button variant="outline" size="sm" asChild><a href={`mailto:${o.customer.email}?subject=${encodeURIComponent(`Your ${b.offerName}`)}`}><Mail /> Email</a></Button>}
              </div>
              <dl className="mt-3 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px]">
                {Object.entries({...o.customer, ...o.details}).filter(([k, v]) => v && !HIDE.has(k)).map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{LABELS[k] ?? k}</dt><dd className="m-0 font-semibold break-words">{v}</dd></div>)}
              </dl>
            </> : <Button variant="outline" size="sm" className="mt-2" disabled={busy === `open:${b.id}`} onClick={() => details(b)}><Eye /> {busy === `open:${b.id}` ? 'Opening…' : 'Open details'}</Button>}
            {b.kind === 'report' && (b.paymentStatus === 'PAID' || b.paymentStatus === 'REFUNDED') && <div className="mt-3">
              {rep && typeof rep !== 'string' ? <div className="flex flex-wrap gap-2">
                <Button size="sm" asChild><a href={rep.download.en}><FileDown /> Report · English</a></Button>
                <Button size="sm" asChild><a href={rep.download.hi}><FileDown /> Report · हिंदी</a></Button>
                {digits(phone).length >= 10 && <Button variant="whatsapp" size="sm" asChild><a href={waLink(phone, `Namaste ${o?.customer.name || ''}, here is your NumericcVaastu numerology report: ${rep.customerLink}`)} target="_blank" rel="noopener noreferrer"><MessageCircle /> Send link</a></Button>}
              </div> : <Button variant="secondary" size="sm" disabled={busy === `report:${b.id}`} onClick={() => report(b)}><FileDown /> {busy === `report:${b.id}` ? 'Preparing…' : 'Get report PDF'}</Button>}
              {typeof rep === 'string' && <p className="m-0 mt-1 text-xs font-semibold text-destructive" role="alert">{rep}</p>}
              <p className="m-0 mt-1 text-xs text-muted-foreground">The PDF takes about 20 seconds to prepare the first time.</p>
            </div>}
          </TableCell>
          <TableCell label="Follow-up">
            <Badge variant={FOLLOW[b.status] ?? 'muted'}>{label(b.status)}</Badge>
            <div className="mt-2 flex flex-wrap gap-1.5">{(NEXT[b.status] ?? []).map((s) => <Button key={s} variant="outline" size="sm" disabled={busy === `status:${b.id}`} onClick={() => move(b, s)}>{s === 'NEW' ? 'Reopen' : label(s)}</Button>)}</div>
          </TableCell>
        </TableRow>;
      })}</TableBody>
    </Table> : <p className="m-0 rounded-2xl border bg-card p-6 text-center text-muted-foreground">{q ? 'No booking matches that search.' : 'No bookings in this list yet.'}</p>)}
  </>;
}
