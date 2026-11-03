'use client';
import {useState} from 'react';
import {useResource, Loading, Table, Action} from '@/components/admin/kit';
import {useCan} from '@/components/admin/Shell';
import {date, inr, label} from '@/lib/format';

type P = {id: string; createdAt: string; status: string; grossPaise: string; tdsPaise: string; netPaise: string; method: string | null; reference: string | null; paidAt: string | null; affiliate: {name: string; payoutHint: string | null}; _count: {commissions: number}};
type A = {id: string; name: string; commissions: Record<string, {amountPaise: string}>};
export default function Payouts() {
  const can = useCan();
  const {data, error, loading, reload} = useResource<P[]>('/admin/affiliate-payouts');
  const {data: partners} = useResource<A[]>('/admin/affiliates');
  const [ref, setRef] = useState<Record<string, string>>({});
  return (
    <div className="stack"><h1>Partner payouts</h1>
      <p className="muted small">Create a statement from a partner’s approved balance, pay it by bank/UPI outside the system, then record the transfer reference. Tax is deducted only if configured in Settings → Partner programme (after tax advice).</p>
      {can('refunds.write') && <div className="row">{partners?.filter((a) => a.commissions['APPROVED']).map((a) => <Action key={a.id} label={`Create payout for ${a.name} (${inr(a.commissions['APPROVED']!.amountPaise)})`} idempotent path="/admin/affiliate-payouts" body={{affiliateId: a.id}} onDone={reload} />)}</div>}
      <Loading error={error} loading={loading} />
      <Table rows={data} cols={[['Created', (p) => date(p.createdAt)], ['Partner', (p) => `${p.affiliate.name} · ${p.affiliate.payoutHint ?? ''}`], ['Orders', (p) => p._count.commissions], ['Gross', (p) => inr(p.grossPaise)], ['TDS', (p) => inr(p.tdsPaise)], ['Net to pay', (p) => <strong>{inr(p.netPaise)}</strong>], ['Status', (p) => `${label(p.status)}${p.reference ? ` · ${p.reference}` : ''}`],
        ['', (p) => p.status === 'PENDING' && can('refunds.write') ? <div className="row"><input aria-label="Transfer reference" placeholder="UTR / reference" value={ref[p.id] ?? ''} onChange={(e) => setRef({...ref, [p.id]: e.target.value})} style={{width: 160}} /><Action label="Mark paid" path={`/admin/affiliate-payouts/${p.id}/paid`} body={() => ({method: p.affiliate.payoutHint?.startsWith('UPI') ? 'UPI' : 'BANK', reference: ref[p.id] ?? ''})} onDone={reload} /><Action label="Cancel" className="btn small ghost" path={`/admin/affiliate-payouts/${p.id}/cancel`} onDone={reload} /></div> : null]]} />
    </div>
  );
}
