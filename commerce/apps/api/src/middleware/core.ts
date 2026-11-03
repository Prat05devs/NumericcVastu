import type {NextFunction, Request, Response} from 'express';
import {parse as parseCookie} from 'cookie';
import {env} from '../config/env.js';
import {AppError} from '../lib/errors.js';
import {ulid} from '../lib/ids.js';
import {logger} from '../lib/logger.js';
import {safeEqual} from '../lib/crypto.js';

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const incoming = req.get('X-Request-Id');
  const id = incoming && /^[A-Za-z0-9_-]{8,64}$/.test(incoming) ? incoming : `req_${ulid()}`;
  res.locals['requestId'] = id;
  res.setHeader('X-Request-Id', id);
  res.locals['cookies'] = parseCookie(req.headers.cookie ?? '');
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    const routePath = (req.route?.path as string | undefined) ?? 'unmatched';
    logger.info({requestId: id, method: req.method, route: `${req.baseUrl}${routePath}`, status: res.statusCode, ms: Math.round(ms)}, 'request');
  });
  next();
}

export const cookies = (res: Response): Record<string, string | undefined> => res.locals['cookies'] ?? {};

/** Allowlisted CORS with credentials. Webhooks and cron are server-to-server and need no CORS. */
export function allowedOrigins(): Set<string> {
  return new Set(env().CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean));
}
export function cors(req: Request, res: Response, next: NextFunction) {
  const origin = req.get('Origin');
  if (origin && allowedOrigins().has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-CSRF-Token,Idempotency-Key,X-Cart-Token,X-Order-Token,X-Request-Token,X-Request-Id');
      res.setHeader('Access-Control-Max-Age', '600');
      res.status(204).end();
      return;
    }
  } else if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  next();
}

/**
 * CSRF for cookie-authenticated writes: a browser write that carries one of our cookies must come from an allowlisted
 * Origin and echo the sc_csrf cookie in X-CSRF-Token (double submit). Header-token clients (no cookies) are exempt
 * because a cross-site page cannot set those headers.
 */
const AUTH_COOKIES = ['sc_session', 'sc_staff', 'sc_cart'];
export function csrf(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const jar = cookies(res);
  if (!AUTH_COOKIES.some((c) => jar[c])) return next();
  const origin = req.get('Origin');
  if (origin && !allowedOrigins().has(origin)) return next(new AppError('CSRF', 403, 'Request origin not allowed.'));
  const token = req.get('X-CSRF-Token') ?? '';
  const cookie = jar['sc_csrf'] ?? '';
  if (!cookie || !token || !safeEqual(cookie, token)) return next(new AppError('CSRF', 403, 'Missing or invalid CSRF token. Refresh the page and try again.'));
  next();
}

/**
 * Fixed-window rate limits per bucket and client. In-process memory is correct for the single API process on
 * Hostinger (ADR-0009); it resets on restart and must move to a shared store if the API is ever scaled out.
 */
const windows = new Map<string, {count: number; resetAt: number}>();
export function rateLimit(bucket: string, limit: number, windowMs: number, keyOf: (req: Request) => string = (req) => req.ip ?? 'unknown') {
  return (req: Request, res: Response, next: NextFunction) => {
    if ((env().NODE_ENV === 'test' && req.get('X-Test-Rate-Limit') !== 'on') || env().LOAD_TEST_DISABLE_RATE_LIMITS) return next();
    const key = `${bucket}:${keyOf(req)}`;
    const now = Date.now();
    let w = windows.get(key);
    if (!w || w.resetAt <= now) { w = {count: 0, resetAt: now + windowMs}; windows.set(key, w); }
    w.count++;
    if (windows.size > 50_000) for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k);
    res.setHeader('RateLimit-Limit', String(limit));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, limit - w.count)));
    if (w.count > limit) {
      res.setHeader('Retry-After', String(Math.ceil((w.resetAt - now) / 1000)));
      return next(new AppError('RATE_LIMITED', 429, 'Too many requests. Please wait a moment and try again.'));
    }
    next();
  };
}
export const resetRateLimits = () => windows.clear();
