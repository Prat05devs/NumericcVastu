import {randomUUID} from 'node:crypto';
import {cookies, headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {getDb} from './db.ts';
import {randomToken, sha256} from './crypto.ts';

/**
 * Back office sign-in. Sessions are random tokens in an httpOnly cookie; only their SHA-256 is stored.
 *
 * Roles:
 * - owner: everything, including payment and AI keys, storefront API keys and the team;
 * - admin: offers, affiliates, sales, catalogue and the audit log;
 * - marketing: offers, affiliates and sales.
 */
export type Role = 'owner' | 'admin' | 'marketing';
export type Admin = {id: string; email: string; name: string; role: Role};

const COOKIE = 'nv_admin_session';
const SESSION_HOURS = 12;
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;

export const can = {
  offers: ['owner', 'admin', 'marketing'] as Role[],
  catalogue: ['owner', 'admin'] as Role[],
  audit: ['owner', 'admin'] as Role[],
  settings: ['owner'] as Role[],
  team: ['owner'] as Role[],
};

export async function createSession(adminId: string): Promise<void> {
  const token = randomToken();
  const requestHeaders = await headers();
  const db = await getDb();
  await db.execute(
    'INSERT INTO sessions (id, token_hash, admin_id, expires_at, ip, user_agent) VALUES (?, ?, ?, DATE_ADD(NOW(3), INTERVAL ? HOUR), ?, ?)',
    [randomUUID(), sha256(token), adminId, SESSION_HOURS, requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || null, requestHeaders.get('user-agent')?.slice(0, 300) || null],
  );
  (await cookies()).set(COOKIE, token, {httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_HOURS * 3600});
}

export async function currentAdmin(): Promise<Admin | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const row = await db.one<Admin>(
    `select a.id, a.email, a.name, a.role from sessions s join admin_users a on a.id = s.admin_id
     where s.token_hash = ? and s.expires_at > NOW(3) and a.active = 1`,
    [sha256(token)],
  );
  return row ?? null;
}

/** Use at the top of every back office page and every server action. */
export async function requireAdmin(roles?: Role[]): Promise<Admin> {
  const admin = await currentAdmin();
  if (!admin) redirect('/admin/login');
  if (roles && !roles.includes(admin.role)) redirect('/admin?notice=forbidden');
  return admin;
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await (await getDb()).execute('delete from sessions where token_hash = ?', [sha256(token)]);
  jar.delete(COOKIE);
}
