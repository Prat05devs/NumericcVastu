import {randomBytes} from 'node:crypto';

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** ULID: 48-bit millisecond time + 80 random bits, Crockford base32, 26 characters, sortable by creation time. */
export function ulid(now = Date.now()): string {
  let time = '';
  let t = now;
  for (let i = 0; i < 10; i++) { time = CROCKFORD[t % 32] + time; t = Math.floor(t / 32); }
  const bytes = randomBytes(10);
  let bits = 0n;
  for (const b of bytes) bits = (bits << 8n) | BigInt(b);
  let rand = '';
  for (let i = 0; i < 16; i++) { rand = CROCKFORD[Number(bits & 31n)] + rand; bits >>= 5n; }
  return time + rand;
}

/** Short human code for orders and requests, e.g. NVC-7K3M9Q. No look-alike characters. */
export function publicCode(prefix: string): string {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const bytes = randomBytes(8);
  let code = '';
  for (const b of bytes) code += alphabet[b % alphabet.length];
  return `${prefix}-${code}`;
}
