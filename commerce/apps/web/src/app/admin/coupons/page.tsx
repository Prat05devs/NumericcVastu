'use client';
import {useState} from 'react';
import {useResource, Loading, Table, SpecForm, type Spec} from '@/components/admin/kit';
import {RULE_SPECS, normaliseRule} from '@/components/admin/rules';
import {call, post} from '@/lib/client';
import {date, inr} from '@/lib/format';

type D = {id: string; code: string; description: string; type: string; value: string; capPaise: string | null; minOrderPaise: string | null; startsAt: string | null; endsAt: string | null; limitTotal: number | null; limitPerCustomer: number | null; redeemedCount: number; combinable: boolean; active: boolean; version: number; eligibleRulesJson: {families?: string[]; storefronts?: string[]; lockedToLink?: boolean; showInOffers?: boolean}; affiliateLinks: {code: string; affiliate: {name: string}}[]};
const SPECS: Spec[] = [
  {key: 'code', label: 'Code', type: 'text', hint: 'Letters, numbers, - and _ (shown in capitals).'}, {key: 'description', label: 'Description', type: 'text'},
  {key: 'where', label: 'Where it works', type: 'select', options: [['all', 'Everywhere: website and crystal shop'], ['website', 'Website only: courses, consultations and the report'], ['crystal', 'Crystal shop only']]},
  ...RULE_SPECS,
  {key: 'startsAt', label: 'Starts', type: 'datetime'}, {key: 'endsAt', label: 'Ends', type: 'datetime'},
  {key: 'limitTotal', label: 'Total uses allowed (blank = unlimited)', type: 'number', min: 1}, {key: 'limitPerCustomer', label: 'Uses per customer', type: 'number', min: 1},
  {key: 'combinable', label: 'Can combine with a running sale', type: 'bool'}, {key: 'lockedToLink', label: 'Only works through its partner link (stops coupon-site leakage)', type: 'bool'}, {key: 'showInOffers', label: 'Show in the crystal shop’s running offers bar (the description becomes the headline)', type: 'bool'}, {key: 'active', label: 'Active', type: 'bool'},
];
const toForm = (d: D) => ({code: d.code, description: d.description, rule: {type: d.type, ...(d.type === 'PERCENT' ? {percentBp: Number(d.value)} : {amountPaise: d.value}), maxDiscountPaise: d.capPaise, minOrderPaise: d.minOrderPaise, appliesTo: {families: (d.eligibleRulesJson.families ?? []).join(', ')}}, where: whereOf(d.eligibleRulesJson.storefronts), startsAt: d.startsAt, endsAt: d.endsAt, limitTotal: d.limitTotal ?? undefined, limitPerCustomer: d.limitPerCustomer ?? undefined, combinable: d.combinable, lockedToLink: Boolean(d.eligibleRulesJson.lockedToLink), showInOffers: Boolean(d.eligibleRulesJson.showInOffers), active: d.active});
const STOREFRONTS: Record<string, string[]> = {all: [], website: ['website'], crystal: ['crystal']};
const whereOf = (s?: string[]) => (!s?.length ? 'all' : s.includes('website') && !s.includes('crystal') ? 'website' : !s.includes('website') ? 'crystal' : 'all');
const payload = ({where, ...v}: Record<string, unknown>) => ({...v, storefronts: STOREFRONTS[String(where ?? 'all')] ?? [], rule: normaliseRule(v), limitTotal: v['limitTotal'] ?? null, limitPerCustomer: v['limitPerCustomer'] ?? null, startsAt: v['startsAt'] || null, endsAt: v['endsAt'] || null});

export default function Coupons() {
  const {data, error, loading, reload} = useResource<D[]>('/admin/discounts');
  const [editing, setEditing] = useState<D | null>(null);
  return (
    <div className="stack"><div className="flex flex-wrap items-center justify-between gap-3"><h1>Coupons</h1><a className="btn ghost small" href="/api/v1/admin/newsletter/export">Newsletter sign-ups (CSV)</a></div><Loading error={error} loading={loading} />
      <Table rows={data} cols={[['Code', (d) => <strong>{d.code}</strong>], ['Discount', (d) => (d.type === 'PERCENT' ? `${Number(d.value) / 100}%` : inr(d.value))], ['Works on', (d) => ({all: 'Everywhere', website: 'Website', crystal: 'Crystal shop'})[whereOf(d.eligibleRulesJson.storefronts)]], ['Window', (d) => `${date(d.startsAt)} → ${date(d.endsAt)}`], ['Used', (d) => `${d.redeemedCount}${d.limitTotal ? ` / ${d.limitTotal}` : ''}`], ['Offers bar', (d) => (d.eligibleRulesJson.showInOffers ? 'Shown' : '—')],
        ['Partner', (d) => d.affiliateLinks.map((l) => l.affiliate.name).join(', ') || '—'], ['Active', (d) => (d.active ? 'Yes' : 'No')], ['', (d) => <button className="btn small ghost" onClick={() => setEditing(d)}>Edit</button>]]} />
      <div className="card"><h2>{editing ? `Edit ${editing.code}` : 'New coupon'}</h2>
        <SpecForm key={editing?.id ?? 'new'} specs={SPECS} initial={editing ? toForm(editing) : {where: 'all', rule: {type: 'PERCENT'}, active: true, combinable: false, showInOffers: false}} submitLabel={editing ? 'Save coupon' : 'Create coupon'}
          onSubmit={async (v) => { const r = editing ? await call('PUT', `/admin/discounts/${editing.id}`, {...payload(v), version: editing.version}) : await post('/admin/discounts', payload(v)); if (r.ok) { setEditing(null); reload(); } return r; }} />
        {editing && <button className="btn small ghost" onClick={() => setEditing(null)}>Cancel</button>}
      </div>
    </div>
  );
}
