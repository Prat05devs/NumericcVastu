import {IN_V4, IN_V6} from '../data/indiaIp';

/**
 * Is this visitor in India? Hostinger's CDN sends no country header (Vercel and Cloudflare did), so the visitor's IP
 * is checked against India's address ranges (data/indiaIp.js). Returns 'IN', 'ZZ' (anywhere else) or '' (no usable IP).
 */
const PRIVATE_V4 = [[0x0a000000, 0x0affffff], [0x7f000000, 0x7fffffff], [0xac100000, 0xac1fffff], [0xc0a80000, 0xc0a8ffff], [0x64400000, 0x647fffff], [0xa9fe0000, 0xa9feffff]];
function v4ToNum(ip) {
  const p = ip.split('.');
  if (p.length !== 4 || p.some((x) => !/^\d{1,3}$/.test(x) || Number(x) > 255)) return null;
  return ((Number(p[0]) << 24) >>> 0) + (Number(p[1]) << 16) + (Number(p[2]) << 8) + Number(p[3]);
}
function v6Top64(ip) {
  if (!ip.includes(':')) return null;
  const [head, tail = ''] = ip.split('::');
  const h = head ? head.split(':') : [];
  const t = ip.includes('::') ? (tail ? tail.split(':') : []) : [];
  const groups = ip.includes('::') ? [...h, ...Array(8 - h.length - t.length).fill('0'), ...t] : h;
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/i.test(g))) return null;
  return BigInt(`0x${groups.slice(0, 4).map((g) => g.padStart(4, '0')).join('')}`);
}
function inRanges(n, list, toNum) {
  let lo = 0, hi = list.length / 2 - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const a = toNum(list[mid * 2]), b = toNum(list[mid * 2 + 1]);
    if (n < a) hi = mid - 1; else if (n > b) lo = mid + 1; else return true;
  }
  return false;
}
const V6 = IN_V6.map((h) => BigInt(`0x${h}`));
export function countryOfIp(raw) {
  const ip = String(raw || '').trim().replace(/^::ffff:/i, '').replace(/^\[|\]$/g, '');
  const n4 = v4ToNum(ip);
  if (n4 !== null) {
    if (PRIVATE_V4.some(([a, b]) => n4 >= a && n4 <= b)) return '';
    return inRanges(n4, IN_V4, (x) => x) ? 'IN' : 'ZZ';
  }
  const n6 = v6Top64(ip);
  if (n6 === null || n6 === 0n || (n6 >> 57n) === 0x7en) return ''; // unspecified/loopback, fc00::/7 private
  return inRanges(n6, V6, (x) => x) ? 'IN' : 'ZZ';
}
/** The visitor's IP as forwarded by the CDN: the first public address in the chain. */
export function clientIp(headers) {
  const chain = [headers.get('x-real-ip'), ...(headers.get('x-forwarded-for') || '').split(',')].map((s) => s && s.trim()).filter(Boolean);
  return chain.find((ip) => countryOfIp(ip) !== '') || '';
}
