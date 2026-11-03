import 'server-only';

/**
 * Server-side reads of PUBLIC data (catalogue, content). Cached with short revalidation and tags that the API
 * invalidates through /api/revalidate when staff publish changes. Private data is never fetched here.
 */
const API = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';
export const STOREFRONT = 'crystal';

export type Envelope<T> = {data: T; meta: {requestId: string; nextCursor?: string | null}};

export async function apiGet<T>(path: string, opts: {revalidate?: number; tags?: string[]} = {}): Promise<Envelope<T> | null> {
  try {
    const res = await fetch(`${API}/api/v1${path}`, {headers: {'X-Storefront': STOREFRONT}, next: {revalidate: opts.revalidate ?? 60, tags: opts.tags ?? ['catalogue']}});
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API ${res.status} for ${path}`);
    return (await res.json()) as Envelope<T>;
  } catch (error) {
    // Degrade honestly when the API is unreachable: pages render an "unavailable" state instead of crashing.
    console.error('[web] API read failed', path, (error as Error).message);
    return null;
  }
}
