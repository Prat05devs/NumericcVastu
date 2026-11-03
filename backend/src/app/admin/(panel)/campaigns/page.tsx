import Link from 'next/link';
import {getDb} from '../../../../lib/db.ts';
import {can, requireAdmin} from '../../../../lib/auth.ts';
import {describeDiscount, formatIst} from '../../../../lib/format.ts';
import {catalogue, type CampaignRow} from '../../../../lib/commerce.ts';
import Notice from '../../../../components/Notice.tsx';
import {TEMPLATES} from './themes.ts';

export default async function Campaigns({searchParams}: {searchParams: Promise<{notice?: string}>}) {
  await requireAdmin(can.offers);
  const rows = await (await getDb()).query<CampaignRow & {orders: number}>('select c.*, (select count(*) from redemptions r where r.campaign_id = c.id) as orders from campaigns c order by c.starts_at desc');
  const names = Object.fromEntries((await catalogue()).map((i) => [i.id, i.name]));
  const now = new Date();
  const status = (c: CampaignRow) => !c.active ? ['Off', 'muted'] : new Date(c.ends_at) <= now ? ['Ended', 'muted'] : new Date(c.starts_at) > now ? ['Scheduled', 'warn'] : ['Running', 'ok'];
  return <>
    <div className="topbar"><h1>Sales &amp; festive offers</h1><Link className="btn gold" href="/admin/campaigns/new">New sale</Link></div>
    <Notice params={await searchParams}/>
    <div className="card"><h2>Start from a template</h2>
      <div className="row">{Object.entries(TEMPLATES).map(([id, t]) => <Link key={id} className="btn ghost small" href={`/admin/campaigns/new?template=${id}`}>{t.name}</Link>)}</div>
    </div>
    <div className="card">
      {rows.length === 0 ? <p className="empty">No sales yet.</p> : <table>
        <thead><tr><th>Sale</th><th>Discount</th><th>When (IST)</th><th>Orders</th><th>Status</th></tr></thead>
        <tbody>{rows.map((c) => { const [label, tone] = status(c); return <tr key={c.id}>
          <td><Link href={`/admin/campaigns/${c.id}`}><b>{c.name}</b></Link><br/><small className="help">{c.theme.badge}</small></td>
          <td>{describeDiscount(c.discount, names)}</td>
          <td><small>{formatIst(c.starts_at)} → {formatIst(c.ends_at)}</small></td>
          <td>{c.orders}</td>
          <td><span className={`chip ${tone}`}>{label}</span></td>
        </tr>; })}</tbody>
      </table>}
    </div>
  </>;
}
