import DiscountFields from '../../../../components/DiscountFields.tsx';
import {toIstInput} from '../../../../lib/format.ts';
import type {CampaignRow} from '../../../../lib/commerce.ts';
import ThemeFields from './ThemeFields.tsx';
import {saveCampaign} from './actions.ts';

type Item = {id: string; name: string; kind: string; storefront: string};

export default function CampaignForm({campaign, items, storefronts}: {campaign: Partial<CampaignRow>; items: Item[]; storefronts: {id: string; name: string}[]}) {
  return <form action={saveCampaign} className="card grid">
    {campaign.id && <input type="hidden" name="id" value={campaign.id}/>}
    <div className="grid three">
      <label>Name<input type="text" name="name" required defaultValue={campaign.name}/></label>
      <label>Short name (slug) <small>Optional, made from the name.</small><input type="text" name="slug" defaultValue={campaign.slug}/></label>
      <label>Priority <small>When sales overlap, the banner shows the highest.</small><input type="number" name="priority" step="1" defaultValue={campaign.priority ?? 0}/></label>
      <label>Starts (IST)<input type="datetime-local" name="startsAt" required defaultValue={toIstInput(campaign.starts_at)}/></label>
      <label>Ends (IST)<input type="datetime-local" name="endsAt" required defaultValue={toIstInput(campaign.ends_at)}/></label>
    </div>
    <div className="checks">{storefronts.map((s) => <label key={s.id}><input type="checkbox" name="storefronts" value={s.id} defaultChecked={campaign.storefronts?.includes(s.id)}/>{s.name}</label>)}<span className="help">None ticked = every website.</span></div>
    <DiscountFields discount={campaign.discount} items={items} allowNone/>
    <ThemeFields theme={campaign.theme ?? {}}/>
    <div className="row"><label className="row" style={{fontWeight: 500}}><input type="checkbox" name="active" defaultChecked={campaign.active ?? true}/>Active (runs automatically between the start and end)</label></div>
    <div className="row"><button className="btn" type="submit">{campaign.id ? 'Save sale' : 'Create sale'}</button></div>
  </form>;
}
