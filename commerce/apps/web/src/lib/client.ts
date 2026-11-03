'use client';

/**
 * Browser calls to the commerce API (same origin via the /api/v1 proxy). Adds the CSRF header for cookie-backed
 * writes and an Idempotency-Key where the API requires one. Amounts stay decimal paise strings end to end.
 */
export type ApiError = {code: string; message: string; details?: unknown};
export type Result<T> = {ok: true; status: number; data: T; meta: Record<string, unknown>} | {ok: false; status: number; error: ApiError};

const readCookie = (name: string) => document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1);

async function csrf(): Promise<string> {
  let token = readCookie('sc_csrf');
  if (!token) {
    const res = await fetch('/api/v1/auth/csrf', {credentials: 'include'});
    token = ((await res.json()) as {data: {csrfToken: string}}).data.csrfToken;
  }
  return decodeURIComponent(token);
}

export function newKey() {
  return crypto.randomUUID();
}

export async function call<T = unknown>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Result<T>> {
  const init: RequestInit = {method, credentials: 'include', headers: {...headers}};
  if (method !== 'GET') {
    init.headers = {'Content-Type': 'application/json', 'X-CSRF-Token': await csrf(), ...headers};
    if (body !== undefined) init.body = JSON.stringify(body);
  }
  let res: Response;
  try { res = await fetch(`/api/v1${path}`, init); } catch { return {ok: false, status: 0, error: {code: 'NETWORK', message: 'You appear to be offline. Please try again.'}}; }
  if (res.headers.get('content-type')?.includes('text/csv')) return {ok: true, status: res.status, data: (await res.text()) as T, meta: {}};
  const json = (await res.json().catch(() => null)) as {data?: T; meta?: Record<string, unknown>; error?: ApiError} | null;
  if (!res.ok || !json || json.error) return {ok: false, status: res.status, error: json?.error ?? {code: 'INTERNAL', message: 'Something went wrong. Please try again.'}};
  return {ok: true, status: res.status, data: json.data as T, meta: json.meta ?? {}};
}

export const get = <T,>(path: string, headers?: Record<string, string>) => call<T>('GET', path, undefined, headers);
export const post = <T,>(path: string, body?: unknown, headers?: Record<string, string>) => call<T>('POST', path, body ?? {}, headers);
