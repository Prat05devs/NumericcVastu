import type {Request, Response, RequestHandler, Router} from 'express';
import type {z} from 'zod';
import {AppError} from './errors.js';

/** JSON wire format: bigint → decimal string; Prisma Decimal and Date serialise themselves. */
export function jsonReplacer(_key: string, value: unknown) {
  return typeof value === 'bigint' ? value.toString() : value;
}
/** Plain JSON copy with bigint converted, for storing responses (idempotency) and snapshots. */
export const toPlain = <T>(value: T): unknown => JSON.parse(JSON.stringify(value, jsonReplacer));

export function send(res: Response, data: unknown, status = 200, meta: Record<string, unknown> = {}) {
  res.status(status).json({data, meta: {requestId: res.locals['requestId'], ...meta}});
}

export function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input ?? {});
  if (!result.success) {
    throw new AppError('VALIDATION_FAILED', 422, 'Some fields need attention.', result.error.issues.map((i) => ({path: i.path.join('.'), message: i.message})));
  }
  return result.data;
}

export const param = (req: Request, name: string): string => {
  const value = req.params[name];
  if (typeof value !== 'string' || !value) throw new AppError('NOT_FOUND', 404, 'Not found.');
  return value;
};

// ---- Route registry: every route is declared once with its access rule and schemas; OpenAPI is generated from it
// and a contract test checks that nothing is mounted without an entry.
export type Access = 'PUBLIC' | 'CUSTOMER' | 'CART_OWNER' | 'ORDER_OWNER' | 'REQUEST_OWNER' | 'WEBHOOK' | 'CRON' | 'INTERNAL' | 'DEV' | `STAFF:${string}`;
export type RouteSpec = {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string; // Express path relative to /api/v1
  access: Access;
  summary: string;
  tag: string;
  body?: z.ZodType;
  query?: z.ZodType;
  idempotent?: boolean;
};
export const registry: RouteSpec[] = [];
const prefixes = new WeakMap<Router, string>();
/** Declares where a router is mounted under /api/v1 so the registry (and OpenAPI) records full paths. */
export function mounted<R extends Router>(router: R, prefix: string): R { prefixes.set(router, prefix); return router; }

export function route(router: Router, spec: RouteSpec, ...handlers: RequestHandler[]) {
  registry.push({...spec, path: `${prefixes.get(router) ?? ''}${spec.path}`});
  router[spec.method](spec.path, ...handlers);
}

export const noStore = (res: Response) => res.setHeader('Cache-Control', 'no-store, private');
export const publicCache = (res: Response, seconds: number) => res.setHeader('Cache-Control', `public, max-age=${seconds}, s-maxage=${seconds}, stale-while-revalidate=${seconds * 2}`);

/** Cursor helpers: opaque base64url of the last row's sort key. */
export const encodeCursor = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
export function decodeCursor<T>(cursor: string | undefined): T | null {
  if (!cursor) return null;
  try { return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as T; } catch { throw new AppError('VALIDATION_FAILED', 422, 'Invalid cursor.'); }
}
