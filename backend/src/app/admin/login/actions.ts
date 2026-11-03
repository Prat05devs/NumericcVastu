'use server';
import {redirect} from 'next/navigation';
import {randomUUID, timingSafeEqual} from 'node:crypto';
import {getDb} from '../../../lib/db.ts';
import {hashPassword, verifyPassword} from '../../../lib/crypto.ts';
import {createSession, endSession, LOCK_MINUTES, MAX_FAILED_LOGINS} from '../../../lib/auth.ts';
import {audit} from '../../../lib/audit.ts';

const back = (error: string) => redirect(`/admin/login?error=${encodeURIComponent(error)}`);

export async function signIn(form: FormData) {
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  const db = await getDb();
  const admin = await db.one<{id: string; password_hash: string; active: boolean; locked_until: Date | null; failed_logins: number}>(
    'select id, password_hash, active, locked_until, failed_logins from admin_users where email = ?', [email]);
  if (admin?.locked_until && new Date(admin.locked_until) > new Date()) back(`Too many attempts. Try again after ${LOCK_MINUTES} minutes.`);
  const valid = admin?.active && (await verifyPassword(password, admin.password_hash));
  if (!admin || !valid) {
    if (admin) {
      const failures = admin.failed_logins + 1;
      const locked = failures >= MAX_FAILED_LOGINS;
      await db.execute(`update admin_users set failed_logins = ?, locked_until = ${locked ? 'DATE_ADD(NOW(3), INTERVAL ? MINUTE)' : 'NULL'} where id = ?`,
        locked ? [0, LOCK_MINUTES, admin.id] : [failures, admin.id]);
      await audit(admin.id, 'login.failed', 'admin_user', admin.id);
    }
    back('Email or password is incorrect.');
  }
  await db.execute('update admin_users set failed_logins = 0, locked_until = null, last_login_at = now() where id = ?', [admin!.id]);
  await createSession(admin!.id);
  await audit(admin!.id, 'login', 'admin_user', admin!.id);
  redirect('/admin');
}

/** First run only: creates the owner account when ADMIN_SETUP_TOKEN matches and no account exists yet. */
export async function createOwner(form: FormData) {
  const expected = process.env.ADMIN_SETUP_TOKEN || '';
  const token = String(form.get('token') || '');
  const name = String(form.get('name') || '').trim();
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  const db = await getDb();
  if ((await db.one<{n: number}>('select count(*) as n from admin_users'))!.n > 0) back('An owner already exists. Sign in instead.');
  if (!expected || token.length !== expected.length || !timingSafeEqual(Buffer.from(token), Buffer.from(expected))) back('The setup token is not correct.');
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) back('Enter your name and a valid email.');
  if (password.length < 12) back('Use a password of at least 12 characters.');
  const id = randomUUID();
  await db.execute(`insert into admin_users (id, email, name, password_hash, role) values (?, ?, ?, ?, 'owner')`, [id, email, name, await hashPassword(password)]);
  await audit(id, 'setup.owner', 'admin_user', id);
  await createSession(id);
  redirect('/admin');
}

export async function signOut() {
  await endSession();
  redirect('/admin/login');
}
