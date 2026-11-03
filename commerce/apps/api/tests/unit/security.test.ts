import {describe, expect, it} from 'vitest';
import {base32Encode, decrypt, encrypt, hashPassword, totp, verifyPassword, verifyTotp} from '../../src/lib/crypto.js';
import {redact, maskEmail} from '../../src/lib/redact.js';
import {verifyRazorpaySignature, parseRazorpayEvent} from '../../src/providers/payments/index.js';
import {attributionToken} from '../../src/services/affiliates.js';
import {createHmac} from 'node:crypto';
import {presignS3Put} from '../../src/lib/storage.js';
import {resetEnvForTests} from '../../src/config/env.js';

describe('crypto', () => {
  it('AES-GCM round-trips and detects tampering', () => {
    const c = encrypt('rzp_test_secret');
    expect(c).not.toContain('rzp_test_secret');
    expect(decrypt(c)).toBe('rzp_test_secret');
    const parts = c.split(':');
    parts[3] = Buffer.from('tampered').toString('base64url');
    expect(() => decrypt(parts.join(':'))).toThrow();
  });
  it('scrypt passwords verify only the right password', async () => {
    const h = await hashPassword('a long passphrase');
    expect(await verifyPassword('a long passphrase', h)).toBe(true);
    expect(await verifyPassword('wrong', h)).toBe(false);
    expect(await verifyPassword('x', null)).toBe(false);
  });
  it('TOTP matches the RFC 6238 SHA-1 test vector', () => {
    const secret = base32Encode(Buffer.from('12345678901234567890'));
    expect(totp(secret, 59_000)).toBe('287082');
    expect(totp(secret, 1_111_111_109_000)).toBe('081804');
    expect(verifyTotp(secret, '081804', 1_111_111_109_000 + 30_000)).toBe(true); // one step of drift
    expect(verifyTotp(secret, '081804', 1_111_111_109_000 + 120_000)).toBe(false);
  });
});

describe('webhook signatures', () => {
  const body = Buffer.from(JSON.stringify({event: 'payment.captured', payload: {payment: {entity: {id: 'pay_1', order_id: 'order_1', amount: 1000, currency: 'INR'}}}}));
  const sig = createHmac('sha256', 'whsec').update(body).digest('hex');
  it('accepts the exact raw bytes and rejects any change', () => {
    expect(verifyRazorpaySignature(body, sig, 'whsec')).toBe(true);
    expect(verifyRazorpaySignature(Buffer.from(body.toString().replace('1000', '1')), sig, 'whsec')).toBe(false);
    expect(verifyRazorpaySignature(body, sig, 'other')).toBe(false);
    expect(verifyRazorpaySignature(body, undefined, 'whsec')).toBe(false);
  });
  it('parses capture events into paise', () => {
    const e = parseRazorpayEvent(body, 'evt_1');
    expect(e).toMatchObject({kind: 'captured', eventId: 'evt_1', providerOrderId: 'order_1', payment: {providerPaymentId: 'pay_1', amountMinor: 1000n}});
  });
});

describe('privacy helpers', () => {
  it('redacts sensitive keys deeply', () => {
    expect(redact({email: 'a@b.c', nested: {keySecret: 's', phone: '9', amount: 5}, ok: true})).toEqual({email: '[redacted]', nested: {keySecret: '[redacted]', phone: '[redacted]', amount: 5}, ok: true});
  });
  it('masks emails for support staff', () => expect(maskEmail('priya.sharma@gmail.com')).toBe('p***@g***.com'));
});

describe('partner attribution tokens', () => {
  it('are bound to the click id and expiry', () => {
    const t = attributionToken('01JCLICK0000000000000000AA', 2_000_000_000_000);
    const [id, exp, sig] = t.split('.');
    expect(id).toBe('01JCLICK0000000000000000AA');
    expect(sig).toHaveLength(32);
    expect(attributionToken('01JCLICK0000000000000000AB', 2_000_000_000_000)).not.toBe(t);
    expect(exp).toBe((2_000_000_000_000).toString(36));
  });
});

describe('S3 presign', () => {
  it('produces a SigV4 query-signed PUT URL', () => {
    Object.assign(process.env, {STORAGE_DRIVER: 's3', OBJECT_STORAGE_ENDPOINT: 'https://example-account.r2.cloudflarestorage.com', OBJECT_STORAGE_BUCKET: 'media', OBJECT_STORAGE_ACCESS_KEY: 'AKIDEXAMPLE', OBJECT_STORAGE_SECRET_KEY: 'secret', OBJECT_STORAGE_REGION: 'auto'});
    resetEnvForTests();
    const url = new URL(presignS3Put('products/A/B.jpg', 'image/jpeg', 600, new Date('2026-11-03T10:00:00Z')));
    expect(url.pathname).toBe('/media/products/A/B.jpg');
    expect(url.searchParams.get('X-Amz-Credential')).toBe('AKIDEXAMPLE/20261103/auto/s3/aws4_request');
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('content-type;host');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
    Object.assign(process.env, {STORAGE_DRIVER: 'local'});
    resetEnvForTests();
  });
});
