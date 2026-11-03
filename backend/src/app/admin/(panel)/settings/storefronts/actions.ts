'use server';
import {redirect} from 'next/navigation';
import {getDb} from '../../../../../lib/db.ts';
import {can, requireAdmin} from '../../../../../lib/auth.ts';
import {audit} from '../../../../../lib/audit.ts';
import {lastFour, randomToken, sha256} from '../../../../../lib/crypto.ts';
import {clearStorefrontCache} from '../../../../../lib/http.ts';
import {getSetting, setSetting} from '../../../../../lib/settings.ts';

const PAGE = '/admin/settings/storefronts';

export async function saveStorefront(form: FormData) {
  const admin = await requireAdmin(can.settings);
  const id = String(form.get('id'));
  let error = '';
  try {
    const baseUrl = String(form.get('baseUrl') || '').trim().replace(/\/+$/, '');
    if (!/^https?:\/\/[^/\s]+$/.test(baseUrl)) throw new Error('The website address must look like https://www.example.com');
    const origins = String(form.get('origins') || '').split(/\s+/).map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean);
    for (const origin of origins) if (!/^https?:\/\/[^/\s]+$/.test(origin)) throw new Error(`"${origin}" is not an origin like https://www.example.com`);
    await (await getDb()).execute('update storefronts set base_url = ?, allowed_origins = ? where id = ?', [baseUrl, JSON.stringify(origins), id]);
    clearStorefrontCache();
    await audit(admin.id, 'storefront.update', 'storefront', id, {baseUrl, origins});
  } catch (e) { error = (e as Error).message; }
  redirect(`${PAGE}?${error ? `error=${encodeURIComponent(error)}` : 'notice=saved'}`);
}

/** Creates a new API key for a storefront's server. Returned once; only its hash is stored. */
export async function rotateKey(_previous: {key?: string; id?: string; error?: string} | null, form: FormData): Promise<{key?: string; id?: string; error?: string}> {
  const admin = await requireAdmin(can.settings);
  const id = String(form.get('id'));
  const key = `nvk_${randomToken(24)}`;
  const updated = await (await getDb()).execute('update storefronts set api_key_hash = ?, api_key_last4 = ? where id = ?', [sha256(key), lastFour(key), id]);
  if (!updated.affectedRows) return {error: 'Unknown storefront.'};
  await audit(admin.id, 'storefront.api_key.rotate', 'storefront', id);
  return {key, id};
}

export async function saveAffiliateRules(form: FormData) {
  const admin = await requireAdmin(can.settings);
  const days = Number(form.get('attributionDays'));
  if (!Number.isInteger(days) || days < 1 || days > 365) redirect(`${PAGE}?error=${encodeURIComponent('Attribution must be 1 to 365 days.')}`);
  await setSetting('affiliates', {...(await getSetting('affiliates', {attributionDays: 30})), attributionDays: days}, admin.id);
  await audit(admin.id, 'settings.affiliates', 'settings', 'affiliates', {attributionDays: days});
  redirect(`${PAGE}?notice=saved`);
}
