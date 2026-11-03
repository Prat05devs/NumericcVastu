import Link from 'next/link';
import {getDb} from '../../../../../lib/db.ts';
import {can, requireAdmin} from '../../../../../lib/auth.ts';
import {catalogue} from '../../../../../lib/commerce.ts';
import Notice from '../../../../../components/Notice.tsx';
import CampaignForm from '../CampaignForm.tsx';
import {TEMPLATES} from '../themes.ts';

export default async function NewCampaign({searchParams}: {searchParams: Promise<{error?: string; template?: string}>}) {
  await requireAdmin(can.offers);
  const params = await searchParams;
  const template = TEMPLATES[params.template ?? ''] ?? TEMPLATES.sale;
  const storefronts = await (await getDb()).query<{id: string; name: string}>('select id, name from storefronts order by id');
  return <>
    <div className="topbar"><h1>New sale</h1><Link href="/admin/campaigns">All sales</Link></div>
    <Notice params={params}/>
    <CampaignForm campaign={{name: template.name, theme: template.theme, discount: {type: 'percent', percentOff: 10}}} items={await catalogue()} storefronts={storefronts}/>
  </>;
}
