import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getDb} from '../../../../../lib/db.ts';
import {can, requireAdmin} from '../../../../../lib/auth.ts';
import {formatIst, formatMoney} from '../../../../../lib/format.ts';
import Notice from '../../../../../components/Notice.tsx';
import CopyField from '../../../../../components/CopyField.tsx';
import AffiliateForm, {type AffiliateRow} from '../AffiliateForm.tsx';
import {createLink, toggleLink} from '../actions.ts';

const linkBase = () => (process.env.PUBLIC_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');

export default async function Affiliate({params, searchParams}: {params: Promise<{id: string}>; searchParams: Promise<{notice?: string; error?: string}>}) {
  await requireAdmin(can.offers);
  const {id} = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await getDb();
  const affiliate = await db.one<AffiliateRow>('select * from affiliates where id = ?', [id]);
  if (!affiliate) notFound();
  const links = await db.query<{id: string; code: string; label: string; target_path: string; storefront_id: string; active: boolean; coupon_code: string | null; created_at: Date; clicks: number; orders: number; commission_inr: number; commission_usd: number}>(`
    select l.id, l.code, l.label, l.target_path, l.storefront_id, l.active, l.created_at, c.code as coupon_code,
      (select count(*) from affiliate_clicks k where k.link_id = l.id) as clicks,
      (select count(*) from redemptions r where r.affiliate_link_id = l.id) as orders,
      (select coalesce(sum(r.commission), 0) from redemptions r where r.affiliate_link_id = l.id and r.currency = 'INR') as commission_inr,
      (select coalesce(sum(r.commission), 0) from redemptions r where r.affiliate_link_id = l.id and r.currency = 'USD') as commission_usd
    from affiliate_links l left join coupons c on c.id = l.coupon_id where l.affiliate_id = ? order by l.created_at desc`, [id]);
  const coupons = await db.query<{id: string; code: string; description: string}>('select id, code, description from coupons where active order by created_at desc');
  const storefronts = await db.query<{id: string; name: string}>('select id, name from storefronts order by id');
  return <>
    <div className="topbar"><h1>{affiliate.name}</h1><Link href="/admin/affiliates">All affiliates</Link></div>
    <Notice params={await searchParams}/>
    <div className="card">
      <h2>Links to share</h2>
      <p className="hint">Each link has a random code that reveals nothing about the offer. A visit is counted, the visitor lands on the chosen page, and the linked coupon is applied for them at checkout. Switching a link off stops the offer immediately.</p>
      {links.length === 0 ? <p className="empty">No links yet.</p> : <table>
        <thead><tr><th>Link</th><th>Lands on</th><th>Coupon</th><th>Clicks</th><th>Orders</th><th>Commission</th><th/></tr></thead>
        <tbody>{links.map((l) => <tr key={l.id}>
          <td>{l.label && <b>{l.label}<br/></b>}<CopyField value={`${linkBase()}/r/${l.code}`}/><small className="help">Created {formatIst(l.created_at)}</small></td>
          <td><small>{l.storefront_id}{l.target_path}</small></td>
          <td>{l.coupon_code ? <code>{l.coupon_code}</code> : <small className="help">None</small>}</td>
          <td>{l.clicks}</td><td>{l.orders}</td>
          <td>{formatMoney(l.commission_inr, 'INR')}{l.commission_usd ? ` + ${formatMoney(l.commission_usd, 'USD')}` : ''}</td>
          <td><form action={toggleLink}><input type="hidden" name="linkId" value={l.id}/><input type="hidden" name="affiliateId" value={id}/>
            <button className={`btn small ${l.active ? 'ghost' : ''}`} type="submit">{l.active ? 'Switch off' : 'Switch on'}</button></form></td>
        </tr>)}</tbody>
      </table>}
      <form action={createLink} className="grid" style={{marginTop: 16}}>
        <input type="hidden" name="affiliateId" value={id}/>
        <h3>New link</h3>
        <div className="grid four">
          <label>Label <small>e.g. "Instagram bio", "Diwali reel".</small><input type="text" name="label"/></label>
          <label>Website<select name="storefront" defaultValue="numericcvaastu">{storefronts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label>Lands on <small>A path, e.g. /courses or /consultations/name-correction</small><input type="text" name="targetPath" defaultValue="/"/></label>
          <label>Coupon applied <small>Create one under Coupons first.</small><select name="couponId" defaultValue=""><option value="">No discount, tracking only</option>{coupons.map((c) => <option key={c.id} value={c.id}>{c.code}{c.description ? ` · ${c.description}` : ''}</option>)}</select></label>
        </div>
        <div className="row"><button className="btn" type="submit">Create link</button></div>
      </form>
    </div>
    <h2 style={{margin: '24px 0 10px'}}>Details</h2>
    <AffiliateForm affiliate={affiliate}/>
  </>;
}
