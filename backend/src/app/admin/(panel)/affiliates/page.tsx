import Link from 'next/link';
import {getDb} from '../../../../lib/db.ts';
import {can, requireAdmin} from '../../../../lib/auth.ts';
import {formatMoney} from '../../../../lib/format.ts';
import Notice from '../../../../components/Notice.tsx';

export default async function Affiliates({searchParams}: {searchParams: Promise<{notice?: string}>}) {
  await requireAdmin(can.offers);
  const rows = await (await getDb()).query<{id: string; name: string; platform: string | null; handle: string | null; active: boolean; links: number; clicks: number; orders: number; revenue_inr: number; revenue_usd: number}>(`
    select a.id, a.name, a.platform, a.handle, a.active,
      (select count(*) from affiliate_links l where l.affiliate_id = a.id) as links,
      (select count(*) from affiliate_clicks k join affiliate_links l on l.id = k.link_id where l.affiliate_id = a.id) as clicks,
      (select count(*) from redemptions r join affiliate_links l on l.id = r.affiliate_link_id where l.affiliate_id = a.id) as orders,
      (select coalesce(sum(r.total), 0) from redemptions r join affiliate_links l on l.id = r.affiliate_link_id where l.affiliate_id = a.id and r.currency = 'INR') as revenue_inr,
      (select coalesce(sum(r.total), 0) from redemptions r join affiliate_links l on l.id = r.affiliate_link_id where l.affiliate_id = a.id and r.currency = 'USD') as revenue_usd
    from affiliates a order by a.created_at desc`);
  return <>
    <div className="topbar"><h1>Affiliates</h1><Link className="btn gold" href="/admin/affiliates/new">New affiliate</Link></div>
    <Notice params={await searchParams}/>
    <div className="card">
      {rows.length === 0 ? <p className="empty">No affiliates yet. Add an influencer, then create a link for them to share.</p> : <table>
        <thead><tr><th>Affiliate</th><th>Links</th><th>Clicks</th><th>Orders</th><th>Sales</th><th>Status</th></tr></thead>
        <tbody>{rows.map((a) => <tr key={a.id}>
          <td><Link href={`/admin/affiliates/${a.id}`}><b>{a.name}</b></Link><br/><small className="help">{[a.platform, a.handle].filter(Boolean).join(' · ')}</small></td>
          <td>{a.links}</td><td>{a.clicks}</td><td>{a.orders}</td>
          <td>{formatMoney(a.revenue_inr, 'INR')}{a.revenue_usd ? ` + ${formatMoney(a.revenue_usd, 'USD')}` : ''}</td>
          <td><span className={`chip ${a.active ? 'ok' : 'muted'}`}>{a.active ? 'Active' : 'Off'}</span></td>
        </tr>)}</tbody>
      </table>}
    </div>
  </>;
}
