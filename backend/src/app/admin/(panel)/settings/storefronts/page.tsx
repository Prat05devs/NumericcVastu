import {getDb} from '../../../../../lib/db.ts';
import {can, requireAdmin} from '../../../../../lib/auth.ts';
import {getSetting} from '../../../../../lib/settings.ts';
import Notice from '../../../../../components/Notice.tsx';
import KeyButton from './KeyButton.tsx';
import {saveAffiliateRules, saveStorefront} from './actions.ts';

export default async function Storefronts({searchParams}: {searchParams: Promise<{notice?: string; error?: string}>}) {
  await requireAdmin(can.settings);
  const rows = await (await getDb()).query<{id: string; name: string; base_url: string; allowed_origins: string[]; api_key_last4: string | null}>('select id, name, base_url, allowed_origins, api_key_last4 from storefronts order by id');
  const affiliates = await getSetting('affiliates', {attributionDays: 30});
  return <>
    <div className="topbar"><h1>Storefronts &amp; API keys</h1></div>
    <Notice params={await searchParams}/>
    <p className="help" style={{marginBottom: 16}}>Each website calls this back office. Browsers may call it only from the origins listed; the website&apos;s server uses its API key to record paid orders.</p>
    {rows.map((s) => <div className="card" key={s.id}>
      <div className="row spread"><h2>{s.name} <code className="code">{s.id}</code></h2><span className={`chip ${s.api_key_last4 ? 'ok' : 'warn'}`}>{s.api_key_last4 ? `API key …${s.api_key_last4}` : 'No API key yet'}</span></div>
      <form action={saveStorefront} className="grid" style={{marginTop: 10}}>
        <input type="hidden" name="id" value={s.id}/>
        <label>Website address <small>Where affiliate links land.</small><input type="url" name="baseUrl" defaultValue={s.base_url}/></label>
        <label>Allowed origins <small>One per line. Every domain the site is served from.</small><textarea name="origins" defaultValue={s.allowed_origins.join('\n')}/></label>
        <div className="row"><button className="btn" type="submit">Save</button></div>
      </form>
      <div style={{marginTop: 12}}><KeyButton id={s.id} hasKey={!!s.api_key_last4}/></div>
    </div>)}
    <div className="card"><h2>Affiliate attribution</h2>
      <form action={saveAffiliateRules} className="row">
        <label>Days a visit stays credited to the affiliate<input type="number" name="attributionDays" min="1" max="365" defaultValue={affiliates.attributionDays}/></label>
        <button className="btn" type="submit">Save</button>
      </form>
    </div>
  </>;
}
