'use client';
import {useState} from 'react';
import {useResource, Loading, Table, SpecForm, type Spec} from '@/components/admin/kit';
import {RULE_SPECS, normaliseRule} from '@/components/admin/rules';
import {call, post} from '@/lib/client';
import {dateTime} from '@/lib/format';

type C = {id: string; name: string; slug: string; startsAt: string; endsAt: string; priority: number; active: boolean; storefronts: string[]; ruleJson: Record<string, unknown>; themeJson: Record<string, unknown>};
const SPECS: Spec[] = [
  {key: 'name', label: 'Name', type: 'text'}, {key: 'slug', label: 'Slug', type: 'text'},
  {key: 'startsAt', label: 'Starts', type: 'datetime'}, {key: 'endsAt', label: 'Ends', type: 'datetime'}, {key: 'priority', label: 'Priority (higher wins ties)', type: 'number'},
  ...RULE_SPECS,
  {key: 'theme.bannerText', label: 'Banner text (top of every page)', type: 'text'}, {key: 'theme.bannerLink', label: 'Banner link', type: 'text'}, {key: 'theme.badge', label: 'Product badge', type: 'text'},
  {key: 'theme.decoration', label: 'Decoration', type: 'select', options: [['diyas', 'Diwali diyas'], ['rangoli', 'Rangoli'], ['marigold', 'Marigold garland'], ['stars', 'Stars'], ['none', 'None']]},
  {key: 'theme.colors.accent', label: 'Accent colour (#RRGGBB)', type: 'text'}, {key: 'theme.showCountdown', label: 'Show countdown to the end', type: 'bool'}, {key: 'active', label: 'Active', type: 'bool'},
];
const toForm = (c: C) => ({name: c.name, slug: c.slug, startsAt: c.startsAt, endsAt: c.endsAt, priority: c.priority, rule: {...c.ruleJson, appliesTo: {families: ((c.ruleJson['appliesTo'] as {families?: string[]})?.families ?? []).join(', ')}}, theme: c.themeJson, active: c.active});
const payload = (v: Record<string, unknown>) => ({...v, rule: normaliseRule(v), storefronts: []});

export default function Campaigns() {
  const {data, error, loading, reload} = useResource<C[]>('/admin/campaigns');
  const [editing, setEditing] = useState<C | null>(null);
  return (
    <div className="stack"><h1>Sales & festive themes</h1><p className="muted small">A running campaign discounts eligible items automatically and decorates the shop (banner, badge, colours). When several run, the one that saves the customer most applies; coupons combine only if marked combinable.</p>
      <Loading error={error} loading={loading} />
      <Table rows={data} cols={[['Name', (c) => c.name], ['When', (c) => `${dateTime(c.startsAt)} → ${dateTime(c.endsAt)}`], ['Live now', (c) => (c.active && new Date(c.startsAt) <= new Date() && new Date(c.endsAt) > new Date() ? 'Yes' : 'No')], ['', (c) => <button className="btn small ghost" onClick={() => setEditing(c)}>Edit</button>]]} />
      <div className="card"><h2>{editing ? `Edit ${editing.name}` : 'New campaign'}</h2>
        <SpecForm key={editing?.id ?? 'new'} specs={SPECS} initial={editing ? toForm(editing) : {rule: {type: 'PERCENT'}, theme: {decoration: 'diyas', showCountdown: true}, active: true, priority: 0}} submitLabel={editing ? 'Save campaign' : 'Create campaign'}
          onSubmit={async (v) => { const r = editing ? await call('PUT', `/admin/campaigns/${editing.id}`, payload(v)) : await post('/admin/campaigns', payload(v)); if (r.ok) { setEditing(null); reload(); } return r; }} />
      </div>
    </div>
  );
}
