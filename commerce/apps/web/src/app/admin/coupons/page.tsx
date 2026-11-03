'use client';
import {useState} from 'react';
import {useResource, Loading, Table, SpecForm, type Spec} from '@/components/admin/kit';
import {RULE_SPECS, normaliseRule} from '@/components/admin/rules';
import {call, post} from '@/lib/client';
import {date, inr} from '@/lib/format';

type D = {id: string; code: string; description: string; type: string; value: string; capPaise: string | null; minOrderPaise: string | null; startsAt: string | null; endsAt: string | null; limitTotal: number | null; limitPerCustomer: number | null; redeemedCount: number; combinable: boolean; active: boolean; version: number; eligibleRulesJson: {families?: string[]; storefronts?: string[]; lockedToLink?: boolean}; affiliateLinks: {code: string; affiliate: {name: string}}[]};
const SPECS: Spec[] = [
  {key: 'code', label: 'Code', type: 'text', hint: 'Letters, numbers, - and _ (shown in capitals).'}, {key: 'description', label: 'Description', type: 'text'}, ...RULE_SPECS,
  {key: 'startsAt', label: 'Starts', type: 'datetime'}, {key: 'endsAt', label: 'Ends', type: 'datetime'},
  {key: 'limitTotal', label: 'Total uses allowed (blank = unlimited)', type: 'number', min: 1}, {key: 'limitPerCustomer', label: 'Uses per customer', type: 'number', min: 1},
  {key: 'combinable', label: 'Can combine with a running sale', type: 'bool'}, {key: 'lockedToLink', label: 'Only works through its partner link (stops coupon-site leakage)', type: 'bool'}, {key: 'active', label: 'Active', type: 'bool'},
];
const toForm = (d: D) => ({code: d.code, description: d.description, rule: {type: d.type, ...(d.type === 'PERCENT' ? {percentBp: Number(d.value)} : {amountPaise: d.value}), maxDiscountPaise: d.capPaise, minOrderPaise: d.minOrderPaise, appliesTo: {families: (d.eligibleRulesJson.families ?? []).join(', ')}}, startsAt: d.startsAt, endsAt: d.endsAt, limitTotal: d.limitTotal ?? undefined, limitPerCustomer: d.limitPerCustomer ?? undefined, combinable: d.combinable, lockedToLink: Boolean(d.eligibleRulesJson.lockedToLink), active: d.active});
const payload = (v: Record<string, unknown>) => ({...v, rule: normaliseRule(v), limitTotal: v['limitTotal'] ?? null, limitPerCustomer: v['limitPerCustomer'] ?? null, startsAt: v['startsAt'] || null, endsAt: v['endsAt'] || null});

export default function Coupons() {
  const {data, error, loading, reload} = useResource<D[]>('/admin/discounts');
  const [editing, setEditing] = useState<D | null>(null);
  return (
    <div className="stack"><h1>Coupons</h1><Loading error={error} loading={loading} />
      <Table rows={data} cols={[['Code', (d) => <strong>{d.code}</strong>], ['Discount', (d) => (d.type === 'PERCENT' ? `${Number(d.value) / 100}%` : inr(d.value))], ['Window', (d) => `${date(d.startsAt)} → ${date(d.endsAt)}`], ['Used', (d) => `${d.redeemedCount}${d.limitTotal ? ` / ${d.limitTotal}` : ''}`],
        ['Partner', (d) => d.affiliateLinks.map((l) => l.affiliate.name).join(', ') || '—'], ['Active', (d) => (d.active ? 'Yes' : 'No')], ['', (d) => <button className="btn small ghost" onClick={() => setEditing(d)}>Edit</button>]]} />
      <div className="card"><h2>{editing ? `Edit ${editing.code}` : 'New coupon'}</h2>
        <SpecForm key={editing?.id ?? 'new'} specs={SPECS} initial={editing ? toForm(editing) : {rule: {type: 'PERCENT'}, active: true, combinable: false}} submitLabel={editing ? 'Save coupon' : 'Create coupon'}
          onSubmit={async (v) => { const r = editing ? await call('PUT', `/admin/discounts/${editing.id}`, {...payload(v), version: editing.version}) : await post('/admin/discounts', payload(v)); if (r.ok) { setEditing(null); reload(); } return r; }} />
        {editing && <button className="btn small ghost" onClick={() => setEditing(null)}>Cancel</button>}
      </div>
    </div>
  );
}
