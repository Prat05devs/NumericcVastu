'use client';
import {useState} from 'react';
import {useResource, Loading, Table, SpecForm, type Spec} from '@/components/admin/kit';
import {RULE_SPECS, normaliseRule} from '@/components/admin/rules';
import {call, post} from '@/lib/client';
import {dateTime} from '@/lib/format';

type C = {id: string; name: string; slug: string; startsAt: string; endsAt: string; priority: number; active: boolean; storefronts: string[]; ruleJson: Record<string, unknown>; themeJson: Record<string, unknown>};
const SPECS: Spec[] = [
  {key: 'name', label: 'Name', hint: 'Sale ka naam, jaise “Deepawali Sale”. Ye sirf back office mein dikhta hai.', type: 'text'}, {key: 'slug', label: 'Short ID (optional: made from the name, e.g. deepawali-sale-2026)', hint: 'Khaali chhod do, naam se apne aap ban jayega. Isme sentence mat likhna.', type: 'text'},
  {key: 'startsAt', label: 'Starts', hint: 'Sale kab se shuru ho. Time Indian time (IST) mein hai.', type: 'datetime'}, {key: 'endsAt', label: 'Ends', hint: 'Sale kab khatam ho. Is time ke baad discount apne aap band ho jata hai.', type: 'datetime'}, {key: 'priority', label: 'Priority (higher wins ties)', hint: 'Normally 0 rakho. Ek saath do sale chal rahi ho tab hi kaam aata hai.', type: 'number'},
  ...RULE_SPECS,
  {key: 'theme.bannerText', label: 'Banner text (shown first in the crystal shop’s offers bar)', hint: 'Offers bar mein sabse pehle dikhega, jaise “Deepawali Sale · 10% off sab par”.', type: 'text'}, {key: 'theme.bannerLink', label: 'Banner link', hint: 'Banner dabane par kahan jaye, jaise /shop ya /rudraksha. Khaali bhi chalega.', type: 'text'}, {key: 'theme.badge', label: 'Product badge (up to 30 letters, e.g. Deepawali −10%)', hint: 'Product ki photo par chhota tag. 30 akshar tak.', type: 'text'},
  {key: 'theme.decoration', label: 'Decoration', hint: 'Sale ke time shop par festive sajavat (jaise diye).', type: 'select', options: [['diyas', 'Diwali diyas'], ['rangoli', 'Rangoli'], ['marigold', 'Marigold garland'], ['stars', 'Stars'], ['none', 'None']]},
  {key: 'theme.colors.accent', label: 'Accent colour (#RRGGBB)', hint: 'Optional. Khaali chhodo toh shop ka normal rang rahega.', type: 'text'}, {key: 'theme.showCountdown', label: 'Show countdown to the end', hint: 'Tick karo toh banner ke saath “ends 10 Nov” dikhega.', type: 'bool'}, {key: 'active', label: 'Active', hint: 'Tick hata do toh sale turant band, bina delete kiye.', type: 'bool'},
];
const toForm = (c: C) => ({name: c.name, slug: c.slug, startsAt: c.startsAt, endsAt: c.endsAt, priority: c.priority, rule: {...c.ruleJson, appliesTo: {families: ((c.ruleJson['appliesTo'] as {families?: string[]})?.families ?? []).join(', ')}}, theme: c.themeJson, active: c.active});
/** A safe short ID: lowercase letters, numbers and hyphens, made from the name when left blank. */
const slugify = (t: string) => t.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const payload = (v: Record<string, unknown>) => ({...v, slug: slugify(String(v['slug'] || v['name'] || '')) || `sale-${Date.now()}`, rule: normaliseRule(v), storefronts: []});

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
