'use client';
import Link from 'next/link';
import {AlertTriangle, ArrowRight, CalendarCheck, FileText, IndianRupee, MessageCircle, Package, ShoppingBag, Truck, Watch, Wrench, type LucideIcon} from 'lucide-react';
import {useResource, Loading} from '@/components/admin/kit';
import {useStaff, useCan} from '@/components/admin/Shell';
import {Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {cn} from '@/lib/utils';
import {dateTime, inr} from '@/lib/format';

type Overview = {
  queues: Record<string, number>;
  last30Days?: {paidOrders: number; grossPaise: string; refundedPaise: string};
  partnerCommissionOwedPaise?: string;
  paymentMode: string;
  website?: {paid30: number; grossPaise30: string; reports30: number; reportsGross30: string; daily: {day: string; grossPaise: string; count: number}[]};
};
type Booking = {id: string; offerName: string; kind: string; amountMinor: string; currency: string; paymentStatus: string; customerName: string; createdAt: string; couponCode: string | null};

function Kpi({label, value, icon: Icon, foot, href, alert}: {label: string; value: React.ReactNode; icon: LucideIcon; foot: React.ReactNode; href: string; alert?: boolean}) {
  return <Link href={href} className="group no-underline">
    <Card className="h-full gap-0 overflow-hidden py-0 transition-shadow group-hover:shadow-[0_10px_28px_-14px_rgba(74,31,122,.4)]">
      <CardHeader className="px-5 pt-5 pb-4">
        <CardDescription className="text-xs font-extrabold tracking-wider uppercase">{label}</CardDescription>
        <CardTitle className={cn('text-[28px] tracking-tight tabular-nums', alert && 'text-sindoor')}>{value}</CardTitle>
        <CardAction><span className="grid size-11 place-items-center rounded-xl border bg-white text-primary"><Icon className="size-5" aria-hidden="true" /></span></CardAction>
      </CardHeader>
      <div className="mt-auto flex items-center justify-between border-t bg-[#fcfbfe] px-5 py-3 text-[13px] text-muted-foreground">{foot}<ArrowRight className="size-4 text-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></div>
    </Card>
  </Link>;
}

const money = (minor: string, currency = 'INR') => (currency === 'USD' ? `$${(Number(minor) / 100).toFixed(2)}` : inr(minor));
const STATUS: Record<string, ['success' | 'muted' | 'destructive' | 'warning', string]> = {PAID: ['success', 'Paid'], CREATED: ['muted', 'Not paid yet'], FAILED: ['destructive', 'Failed'], REFUNDED: ['warning', 'Refunded']};

export default function OverviewPage() {
  const staff = useStaff();
  const can = useCan();
  const {data, error, loading} = useResource<Overview>('/admin/overview');
  const recent = useResource<Booking[]>(can('requests.read') ? '/admin/bookings' : null);
  const first = staff.user.name.split(' ')[0];
  const web = data?.website;
  const max = Math.max(1, ...(web?.daily ?? []).map((d) => Number(d.grossPaise)));
  const q = data?.queues ?? {};
  const attention: [string, string, number, LucideIcon, boolean][] = [
    ['New paid website bookings', '/admin/bookings', q['newBookings'] ?? 0, CalendarCheck, true],
    ['Consultation enquiries', '/admin/consultations', q['newConsultationLeads'] ?? 0, MessageCircle, false],
    ['Shop orders to pack & ship', '/admin/orders?status=PAID', q['toShip'] ?? 0, Truck, false],
    ['Wristwatch requests', '/admin/requests', q['openCustomRequests'] ?? 0, Watch, false],
    ['Low stock', '/admin/inventory', q['lowStockVariants'] ?? 0, Package, false],
    ['Failed jobs', '/admin/jobs', q['deadJobs'] ?? 0, Wrench, false],
  ];
  return <>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="m-0 text-[26px] font-extrabold text-deep">Namaste, {first}</h2><p className="m-0 text-muted-foreground">Here is what happened in the last 30 days.</p></div>
    </div>
    <Loading error={error} loading={loading && !data} />
    {data && data.paymentMode !== 'live' && <div className="flex items-start gap-3 rounded-xl border border-[#f2dca6] bg-[#fff3d6] px-4 py-3 text-[#5f4100]"><AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><p className="m-0">The crystal shop’s payments are in <strong>{data.paymentMode}</strong> mode, so shop orders collect no real money. Website courses, consultations and reports are not affected. <Link href="/admin/payments">Payments setup</Link></p></div>}
    {data && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {web && <Kpi label="Website takings" value={inr(web.grossPaise30)} icon={IndianRupee} href="/admin/bookings" foot={<span><b className="text-foreground">{web.paid30}</b> paid bookings</span>} />}
      <Kpi label="New paid bookings" value={q['newBookings'] ?? 0} icon={CalendarCheck} href="/admin/bookings" alert={(q['newBookings'] ?? 0) > 0} foot={<b className="text-foreground">Contact them on WhatsApp</b>} />
      {web && <Kpi label="Reports sold" value={web.reports30} icon={FileText} href="/admin/bookings" foot={<span><b className="text-foreground">{inr(web.reportsGross30)}</b> from reports</span>} />}
      <Kpi label="Shop orders today" value={q['ordersToday'] ?? 0} icon={ShoppingBag} href="/admin/orders" foot={<span><b className="text-foreground">{q['toShip'] ?? 0}</b> to pack &amp; ship</span>} />
    </div>}
    {data && <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      {web && <Card>
        <CardHeader><CardTitle className="text-lg">Website sales, last 14 days</CardTitle><CardDescription>Courses, consultations and reports, in rupees.</CardDescription></CardHeader>
        <CardContent>
          <div className="flex h-44 items-end gap-1.5 sm:gap-2" role="img" aria-label={`Daily website sales for the last 14 days, highest ${inr(String(max))}`}>
            {web.daily.map((d, i) => <div key={d.day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`${new Date(d.day).toLocaleDateString('en-IN', {day: 'numeric', month: 'short'})}: ${inr(d.grossPaise)} · ${d.count} booking${d.count === 1 ? '' : 's'}`}>
              <i className={cn('block w-full max-w-[30px] rounded-t-lg rounded-b-sm', i === web.daily.length - 1 ? 'bg-primary' : 'bg-[#ece3f7]')} style={{height: `${Math.max(3, (Number(d.grossPaise) / max) * 100)}%`}} />
              <span className="text-[10.5px] text-muted-foreground">{new Date(d.day).getDate()}</span>
            </div>)}
          </div>
        </CardContent>
      </Card>}
      <Card>
        <CardHeader><CardTitle className="text-lg">Needs attention</CardTitle></CardHeader>
        <CardContent>
          <ul className="m-0 list-none divide-y p-0">
            {attention.map(([text, href, n, Icon, hot]) => <li key={text}><Link href={href} className="flex items-center gap-3 py-3 font-semibold text-foreground no-underline hover:text-primary">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><Icon className="size-[18px]" aria-hidden="true" /></span>{text}
              <b className={cn('ml-auto text-lg', hot && n ? 'text-sindoor' : 'text-deep')}>{n}</b></Link></li>)}
          </ul>
        </CardContent>
      </Card>
    </div>}
    {recent.data && <Card className="gap-4">
      <CardHeader><CardTitle className="text-lg">Latest website bookings</CardTitle><CardAction><Button variant="outline" size="sm" asChild><Link href="/admin/bookings">View all <ArrowRight /></Link></Button></CardAction></CardHeader>
      <CardContent>
        {recent.data.length ? <Table><TableHeader><TableRow><TableHead>Received</TableHead><TableHead>Booking</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Payment</TableHead></TableRow></TableHeader>
          <TableBody>{recent.data.slice(0, 6).map((b) => {const [variant, text] = STATUS[b.paymentStatus] ?? ['muted', b.paymentStatus]; return <TableRow key={b.id}>
            <TableCell label="Received">{dateTime(b.createdAt)}</TableCell>
            <TableCell label="Booking"><b>{b.offerName}</b><div className="text-xs text-muted-foreground capitalize">{b.kind}{b.couponCode ? ` · ${b.couponCode}` : ''}</div></TableCell>
            <TableCell label="Customer">{b.customerName || '—'}</TableCell>
            <TableCell label="Amount" className="tabular-nums">{money(b.amountMinor, b.currency)}</TableCell>
            <TableCell label="Payment"><Badge variant={variant} dot>{text}</Badge></TableCell>
          </TableRow>;})}</TableBody></Table> : <p className="m-0 text-muted-foreground">No website bookings yet.</p>}
      </CardContent>
    </Card>}
    {data?.last30Days && <Card className="gap-3">
      <CardHeader><CardTitle className="text-lg">Crystal shop, last 30 days</CardTitle></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div><p className="m-0 text-xs font-extrabold tracking-wider text-muted-foreground uppercase">Paid orders</p><p className="m-0 text-2xl font-extrabold text-deep">{data.last30Days.paidOrders}</p></div>
        <div><p className="m-0 text-xs font-extrabold tracking-wider text-muted-foreground uppercase">Gross</p><p className="m-0 text-2xl font-extrabold text-deep">{inr(data.last30Days.grossPaise)}</p></div>
        <div><p className="m-0 text-xs font-extrabold tracking-wider text-muted-foreground uppercase">Refunded</p><p className="m-0 text-2xl font-extrabold text-deep">{inr(data.last30Days.refundedPaise)}</p></div>
      </CardContent>
    </Card>}
  </>;
}
