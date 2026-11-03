import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getDb} from '../../../../../lib/db.ts';
import {can, requireAdmin} from '../../../../../lib/auth.ts';
import {catalogue, type CouponRow} from '../../../../../lib/commerce.ts';
import {formatIst, formatMoney} from '../../../../../lib/format.ts';
import Notice from '../../../../../components/Notice.tsx';
import CouponForm from '../CouponForm.tsx';
import {deleteCoupon} from '../actions.ts';

export default async function EditCoupon({params, searchParams}: {params: Promise<{id: string}>; searchParams: Promise<{notice?: string; error?: string}>}) {
  await requireAdmin(can.offers);
  const {id} = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await getDb();
  const coupon = await db.one<CouponRow>('select * from coupons where id = ?', [id]);
  if (!coupon) notFound();
  const storefronts = await db.query<{id: string; name: string}>('select id, name from storefronts order by id');
  const uses = await db.query<{order_ref: string; storefront_id: string; currency: 'INR' | 'USD'; discount: number; total: number; created_at: Date}>(
    'select order_ref, storefront_id, currency, discount, total, created_at from redemptions where coupon_id = ? order by created_at desc limit 50', [id]);
  return <>
    <div className="topbar"><h1>Coupon <code className="code">{coupon.code}</code></h1><Link href="/admin/coupons">All coupons</Link></div>
    <Notice params={await searchParams}/>
    <CouponForm coupon={coupon} items={await catalogue()} storefronts={storefronts}/>
    <div className="card"><h2>Orders that used it</h2>
      {uses.length === 0 ? <p className="empty">Not used yet.</p> : <table><thead><tr><th>When</th><th>Order</th><th>Website</th><th>Discount</th><th>Paid</th></tr></thead>
        <tbody>{uses.map((u) => <tr key={u.order_ref}><td>{formatIst(u.created_at)}</td><td><code>{u.order_ref}</code></td><td>{u.storefront_id}</td><td>{formatMoney(u.discount, u.currency)}</td><td>{formatMoney(u.total, u.currency)}</td></tr>)}</tbody></table>}
    </div>
    <form action={deleteCoupon} className="row"><input type="hidden" name="id" value={coupon.id}/><button className="btn danger small" type="submit">Delete coupon</button><span className="help">Only possible before anyone has used it.</span></form>
  </>;
}
