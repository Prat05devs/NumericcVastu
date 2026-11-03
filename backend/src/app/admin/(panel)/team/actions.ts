'use server';
import {redirect} from 'next/navigation';
import {randomUUID} from 'node:crypto';
import {getDb, isDuplicate} from '../../../../lib/db.ts';
import {can, requireAdmin} from '../../../../lib/auth.ts';
import {audit} from '../../../../lib/audit.ts';
import {hashPassword} from '../../../../lib/crypto.ts';

const PAGE = '/admin/team';

export async function addMember(form: FormData) {
  const admin = await requireAdmin(can.team);
  const email = String(form.get('email') || '').trim().toLowerCase();
  const name = String(form.get('name') || '').trim();
  const role = String(form.get('role'));
  const password = String(form.get('password') || '');
  let error = '';
  try {
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Enter a name and a valid email.');
    if (!['owner', 'admin', 'marketing'].includes(role)) throw new Error('Choose a role.');
    if (password.length < 12) throw new Error('Give them a temporary password of at least 12 characters.');
    const newId = randomUUID();
    await (await getDb()).execute('insert into admin_users (id, email, name, password_hash, role) values (?, ?, ?, ?, ?)', [newId, email, name, await hashPassword(password), role]);
    await audit(admin.id, 'team.add', 'admin_user', newId, {email, role});
  } catch (e) { error = isDuplicate(e) ? 'Someone with that email already has an account.' : (e as Error).message; }
  redirect(`${PAGE}?${error ? `error=${encodeURIComponent(error)}` : 'notice=created'}`);
}

export async function setActive(form: FormData) {
  const admin = await requireAdmin(can.team);
  const id = String(form.get('id'));
  if (id === admin.id) redirect(`${PAGE}?error=${encodeURIComponent('You cannot switch off your own account.')}`);
  const db = await getDb();
  await db.execute('update admin_users set active = not active where id = ?', [id]);
  const row = await db.one<{active: boolean}>('select active from admin_users where id = ?', [id]);
  if (row && !row.active) await db.execute('delete from sessions where admin_id = ?', [id]);
  await audit(admin.id, row?.active ? 'team.enable' : 'team.disable', 'admin_user', id);
  redirect(`${PAGE}?notice=saved`);
}
