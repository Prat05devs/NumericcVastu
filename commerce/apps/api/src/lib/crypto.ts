import {createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, scrypt, timingSafeEqual} from 'node:crypto';
import {env} from '../config/env.js';

export const sha256 = (text: string | Buffer) => createHash('sha256').update(text).digest('hex');
export const hmacHex = (secret: string, data: string | Buffer) => createHmac('sha256', secret).update(data).digest('hex');
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** AES-256-GCM with ENCRYPTION_KEY: "v1:iv:tag:ciphertext" (base64url). Used for API keys, MFA secrets and private customer details. */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(env().ENCRYPTION_KEY, 'base64'), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join(':');
}
export function decrypt(token: string): string {
  const [v, iv, tag, data] = token.split(':');
  if (v !== 'v1' || !iv || !tag || data === undefined) throw new Error('Unrecognised ciphertext');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(env().ENCRYPTION_KEY, 'base64'), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}

const scryptAsync = (password: string, salt: Buffer, keylen: number) =>
  new Promise<Buffer>((resolve, reject) => scrypt(password, salt, keylen, {N: 16384, r: 8, p: 1}, (e, k) => (e ? reject(e) : resolve(k))));
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt:${salt.toString('base64url')}:${(await scryptAsync(password, salt, 64)).toString('base64url')}`;
}
export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const [scheme, salt, hash] = (stored ?? '').split(':');
  if (scheme !== 'scrypt' || !salt || !hash) { await scryptAsync(password, randomBytes(16), 64); return false; } // constant-ish time
  const expected = Buffer.from(hash, 'base64url');
  const actual = await scryptAsync(password, Buffer.from(salt, 'base64url'), expected.length);
  return timingSafeEqual(actual, expected);
}

export const sixDigitCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

// ---- TOTP (RFC 6238, SHA-1, 6 digits, 30 s) for staff MFA; no third-party dependency.
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
export function base32Decode(text: string): Buffer {
  let bits = 0, value = 0; const out: number[] = [];
  for (const ch of text.replace(/=+$/, '').toUpperCase()) { const i = B32.indexOf(ch); if (i < 0) continue; value = (value << 5) | i; bits += 5; if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(out);
}
export function totp(secretBase32: string, at = Date.now(), step = 30): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / step)));
  const h = createHmac('sha1', base32Decode(secretBase32)).update(counter).digest();
  const offset = h[h.length - 1]! & 15;
  const code = ((h.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0');
  return code;
}
/** Accepts the current code and one step either side for clock drift. */
export function verifyTotp(secretBase32: string, code: string, at = Date.now()): boolean {
  return [-1, 0, 1].some((w) => safeEqual(totp(secretBase32, at + w * 30_000), code));
}
export const newTotpSecret = () => base32Encode(randomBytes(20));
