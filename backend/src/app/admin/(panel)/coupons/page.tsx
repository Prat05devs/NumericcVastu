import Link from 'next/link';
import {getDb} from '../../../../lib/db.ts';
import {can, requireAdmin} from '../../../../lib/auth.ts';
import {describeDiscount, formatIst} from '../../../../lib/format.ts';
import {catalogue, type CouponRow} from '../../../../lib/commerce.ts';
import Notice from '../../../../components/Notice.tsx';

export default async function Coupons({searchParams}: {searchParams: Promise<{notice?: string}>}) {
  await requireAdmin(can.offers);
  const db = await getDb();
  const coupons = await db.query<CouponRow & {used: number}>('select c.*, (select count(*) from redemptions r where r.coupon_id = c.id) as used from coupons c order by c.created_at desc');
  const names = Object.fromEntries((await catalogue()).map((i) => [i.id, i.name]));
  const now = new Date();
  const status = (c: CouponRow) => !c.active ? ['Off', 'muted'] : c.ends_at && new Date(c.ends_at) <= now ? ['Expired', 'muted'] : c.starts_at && new Date(c.starts_at) > now ? ['Scheduled', 'warn'] : ['Active', 'ok'];
  return <>
    <div className="topbar"><h1>Coupons</h1><Link className="btn gold" href="/admin/coupons/new">New coupon</Link></div>
    <Notice params={await searchParams}/>
    <div className="card">
      {coupons.length === 0 ? <p className="empty">No coupons yet. Create one for a festival, a newsletter or an influencer.</p> : <table>
        <thead><tr><th>Code</th><th>Discount</th><th>Valid</th><th>Used</th><th>Status</th></tr></thead>
        <tbody>{coupons.map((c) => { const [label, tone] = status(c); return <tr key={c.id}>
          <td><Link href={`/admin/coupons/${c.id}`}><code>{c.code}</code></Link><br/><small className="help">{c.description}</small></td>
          <td>{describeDiscount(c.discount, names)}{c.combinable && <><br/><small className="help">Combines with sales</small></>}</td>
          <td><small>{c.starts_at ? formatIst(c.starts_at) : 'Now'} → {c.ends_at ? formatIst(c.ends_at) : 'No end'}</small></td>
          <td>{c.used}{c.max_redemptions ? ` / ${c.max_redemptions}` : ''}</td>
          <td><span className={`chip ${tone}`}>{label}</span></td>
        </tr>; })}</tbody>
      </table>}
    </div>
  </>;
}
