import type {NextFunction, Request, Response} from 'express';
import {can, type Permission, type StaffRole, STAFF_ROLES} from '@sc/contracts';
import {env} from '../config/env.js';
import {prisma} from '../lib/db.js';
import {AppError} from '../lib/errors.js';
import {randomToken, sha256} from '../lib/crypto.js';
import {ulid} from '../lib/ids.js';
import {cookies} from './core.js';

export type AuthUser = {id: string; email: string | null; name: string | null; role: string};
export type Auth = {user: AuthUser; sessionId: string; kind: 'CUSTOMER' | 'STAFF'; mfaVerified: boolean} | null;

const CUSTOMER_DAYS = 30;
const STAFF_HOURS = 12;

function cookieBase() {
  return {httpOnly: true, secure: env().NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', ...(env().COOKIE_DOMAIN && {domain: env().COOKIE_DOMAIN})};
}
export function setCookie(res: Response, name: string, value: string, maxAgeMs: number, httpOnly = true) {
  res.cookie(name, value, {...cookieBase(), httpOnly, maxAge: maxAgeMs});
}
export function clearCookie(res: Response, name: string) {
  res.clearCookie(name, cookieBase());
}
/** Double-submit CSRF token, readable by the web app's JavaScript. */
export function issueCsrf(res: Response): string {
  const token = randomToken(24);
  setCookie(res, 'sc_csrf', token, 30 * 24 * 3600_000, false);
  return token;
}

/** Creates a session (rotating any previous one) and sets its cookie. Tokens are stored only as SHA-256 hashes. */
export async function startSession(res: Response, userId: string, kind: 'CUSTOMER' | 'STAFF', mfaVerified: boolean, previousSessionId?: string, meta?: object) {
  if (previousSessionId) await prisma.session.updateMany({where: {id: previousSessionId, revokedAt: null}, data: {revokedAt: new Date()}});
  const token = randomToken(32);
  const ttl = kind === 'STAFF' ? STAFF_HOURS * 3600_000 : CUSTOMER_DAYS * 24 * 3600_000;
  await prisma.session.create({data: {id: ulid(), userId, tokenHash: sha256(token), kind, mfaVerified, expiresAt: new Date(Date.now() + ttl), deviceMetadata: meta ?? {}}});
  setCookie(res, kind === 'STAFF' ? 'sc_staff' : 'sc_session', token, ttl);
  issueCsrf(res);
}

async function load(token: string | undefined, kind: 'CUSTOMER' | 'STAFF'): Promise<Auth> {
  if (!token || token.length > 100) return null;
  const session = await prisma.session.findUnique({where: {tokenHash: sha256(token)}, include: {user: {select: {id: true, email: true, name: true, role: true, status: true}}}});
  if (!session || session.kind !== kind || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE') return null;
  return {user: {id: session.user.id, email: session.user.email, name: session.user.name, role: session.user.role}, sessionId: session.id, kind, mfaVerified: session.mfaVerified};
}

/** Loads both identities if present: the shopper session and, separately, a staff session for /admin. */
export async function loadAuth(req: Request, res: Response, next: NextFunction) {
  const jar = cookies(res);
  res.locals['customer'] = await load(jar['sc_session'], 'CUSTOMER');
  res.locals['staff'] = req.path.startsWith('/admin') || req.path.startsWith('/auth/staff') ? await load(jar['sc_staff'], 'STAFF') : null;
  next();
}

export const customerOf = (res: Response): Auth => res.locals['customer'] ?? null;
export const staffOf = (res: Response): NonNullable<Auth> => res.locals['staff'];

export function requireCustomer(req: Request, res: Response, next: NextFunction) {
  if (!customerOf(res)) return next(new AppError('UNAUTHENTICATED', 401, 'Please sign in.'));
  next();
}

/** Staff route guard: STAFF session, completed MFA, active staff role, and the permission from the RBAC matrix. */
export function requireStaff(permission: Permission | null) {
  return (req: Request, res: Response, next: NextFunction) => {
    const staff = res.locals['staff'] as Auth;
    if (!staff) return next(new AppError('UNAUTHENTICATED', 401, 'Please sign in to the back office.'));
    if (!staff.mfaVerified) return next(new AppError('MFA_REQUIRED', 403, 'Two-factor authentication is required.'));
    if (!(STAFF_ROLES as readonly string[]).includes(staff.user.role)) return next(new AppError('FORBIDDEN', 403, 'You do not have permission to do that.'));
    if (permission && !can(staff.user.role as StaffRole, permission)) return next(new AppError('FORBIDDEN', 403, 'You do not have permission to do that.'));
    next();
  };
}

export const auditCtx = (req: Request, res: Response) => ({actorId: (res.locals['staff'] as Auth)?.user.id ?? customerOf(res)?.user.id ?? null, ip: req.ip, requestId: res.locals['requestId'] as string});
