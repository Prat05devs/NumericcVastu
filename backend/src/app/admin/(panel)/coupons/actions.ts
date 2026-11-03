'use server';
import {redirect} from 'next/navigation';
import {randomUUID} from 'node:crypto';
import {getDb, isDuplicate} from '../../../../lib/db.ts';
import {can, requireAdmin} from '../../../../lib/auth.ts';
import {audit} from '../../../../lib/audit.ts';
import {parseDiscount, parseIst} from '../../../../lib/format.ts';
import {normaliseCode} from '../../../../lib/commerce.ts';

const intOrNull = (value: FormDataEntryValue | null) => {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const n = Number(text);
  if (!Number.isInteger(n) || n < 1) throw new Error('Usage limits must be whole numbers of 1 or more.');
  return n;
};

/** Creates (no id) or updates a coupon. */
export async function saveCoupon(form: FormData) {
  const admin = await requireAdmin(can.offers);
  const id = String(form.get('id') || '');
  let saved = id;
  let error = '';
  try {
    const code = normaliseCode(String(form.get('code') || ''));
    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) throw new Error('Codes use 3–32 letters, numbers, dashes or underscores.');
    const startsAt = parseIst(form.get('startsAt'));
    const endsAt = parseIst(form.get('endsAt'));
    if (startsAt && endsAt && endsAt <= startsAt) throw new Error('The end must be after the start.');
    const values = [code, String(form.get('description') || '').trim(), JSON.stringify(parseDiscount(form)), JSON.stringify(form.getAll('storefronts').map(String)),
      startsAt, endsAt, intOrNull(form.get('maxRedemptions')), intOrNull(form.get('maxPerCustomer')),
      form.get('combinable') === 'on', form.get('active') === 'on'];
    const db = await getDb();
    if (id) {
      await db.execute(`update coupons set code=?, description=?, discount=?, storefronts=?, starts_at=?, ends_at=?,
        max_redemptions=?, max_per_customer=?, combinable=?, active=?, updated_at=NOW(3) where id=?`, [...values, id]);
      await audit(admin.id, 'coupon.update', 'coupon', id, {code});
    } else {
      saved = randomUUID();
      await db.execute(`insert into coupons (id, code, description, discount, storefronts, starts_at, ends_at, max_redemptions, max_per_customer, combinable, active, created_by)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [saved, ...values, admin.id]);
      await audit(admin.id, 'coupon.create', 'coupon', saved, {code});
    }
  } catch (e) {
    error = isDuplicate(e) ? 'That code is already used by another coupon.' : (e as Error).message;
  }
  if (error) redirect(`/admin/coupons/${id || 'new'}?error=${encodeURIComponent(error)}`);
  redirect(`/admin/coupons/${saved}?notice=saved`);
}

export async function deleteCoupon(form: FormData) {
  const admin = await requireAdmin(can.offers);
  const id = String(form.get('id'));
  const db = await getDb();
  const used = await db.one<{n: number}>('select count(*) as n from redemptions where coupon_id = ?', [id]);
  if (used!.n > 0) redirect(`/admin/coupons/${id}?error=${encodeURIComponent('This coupon has been used, so it is kept for the records. Switch it off instead.')}`);
  await db.execute('delete from coupons where id = ?', [id]);
  await audit(admin.id, 'coupon.delete', 'coupon', id);
  redirect('/admin/coupons?notice=deleted');
}
