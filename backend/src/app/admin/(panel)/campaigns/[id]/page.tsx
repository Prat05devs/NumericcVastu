import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getDb} from '../../../../../lib/db.ts';
import {can, requireAdmin} from '../../../../../lib/auth.ts';
import {catalogue, type CampaignRow} from '../../../../../lib/commerce.ts';
import Notice from '../../../../../components/Notice.tsx';
import CampaignForm from '../CampaignForm.tsx';

export default async function EditCampaign({params, searchParams}: {params: Promise<{id: string}>; searchParams: Promise<{notice?: string; error?: string}>}) {
  await requireAdmin(can.offers);
  const {id} = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = await getDb();
  const campaign = await db.one<CampaignRow>('select * from campaigns where id = ?', [id]);
  if (!campaign) notFound();
  const storefronts = await db.query<{id: string; name: string}>('select id, name from storefronts order by id');
  return <>
    <div className="topbar"><h1>{campaign.name}</h1><Link href="/admin/campaigns">All sales</Link></div>
    <Notice params={await searchParams}/>
    <CampaignForm campaign={campaign} items={await catalogue()} storefronts={storefronts}/>
  </>;
}
