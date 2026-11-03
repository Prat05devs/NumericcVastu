import {Router, type NextFunction, type Request, type Response} from 'express';
import {z} from 'zod';
import * as C from '@sc/contracts';
import {prisma} from '../lib/db.js';
import {AppError} from '../lib/errors.js';
import {decrypt, encrypt, newTotpSecret, verifyPassword, verifyTotp} from '../lib/crypto.js';
import {noStore, parse, route, send} from '../lib/http.js';
import {audit} from '../lib/audit.js';
import {rateLimit} from '../middleware/core.js';
import {auditCtx, clearCookie, staffOf, startSession, type Auth} from '../middleware/auth.js';

export const staffAuthRouter = Router();
const r = staffAuthRouter;
const limit = rateLimit('staff-auth', 10, 60_000);
const LOCK_AFTER = 5;
const LOCK_MINUTES = 15;

function staffSession(req: Request, res: Response, next: NextFunction) {
  if (!(res.locals['staff'] as Auth)) return next(new AppError('UNAUTHENTICATED', 401, 'Please sign in to the back office.'));
  next();
}

route(r, {method: 'post', path: '/auth/staff/login', access: 'PUBLIC', tag: 'Staff auth', summary: 'Staff password + TOTP sign-in (lockout after 5 failures)', body: C.StaffLogin}, limit, async (req, res) => {
  noStore(res);
  const {email, password, totp} = parse(C.StaffLogin, req.body);
  const user = await prisma.user.findUnique({where: {email}});
  const generic = new AppError('UNAUTHENTICATED', 401, 'Email or password is incorrect.');
  const isStaff = user && (C.STAFF_ROLES as readonly string[]).includes(user.role) && user.status === 'ACTIVE';
  if (user?.lockedUntil && user.lockedUntil > new Date()) throw new AppError('RATE_LIMITED', 429, 'Too many attempts. Try again later.');
  const ok = await verifyPassword(password, isStaff ? user.passwordHash : null);
  if (!isStaff || !ok) {
    if (user) {
      const fails = user.failedLogins + 1;
      await prisma.user.update({where: {id: user.id}, data: {failedLogins: fails >= LOCK_AFTER ? 0 : fails, ...(fails >= LOCK_AFTER && {lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000)})}});
      await audit(prisma, {actorId: user.id, ip: req.ip, requestId: res.locals['requestId']}, 'staff.login_failed', 'user', user.id, {fails});
    }
    throw generic;
  }
  let mfaVerified = false;
  if (user.mfaEnabledAt && user.mfaSecretEnc) {
    if (!totp) throw new AppError('MFA_REQUIRED', 401, 'Enter the 6-digit code from your authenticator app.');
    if (!verifyTotp(decrypt(user.mfaSecretEnc), totp)) {
      await prisma.user.update({where: {id: user.id}, data: {failedLogins: {increment: 1}}});
      throw generic;
    }
    mfaVerified = true;
  }
  await prisma.user.update({where: {id: user.id}, data: {failedLogins: 0, lockedUntil: null, lastLoginAt: new Date()}});
  await startSession(res, user.id, 'STAFF', mfaVerified, staffOf(res)?.sessionId, {ua: req.get('User-Agent')?.slice(0, 200)});
  await audit(prisma, {actorId: user.id, ip: req.ip, requestId: res.locals['requestId']}, 'staff.login', 'user', user.id, {mfaVerified});
  send(res, {user: {id: user.id, email: user.email, name: user.name, role: user.role}, mfaVerified, mfaSetupRequired: !user.mfaEnabledAt});
});

route(r, {method: 'get', path: '/auth/staff/me', access: 'STAFF:any', tag: 'Staff auth', summary: 'Current staff session'}, staffSession, async (_req, res) => {
  noStore(res);
  const s = staffOf(res);
  const perms = Object.keys(C.PERMISSIONS).filter((p) => C.can(s.user.role as C.StaffRole, p as C.Permission));
  send(res, {user: s.user, mfaVerified: s.mfaVerified, permissions: perms});
});

route(r, {method: 'post', path: '/auth/staff/mfa/setup', access: 'STAFF:any', tag: 'Staff auth', summary: 'Start authenticator (TOTP) enrolment'}, staffSession, limit, async (_req, res) => {
  noStore(res);
  const s = staffOf(res);
  const user = await prisma.user.findUniqueOrThrow({where: {id: s.user.id}});
  if (user.mfaEnabledAt) throw new AppError('CONFLICT', 409, 'Two-factor authentication is already enabled. Ask the owner to reset it.');
  const secret = newTotpSecret();
  await prisma.user.update({where: {id: user.id}, data: {mfaSecretEnc: encrypt(secret)}});
  const label = encodeURIComponent(`NumericcVaastu Back Office:${user.email}`);
  send(res, {secret, otpauthUri: `otpauth://totp/${label}?secret=${secret}&issuer=NumericcVaastu&algorithm=SHA1&digits=6&period=30`});
});

route(r, {method: 'post', path: '/auth/staff/mfa/confirm', access: 'STAFF:any', tag: 'Staff auth', summary: 'Confirm TOTP enrolment; upgrades the session', body: z.object({code: z.string().regex(/^\d{6}$/)})}, staffSession, limit, async (req, res) => {
  noStore(res);
  const {code} = parse(z.object({code: z.string().regex(/^\d{6}$/)}), req.body);
  const s = staffOf(res);
  const user = await prisma.user.findUniqueOrThrow({where: {id: s.user.id}});
  if (!user.mfaSecretEnc || user.mfaEnabledAt) throw new AppError('CONFLICT', 409, 'Start setup first.');
  if (!verifyTotp(decrypt(user.mfaSecretEnc), code)) throw new AppError('INVALID_OTP', 422, 'That code is not correct. Check the time on your phone and try again.');
  await prisma.user.update({where: {id: user.id}, data: {mfaEnabledAt: new Date()}});
  await startSession(res, user.id, 'STAFF', true, s.sessionId);
  await audit(prisma, auditCtx(req, res), 'staff.mfa_enabled', 'user', user.id);
  send(res, {mfaEnabled: true});
});

route(r, {method: 'post', path: '/auth/staff/logout', access: 'STAFF:any', tag: 'Staff auth', summary: 'End staff session'}, async (_req, res) => {
  const s = res.locals['staff'] as Auth;
  if (s) await prisma.session.updateMany({where: {id: s.sessionId}, data: {revokedAt: new Date()}});
  clearCookie(res, 'sc_staff');
  send(res, {signedOut: true});
});
