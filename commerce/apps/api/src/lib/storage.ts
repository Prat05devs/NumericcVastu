import {createHash, createHmac} from 'node:crypto';
import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {env} from '../config/env.js';
import {AppError} from './errors.js';
import {hmacHex, safeEqual} from './crypto.js';

/**
 * Uploads go straight to storage through short-lived signed URLs (Section 06: "uploads only by presigned endpoints").
 * s3: AWS Signature V4 query presign, compatible with S3, Cloudflare R2, Backblaze B2 and MinIO.
 * local: a signed one-time URL on the API (development only).
 */
const ALLOWED = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'application/pdf': 'pdf'} as const;
export type UploadType = keyof typeof ALLOWED;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function objectKeyFor(prefix: 'products' | 'certificates', ownerId: string, id: string, contentType: string) {
  const ext = ALLOWED[contentType as UploadType];
  if (!ext) throw new AppError('VALIDATION_FAILED', 422, 'Only JPEG, PNG, WebP, AVIF images and PDF reports are accepted.');
  return `${prefix}/${ownerId}/${id}.${ext}`;
}

const hex = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
const hmac = (k: Buffer | string, d: string) => createHmac('sha256', k).update(d).digest();

export function presignS3Put(key: string, contentType: string, expiresSeconds = 600, now = new Date()) {
  const e = env();
  const endpoint = new URL(e.OBJECT_STORAGE_ENDPOINT!);
  const host = endpoint.host;
  const path = `/${e.OBJECT_STORAGE_BUCKET}/${key.split('/').map(encodeURIComponent).join('/')}`;
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = amzDate.slice(0, 8);
  const scope = `${date}/${e.OBJECT_STORAGE_REGION}/s3/aws4_request`;
  const params = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256', 'X-Amz-Credential': `${e.OBJECT_STORAGE_ACCESS_KEY}/${scope}`, 'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresSeconds), 'X-Amz-SignedHeaders': 'content-type;host',
  });
  params.sort();
  const canonical = ['PUT', path, params.toString().replace(/\+/g, '%20'), `content-type:${contentType}\nhost:${host}\n`, 'content-type;host', 'UNSIGNED-PAYLOAD'].join('\n');
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, hex(canonical)].join('\n');
  const kSigning = hmac(hmac(hmac(hmac(`AWS4${e.OBJECT_STORAGE_SECRET_KEY}`, date), e.OBJECT_STORAGE_REGION), 's3'), 'aws4_request');
  params.set('X-Amz-Signature', createHmac('sha256', kSigning).update(toSign).digest('hex'));
  return `${endpoint.protocol}//${host}${path}?${params.toString().replace(/\+/g, '%20')}`;
}

export function presignUpload(key: string, contentType: string) {
  if (env().STORAGE_DRIVER === 's3') return {method: 'PUT' as const, url: presignS3Put(key, contentType), headers: {'Content-Type': contentType}, objectKey: key, expiresInSeconds: 600};
  const exp = Date.now() + 600_000;
  const token = Buffer.from(JSON.stringify({key, contentType, exp})).toString('base64url');
  const sig = hmacHex(env().SESSION_SECRET, `upload:${token}`);
  return {method: 'PUT' as const, url: `${env().API_BASE_URL}/api/v1/admin/uploads/${token}.${sig}`, headers: {'Content-Type': contentType}, objectKey: key, expiresInSeconds: 600};
}

export async function acceptLocalUpload(tokenWithSig: string, contentType: string | undefined, body: Buffer) {
  const [token = '', sig = ''] = tokenWithSig.split('.');
  if (!safeEqual(hmacHex(env().SESSION_SECRET, `upload:${token}`), sig)) throw new AppError('FORBIDDEN', 403, 'Invalid upload link.');
  const {key, contentType: expected, exp} = JSON.parse(Buffer.from(token, 'base64url').toString('utf8')) as {key: string; contentType: string; exp: number};
  if (exp < Date.now()) throw new AppError('FORBIDDEN', 403, 'Upload link expired.');
  if (contentType !== expected) throw new AppError('VALIDATION_FAILED', 422, 'Content type does not match the signed upload.');
  if (body.length === 0 || body.length > MAX_UPLOAD_BYTES) throw new AppError('VALIDATION_FAILED', 413, 'File is empty or larger than 10 MB.');
  const root = resolve(env().STORAGE_LOCAL_DIR);
  const target = resolve(join(root, key));
  if (!target.startsWith(root + '/')) throw new AppError('FORBIDDEN', 403, 'Invalid key.');
  await mkdir(dirname(target), {recursive: true});
  await writeFile(target, body);
  return {objectKey: key, bytes: body.length};
}
