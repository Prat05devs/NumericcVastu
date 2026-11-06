'use client';
import {useState} from 'react';
import {useResource, Loading, Table, SpecForm, Action, type Spec} from '@/components/admin/kit';
import {call, post} from '@/lib/client';
import {dateTime, inr, label} from '@/lib/format';

type A = {id: string; name: string; email: string | null; platform: string | null; handle: string | null; status: string; active: boolean; attributionDays: number; canCreateLinks: boolean; notes: string; commissionJson: {type: string; percentBp?: number; amountPaise?: string}; hasPayoutDetails: boolean; payoutHint: string | null; termsVersion: string | null;
  links: {id: string; code: string; targetPath: string; label: string; active: boolean; createdByPartner: boolean; discount: {code: string} | null; _count: {clicks: number}}[]; commissions: Record<string, {count: number; amountPaise: string}>};
type C = {id: string; createdAt: string; status: string; amountPaise: string; reversedPaise: string; basisPaise: string; attribution: string; flags: string[]; affiliate: {name: string}; order: {publicCode: string; status: string} | undefined};
type D = {id: string; code: string};
const SPECS: Spec[] = [
  {key: 'name', label: 'Name', hint: 'Partner ka poora naam.', type: 'text'}, {key: 'email', label: 'Email (they sign in to the partner portal with this)', hint: 'Isi email par partner portal ka sign-in code jayega.', type: 'email'}, {key: 'platform', label: 'Platform', hint: 'Kahan promote karte hain, jaise Instagram, YouTube.', type: 'text'}, {key: 'handle', label: 'Handle', hint: 'Unka username, jaise @astro_priya.', type: 'text'},
  {key: 'commission.type', label: 'Commission', hint: 'Har sale par % milega ya fixed ₹.', type: 'select', options: [['PERCENT', 'Percentage of sale'], ['FIXED', 'Fixed per order'], ['NONE', 'None']]}, {key: 'commission.percentBp', label: 'Percentage', hint: 'Jaise 10 = har sale ka 10%.', type: 'percent'}, {key: 'commission.amountPaise', label: 'Fixed amount (₹)', hint: 'Har sale par itne ₹. Percentage wale mein khaali.', type: 'money'},
  {key: 'attributionDays', label: 'Attribution window (days)', hint: 'Link click ke kitne din tak sale unke naam hogi. Normally 30.', type: 'number', min: 1, max: 90}, {key: 'canCreateLinks', label: 'Partner may create their own links', hint: 'Tick karo toh partner khud naye links bana sakta hai.', type: 'bool'}, {key: 'notes', label: 'Internal notes', hint: 'Sirf team ke liye notes. Partner ko nahi dikhte.', type: 'textarea'}, {key: 'active', label: 'Active', hint: 'Tick hatao toh unke links aur code band.', type: 'bool'},
];
const commission = (c: A['commissionJson']) => (c.type === 'PERCENT' ? `${(c.percentBp ?? 0) / 100}%` : c.type === 'FIXED' ? inr(c.amountPaise) : '—');
const site = typeof window === 'undefined' ? '' : window.location.origin;

export default function Partners() {
  const {data, error, loading, reload} = useResource<A[]>('/admin/affiliates');
  const {data: commissions, reload: reloadC} = useResource<C[]>('/admin/affiliate-commissions');
  const {data: discounts} = useResource<D[]>('/admin/discounts');
  const [editing, setEditing] = useState<A | null>(null);
  const [link, setLink] = useState<Record<string, {targetPath: string; couponId: string; label: string}>>({});
  return (
    <div className="stack">
      <h1>Partners (affiliates & influencers)</h1>
      <div className="alert info small">How it works: invite a partner by email → they accept the published partner terms in the portal → share links (unguessable codes) and/or their own coupon. Visits are attributed with a signed cookie for the attribution window (last click wins; a typed partner coupon wins over another partner’s click). Commission is earned on product value after discounts (excluding delivery and tax), stays pending until the return window passes after delivery, is reversed for refunds, and is never paid on self-purchases.</div>
      <Loading error={error} loading={loading} />
      {data?.map((a) => (
        <div key={a.id} className="card stack">
          <div className="row spread"><h2>{a.name} <span className="small muted">{a.platform} {a.handle}</span></h2><span className="badge">{label(a.status)}</span></div>
          <p className="small">Commission {commission(a.commissionJson)} · {a.attributionDays}-day window · terms {a.termsVersion ?? 'not accepted'} · payout {a.hasPayoutDetails ? a.payoutHint : 'details missing'}</p>
          <p className="small">{Object.entries(a.commissions).map(([s, v]) => `${label(s)}: ${v.count} (${inr(v.amountPaise)})`).join(' · ') || 'No sales yet'}</p>
          <Table rows={a.links} cols={[['Link', (l) => <code className="small">{site}/r/{l.code}</code>], ['To', (l) => l.targetPath], ['Coupon', (l) => l.discount?.code ?? '—'], ['Clicks', (l) => l._count.clicks], ['By', (l) => (l.createdByPartner ? 'Partner' : 'Staff')], ['', (l) => <Action label={l.active ? 'Disable' : 'Enable'} className="btn small ghost" method="PATCH" path={`/admin/affiliate-links/${l.id}`} body={{active: !l.active}} onDone={reload} />]]} empty="No links yet." />
          <div className="row">
            <input aria-label="Target page" placeholder="/rudraksha" value={link[a.id]?.targetPath ?? '/'} onChange={(e) => setLink({...link, [a.id]: Object.assign({targetPath: '/', couponId: '', label: ''}, link[a.id], {targetPath: e.target.value})})} style={{maxWidth: 200}} />
            <select aria-label="Coupon" value={link[a.id]?.couponId ?? ''} onChange={(e) => setLink({...link, [a.id]: Object.assign({targetPath: '/', couponId: '', label: ''}, link[a.id], {couponId: e.target.value})})} style={{maxWidth: 200}}><option value="">No coupon</option>{discounts?.map((d) => <option key={d.id} value={d.id}>{d.code}</option>)}</select>
            <Action label="Create link" path={`/admin/affiliates/${a.id}/links`} body={() => ({storefront: 'crystal', targetPath: link[a.id]?.targetPath ?? '/', couponId: link[a.id]?.couponId || null, label: link[a.id]?.label ?? ''})} onDone={reload} />
            <button className="btn small ghost" onClick={() => setEditing(a)}>Edit terms</button>
            {a.status !== 'SUSPENDED' ? <Action label="Suspend" className="btn small danger" path={`/admin/affiliates/${a.id}/status`} body={() => ({status: 'SUSPENDED', note: prompt('Reason') ?? 'Suspended'})} onDone={reload} /> : <Action label="Reactivate" className="btn small" path={`/admin/affiliates/${a.id}/status`} body={() => ({status: 'ACTIVE', note: prompt('Reason') ?? 'Reactivated'})} onDone={reload} />}
          </div>
        </div>
      ))}
      <div className="card"><h2>{editing ? `Edit ${editing.name}` : 'Invite a partner'}</h2>
        <SpecForm key={editing?.id ?? 'new'} specs={SPECS} initial={editing ? {name: editing.name, email: editing.email ?? '', platform: editing.platform ?? '', handle: editing.handle ?? '', commission: editing.commissionJson, attributionDays: editing.attributionDays, canCreateLinks: editing.canCreateLinks, notes: editing.notes, active: editing.active} : {commission: {type: 'PERCENT', percentBp: 1000}, attributionDays: 30, canCreateLinks: true, active: true, notes: ''}}
          submitLabel={editing ? 'Save' : 'Send invitation'} onSubmit={async (v) => { const body = {...v, email: v['email'] || null}; const r = editing ? await call('PUT', `/admin/affiliates/${editing.id}`, body) : await post('/admin/affiliates', body); if (r.ok) { setEditing(null); reload(); } return r; }} />
      </div>
      <section className="stack"><h2>Commission ledger</h2>
        <Table rows={commissions} cols={[['Date', (c) => dateTime(c.createdAt)], ['Partner', (c) => c.affiliate.name], ['Order', (c) => `${c.order?.publicCode ?? ''} (${label(c.order?.status ?? '')})`], ['Via', (c) => c.attribution], ['Basis', (c) => inr(c.basisPaise)], ['Commission', (c) => `${inr(c.amountPaise)}${c.reversedPaise !== '0' ? ` (−${inr(c.reversedPaise)})` : ''}`], ['Status', (c) => <>{label(c.status)}{c.flags.length ? <div className="small err">{c.flags.join(', ')}</div> : null}</>],
          ['', (c) => c.status === 'PENDING' ? <div className="row"><Action label="Approve now" className="btn small ghost" path={`/admin/affiliate-commissions/${c.id}/decision`} body={() => ({action: 'approve', note: prompt('Reason for early approval') ?? ''})} onDone={reloadC} /><Action label="Reject" className="btn small danger" path={`/admin/affiliate-commissions/${c.id}/decision`} body={() => ({action: 'reject', note: prompt('Reason (shown to the partner)') ?? ''})} onDone={reloadC} /></div> : null]]} />
      </section>
    </div>
  );
}
