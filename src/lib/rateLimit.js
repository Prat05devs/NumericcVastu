import 'server-only';
import {clientIp} from './geo';

/**
 * Per-visitor request limits for the payment and coupon routes (in memory, per server process), so bots cannot flood
 * the back office with unpaid orders or guess coupon codes. Returns a 429 Response when over the limit, else null.
 */
const buckets = new Map();
export function limit(request, name, max, windowMs) {
  const who = clientIp(request.headers) || 'unknown';
  const key = `${name}:${who}`;
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 20000) for (const [k, v] of buckets) if (!v.length || now - v[v.length - 1] > windowMs) buckets.delete(k);
  if (hits.length <= max) return null;
  return Response.json({error: 'Too many attempts. Please wait a few minutes and try again.'}, {status: 429, headers: {'Retry-After': String(Math.ceil(windowMs / 1000))}});
}
