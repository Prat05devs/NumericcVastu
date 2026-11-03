'use client';
import Link from 'next/link';
import {useResource, Loading} from '@/components/admin/kit';
import {inr} from '@/lib/format';

type Overview = {queues: Record<string, number>; last30Days?: {paidOrders: number; grossPaise: string; refundedPaise: string}; partnerCommissionOwedPaise?: string; paymentMode: string};
const Q: [string, string, string][] = [['ordersToday', 'Orders today', '/admin/orders'], ['awaitingPayment', 'Awaiting payment', '/admin/orders?status=AWAITING_PAYMENT'], ['toShip', 'To pack & ship', '/admin/orders?status=PAID'], ['paidReview', 'Paid — needs review', '/admin/orders?status=PAID_REVIEW'], ['openCustomRequests', 'Wristwatch requests', '/admin/requests'], ['newConsultationLeads', 'New enquiries', '/admin/consultations'], ['lowStockVariants', 'Low stock', '/admin/inventory'], ['deadJobs', 'Failed jobs', '/admin/jobs']];

export default function Overview() {
  const {data, error, loading} = useResource<Overview>('/admin/overview');
  return (
    <div className="stack">
      <h1>Overview</h1>
      <Loading error={error} loading={loading && !data} />
      {data && <>
        {data.paymentMode !== 'live' && <div className="alert warn">Payments are in <strong>{data.paymentMode}</strong> mode — no real money is collected. <Link href="/admin/payments">Payments setup</Link></div>}
        <div className="kpis">{Q.map(([k, l, href]) => <Link key={k} href={href} className="kpi" style={{textDecoration: 'none', color: 'inherit'}}><b>{data.queues[k] ?? 0}</b>{l}</Link>)}</div>
        {data.last30Days && <div className="kpis"><div className="kpi"><b>{data.last30Days.paidOrders}</b>Paid orders (30 days)</div><div className="kpi"><b>{inr(data.last30Days.grossPaise)}</b>Gross (30 days)</div><div className="kpi"><b>{inr(data.last30Days.refundedPaise)}</b>Refunded (30 days)</div></div>}
        {data.partnerCommissionOwedPaise && <p>Partner commission pending or approved: <strong>{inr(data.partnerCommissionOwedPaise)}</strong> · <Link href="/admin/partners">Partners</Link></p>}
      </>}
    </div>
  );
}
