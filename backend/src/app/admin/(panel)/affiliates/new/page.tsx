import Link from 'next/link';
import {can, requireAdmin} from '../../../../../lib/auth.ts';
import Notice from '../../../../../components/Notice.tsx';
import AffiliateForm from '../AffiliateForm.tsx';

export default async function NewAffiliate({searchParams}: {searchParams: Promise<{error?: string}>}) {
  await requireAdmin(can.offers);
  return <>
    <div className="topbar"><h1>New affiliate</h1><Link href="/admin/affiliates">All affiliates</Link></div>
    <Notice params={await searchParams}/>
    <AffiliateForm/>
  </>;
}
