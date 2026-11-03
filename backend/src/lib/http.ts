import {getDb} from './db.ts';
import {sha256} from './crypto.ts';

/**
 * Helpers for the public API used by the storefronts.
 * - Browser calls (config, quotes) are allowed from each storefront's registered origins (CORS).
 * - Server-to-server calls (recording a paid order) need the storefront's API key: "Authorization: Bearer nvk_…".
 */
type Storefront = {id: string; allowed_origins: string[]};
let cache: {at: number; rows: Storefront[]} | null = null;

export async function storefronts(): Promise<Storefront[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.rows;
  const rows = await (await getDb()).query<Storefront>('select id, allowed_origins from storefronts');
  cache = {at: Date.now(), rows};
  return rows;
}
export const clearStorefrontCache = () => { cache = null; };

export async function corsHeaders(request: Request): Promise<Record<string, string>> {
  const origin = request.headers.get('origin');
  const base = {'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '600', Vary: 'Origin'};
  if (!origin) return base;
  const allowed = (await storefronts()).some((s) => s.allowed_origins.includes(origin));
  return allowed ? {...base, 'Access-Control-Allow-Origin': origin} : base;
}

export async function json(request: Request, body: unknown, status = 200): Promise<Response> {
  return Response.json(body, {status, headers: {...(await corsHeaders(request)), 'Cache-Control': 'no-store'}});
}

export async function preflight(request: Request): Promise<Response> {
  return new Response(null, {status: 204, headers: await corsHeaders(request)});
}

/** The storefront whose API key is in the Authorization header, or null. */
export async function authenticatedStorefront(request: Request): Promise<string | null> {
  const key = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!key) return null;
  const row = await (await getDb()).one<{id: string}>('select id from storefronts where api_key_hash = ?', [sha256(key)]);
  return row?.id ?? null;
}

export async function knownStorefront(id: string | null): Promise<boolean> {
  return !!id && (await storefronts()).some((s) => s.id === id);
}
