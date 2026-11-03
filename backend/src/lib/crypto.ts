import {createCipheriv, createDecipheriv, createHash, randomBytes, randomInt, scrypt, timingSafeEqual} from 'node:crypto';

/** Thrown when a secret must be stored or read but SETTINGS_ENCRYPTION_KEY is missing or invalid. */
export class EncryptionKeyError extends Error {}

/**
 * The master key that encrypts every API key saved from the dashboard. It is the one secret kept in the hosting
 * environment: 32 random bytes, base64. Generate one with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 * Losing it makes the saved keys unreadable (re-enter them); changing it requires re-entering them too.
 */
function masterKey(): Buffer {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!raw) throw new EncryptionKeyError('SETTINGS_ENCRYPTION_KEY is not set, so keys cannot be stored or read.');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new EncryptionKeyError('SETTINGS_ENCRYPTION_KEY must be 32 bytes encoded as base64.');
  return key;
}

export function hasEncryptionKey(): boolean {
  try { masterKey(); return true; } catch { return false; }
}

/** AES-256-GCM: "v1:iv:tag:ciphertext", each part base64url. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', masterKey(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv, cipher.getAuthTag(), data].map((part) => (typeof part === 'string' ? part : part.toString('base64url'))).join(':');
}

export function decryptSecret(token: string): string {
  const [version, iv, tag, data] = token.split(':');
  if (version !== 'v1' || !iv || !tag || data === undefined) throw new Error('Unrecognised secret format.');
  const decipher = createDecipheriv('aes-256-gcm', masterKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}

const SCRYPT = {N: 16384, r: 8, p: 1, keylen: 64};
const scryptAsync = (password: string, salt: Buffer, keylen: number, options: {N: number; r: number; p: number}) =>
  new Promise<Buffer>((resolve, reject) => scrypt(password, salt, keylen, options, (error, key) => (error ? reject(error) : resolve(key))));

/** scrypt password hash: "scrypt:N:r:p:salt:hash". */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, SCRYPT.keylen, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64url'), hash.toString('base64url')].join(':');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, N, r, p, salt, hash] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = await scryptAsync(password, Buffer.from(salt, 'base64url'), expected.length, {N: Number(N), r: Number(r), p: Number(p)});
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');
export const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
/** An unguessable link code without look-alike characters: 10 characters ≈ 58 bits. */
export function randomCode(length = 10): string {
  let code = '';
  for (let i = 0; i < length; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

export const lastFour = (value: string) => value.slice(-4);
