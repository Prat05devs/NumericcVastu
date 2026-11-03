'use server';
import {redirect} from 'next/navigation';
import {randomUUID} from 'node:crypto';
import {getDb, isDuplicate} from '../../../../lib/db.ts';
import {can, requireAdmin} from '../../../../lib/auth.ts';
import {audit} from '../../../../lib/audit.ts';
import {parseDiscount, parseIst, slugify} from '../../../../lib/format.ts';
import type {CampaignTheme} from '../../../../lib/commerce.ts';
import {DECORATIONS} from './themes.ts';

const HEX = /^#[0-9a-fA-F]{6}$/;

function parseTheme(form: FormData): CampaignTheme {
  const text = (name: string, max: number) => String(form.get(name) || '').trim().slice(0, max);
  const link = text('themeBannerLink', 200);
  const image = text('themeHeroImageUrl', 500);
  if (link && !link.startsWith('/')) throw new Error('The banner link must be a path on the website, starting with /.');
  if (image && !/^https:\/\//.test(image)) throw new Error('The hero image must be an https:// address.');
  const decoration = text('themeDecoration', 30);
  const colors: NonNullable<CampaignTheme['colors']> = {};
  for (const key of ['primary', 'accent', 'background', 'text'] as const) {
    const value = text(`themeColor_${key}`, 7);
    if (HEX.test(value)) colors[key] = value;
  }
  return {badge: text('themeBadge', 30), bannerText: text('themeBannerText', 140), bannerLink: link, heroImageUrl: image,
    decoration: DECORATIONS.some(([id]) => id === decoration) ? decoration : 'none', showCountdown: form.get('themeShowCountdown') === 'on', colors};
}

export async function saveCampaign(form: FormData) {
  const admin = await requireAdmin(can.offers);
  const id = String(form.get('id') || '');
  let saved = id;
  let error = '';
  try {
    const name = String(form.get('name') || '').trim();
    if (!name) throw new Error('Name the sale.');
    const slug = slugify(String(form.get('slug') || '') || name);
    const startsAt = parseIst(form.get('startsAt'));
    const endsAt = parseIst(form.get('endsAt'));
    if (!startsAt || !endsAt) throw new Error('A sale needs a start and an end.');
    if (endsAt <= startsAt) throw new Error('The end must be after the start.');
    const priority = Number(form.get('priority') || 0);
    if (!Number.isInteger(priority)) throw new Error('Priority must be a whole number.');
    const values = [name, slug, JSON.stringify(form.getAll('storefronts').map(String)), startsAt, endsAt, priority,
      JSON.stringify(parseDiscount(form, true)), JSON.stringify(parseTheme(form)), form.get('active') === 'on'];
    const db = await getDb();
    if (id) {
      await db.execute(`update campaigns set name=?, slug=?, storefronts=?, starts_at=?, ends_at=?, priority=?,
        discount=?, theme=?, active=?, updated_at=NOW(3) where id=?`, [...values, id]);
      await audit(admin.id, 'campaign.update', 'campaign', id, {name});
    } else {
      saved = randomUUID();
      await db.execute(`insert into campaigns (id, name, slug, storefronts, starts_at, ends_at, priority, discount, theme, active, created_by)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [saved, ...values, admin.id]);
      await audit(admin.id, 'campaign.create', 'campaign', saved, {name});
    }
  } catch (e) {
    error = isDuplicate(e) ? 'Another sale already uses that short name (slug).' : (e as Error).message;
  }
  if (error) redirect(`/admin/campaigns/${id || 'new'}?error=${encodeURIComponent(error)}`);
  redirect(`/admin/campaigns/${saved}?notice=saved`);
}
