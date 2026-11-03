'use server';
import {redirect} from 'next/navigation';
import {randomUUID} from 'node:crypto';
import {getDb} from '../../../../lib/db.ts';
import {can, requireAdmin} from '../../../../lib/auth.ts';
import {audit} from '../../../../lib/audit.ts';
import {randomCode} from '../../../../lib/crypto.ts';
import {parseMoney} from '../../../../lib/format.ts';
import type {Commission} from '../../../../lib/commerce.ts';

function parseCommission(form: FormData): Commission {
  const type = String(form.get('commissionType') || 'none');
  if (type === 'percent') {
    const percent = Number(form.get('commissionPercent'));
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) throw new Error('Commission percentage must be between 1 and 100.');
    return {type, percent};
  }
  if (type === 'fixed') {
    const amount: Commission['amount'] = {};
    const inr = parseMoney(form.get('commissionInr')); const usd = parseMoney(form.get('commissionUsd'));
    if (inr != null) amount.INR = inr; if (usd != null) amount.USD = usd;
    if (inr == null && usd == null) throw new Error('Enter the commission per order in ₹, $ or both.');
    return {type, amount};
  }
  return {type: 'none'};
}

export async function saveAffiliate(form: FormData) {
  const admin = await requireAdmin(can.offers);
  const id = String(form.get('id') || '');
  let saved = id;
  let error = '';
  try {
    const name = String(form.get('name') || '').trim();
    if (!name) throw new Error('Enter a name.');
    const values = [name, String(form.get('email') || '').trim() || null, String(form.get('phone') || '').trim() || null, String(form.get('platform') || '').trim() || null,
      String(form.get('handle') || '').trim() || null, JSON.stringify(parseCommission(form)), String(form.get('notes') || ''), form.get('active') === 'on'];
    const db = await getDb();
    if (id) {
      await db.execute('update affiliates set name=?, email=?, phone=?, platform=?, handle=?, commission=?, notes=?, active=? where id=?', [...values, id]);
      await audit(admin.id, 'affiliate.update', 'affiliate', id, {name});
    } else {
      saved = randomUUID();
      await db.execute('insert into affiliates (id, name, email, phone, platform, handle, commission, notes, active, created_by) values (?, ?,?,?,?,?,?,?,?,?)', [saved, ...values, admin.id]);
      await audit(admin.id, 'affiliate.create', 'affiliate', saved, {name});
    }
  } catch (e) { error = (e as Error).message; }
  if (error) redirect(`/admin/affiliates/${id || 'new'}?error=${encodeURIComponent(error)}`);
  redirect(`/admin/affiliates/${saved}?notice=saved`);
}

export async function createLink(form: FormData) {
  const admin = await requireAdmin(can.offers);
  const affiliateId = String(form.get('affiliateId'));
  let error = '';
  try {
    let target = String(form.get('targetPath') || '/').trim();
    if (!target.startsWith('/')) throw new Error('The landing page must be a path on the website, starting with /, e.g. /courses/numerology-career-launchpad');
    if (target.startsWith('//')) throw new Error('Use a path on the website, not another address.');
    const db = await getDb();
    const code = randomCode(10);
    const linkId = randomUUID();
    await db.execute(`insert into affiliate_links (id, code, affiliate_id, coupon_id, storefront_id, target_path, label, created_by) values (?, ?, ?, ?, ?, ?, ?, ?)`,
      [linkId, code, affiliateId, String(form.get('couponId') || '') || null, String(form.get('storefront') || 'numericcvaastu'), target, String(form.get('label') || '').trim(), admin.id]);
    await audit(admin.id, 'affiliate_link.create', 'affiliate_link', linkId, {affiliateId, target});
  } catch (e) { error = (e as Error).message; }
  if (error) redirect(`/admin/affiliates/${affiliateId}?error=${encodeURIComponent(error)}`);
  redirect(`/admin/affiliates/${affiliateId}?notice=created`);
}

export async function toggleLink(form: FormData) {
  const admin = await requireAdmin(can.offers);
  const id = String(form.get('linkId'));
  const affiliateId = String(form.get('affiliateId'));
  const db = await getDb();
  await db.execute('update affiliate_links set active = not active where id = ?', [id]);
  const row = await db.one<{active: boolean}>('select active from affiliate_links where id = ?', [id]);
  await audit(admin.id, row?.active ? 'affiliate_link.enable' : 'affiliate_link.disable', 'affiliate_link', id);
  redirect(`/admin/affiliates/${affiliateId}?notice=saved`);
}
