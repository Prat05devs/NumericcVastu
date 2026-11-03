import Link from 'next/link';
import {getDb} from '../../../../../lib/db.ts';
import {can, requireAdmin} from '../../../../../lib/auth.ts';
import {catalogue} from '../../../../../lib/commerce.ts';
import Notice from '../../../../../components/Notice.tsx';
import CouponForm from '../CouponForm.tsx';

export default async function NewCoupon({searchParams}: {searchParams: Promise<{error?: string}>}) {
  await requireAdmin(can.offers);
  const storefronts = await (await getDb()).query<{id: string; name: string}>('select id, name from storefronts order by id');
  return <>
    <div className="topbar"><h1>New coupon</h1><Link href="/admin/coupons">All coupons</Link></div>
    <Notice params={await searchParams}/>
    <CouponForm items={await catalogue()} storefronts={storefronts}/>
  </>;
}
