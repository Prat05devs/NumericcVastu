import {describe, expect, it} from 'vitest';
import {PERMISSIONS, STAFF_ROLES, type Permission} from '@sc/contracts';
import {Client, customer, cartWith, checkout, configureShipping, product, staff, app} from '../support/helpers.js';
import {registry} from '../../src/lib/http.js';
import {devMailbox} from '../../src/lib/mail.js';
import {ulid} from '../../src/lib/ids.js';
import request from 'supertest';

const fake = (path: string) => path.replace(/:[A-Za-z]+/g, '01JZZZZZZZZZZZZZZZZZZZZZZZ').replace('*key', 'x');

describe('customer authentication', () => {
  it('OTP sign-in is generic, single-use, attempt-limited and rotates the session', async () => {
    const c = await new Client().init();
    const unknown = await c.post('/auth/otp/request', {email: 'nobody-yet@example.test'});
    expect(unknown.body.data.message).toMatch(/If the address can receive email/);
    const email = `otp-${ulid().toLowerCase()}@example.test`;
    await c.post('/auth/otp/request', {email});
    const code = /(\d{6})/.exec(devMailbox().filter((m) => m.to === email).at(-1)!.subject)![1]!;
    const wrong = code === '000000' ? '111111' : '000000';
    expect((await c.post('/auth/otp/verify', {email, code: wrong})).body.error.code).toBe('INVALID_OTP');
    const ok = await c.post('/auth/otp/verify', {email, code});
    expect(ok.status).toBe(200);
    expect(String(ok.headers['set-cookie'])).toMatch(/sc_session=[^;]+; .*HttpOnly/);
    expect((await c.post('/auth/otp/verify', {email, code})).status).toBe(422); // replay refused
    expect((await c.get('/me')).body.data.email).toBe(email);
    await c.post('/auth/logout');
    expect((await c.get('/me')).status).toBe(401);
  });
  it('locks a challenge after 5 wrong codes', async () => {
    const c = await new Client().init();
    const email = `lock-${ulid().toLowerCase()}@example.test`;
    await c.post('/auth/otp/request', {email});
    const code = /(\d{6})/.exec(devMailbox().filter((m) => m.to === email).at(-1)!.subject)![1]!;
    for (let i = 0; i < 5; i++) await c.post('/auth/otp/verify', {email, code: String((Number(code) + 1 + i) % 1_000_000).padStart(6, '0')});
    expect((await c.post('/auth/otp/verify', {email, code})).body.error.code).toBe('INVALID_OTP');
  });
  it('rate-limits sign-in attempts per client', async () => {
    const c = await new Client().init();
    const statuses = [];
    for (let i = 0; i < 12; i++) statuses.push((await c.post('/auth/otp/request', {email: 'rl@example.test'}, {'X-Test-Rate-Limit': 'on'})).status);
    expect(statuses).toContain(429);
  });
});

describe('ownership: customers never see each other’s data', () => {
  it('orders, addresses and carts are hidden across accounts', async () => {
    await configureShipping();
    const a = await customer();
    const b = await customer();
    const p = await product({stock: 3});
    const {cartId} = await cartWith(p.variantId, 1, a);
    const order = (await checkout(a, cartId, {email: a.email})).body.data;
    expect((await a.get(`/orders/${order.orderId}`)).status).toBe(200);
    expect((await b.get(`/orders/${order.orderId}`)).status).toBe(404);
    expect((await b.post(`/orders/${order.orderId}/cancel`, {})).status).toBe(404);
    expect((await b.get(`/orders/${order.orderId}`, {'X-Order-Token': 'guess'})).status).toBe(404);
    const addr = await a.post('/me/addresses', {fullName: 'A', phone: '9876543210', line1: 'L1', city: 'Delhi', state: 'Delhi', postalCode: '110001'});
    expect((await b.patch(`/me/addresses/${addr.body.data.id}`, {fullName: 'B', phone: '9876543210', line1: 'L1', city: 'Delhi', state: 'Delhi', postalCode: '110001'})).status).toBe(404);
    expect((await b.get('/me/orders')).body.data).toHaveLength(0);
    expect((await a.get('/me/orders')).body.data).toHaveLength(1);
  });
});

describe('CSRF and webhook authenticity', () => {
  it('rejects cookie-authenticated writes without the CSRF token or from a foreign origin', async () => {
    const a = await customer();
    const noToken = await request(app).patch('/api/v1/me').set('Cookie', `sc_session=x; sc_csrf=abc`).send({name: 'X'});
    expect(noToken.body.error.code).toBe('CSRF');
    const evil = await a.patch('/me', {name: 'X'}, {Origin: 'https://evil.example'});
    expect(evil.body.error.code).toBe('CSRF');
    expect((await a.patch('/me', {name: 'Real Name'})).status).toBe(200);
  });
  it('rejects unsigned or tampered webhooks', async () => {
    const res = await request(app).post('/api/v1/webhooks/payments/razorpay').set('X-Razorpay-Signature', 'bad').send('{"event":"payment.captured"}');
    expect(res.status).toBe(401);
    const mock = await request(app).post('/api/v1/webhooks/payments/mock').set('X-Razorpay-Signature', '00').send('{}');
    expect(mock.status).toBe(401);
    expect((await request(app).post('/api/v1/internal/jobs/run').set('Authorization', 'Bearer wrong').send({})).status).toBe(401);
  });
});

describe('staff authentication and RBAC', () => {
  it('requires MFA enrolment before any back-office access', async () => {
    const s = await staff('OWNER', {mfa: false});
    expect((await s.get('/admin/overview')).body.error.code).toBe('MFA_REQUIRED');
    const setup = await s.post('/auth/staff/mfa/setup');
    const {totp} = await import('../../src/lib/crypto.js');
    expect((await s.post('/auth/staff/mfa/confirm', {code: totp(setup.body.data.secret)})).status).toBe(200);
    expect((await s.get('/admin/overview')).status).toBe(200);
  });
  it('locks the account after repeated wrong passwords', async () => {
    const s = await staff('SUPPORT');
    const c = await new Client().init();
    for (let i = 0; i < 5; i++) await c.post('/auth/staff/login', {email: s.email, password: 'wrong password'});
    expect((await c.post('/auth/staff/login', {email: s.email, password: s.password})).status).toBe(429);
  });
  it('customer sessions never open the back office', async () => {
    const a = await customer();
    expect((await a.get('/admin/overview')).status).toBe(401);
  });

  const staffRoutes = registry.filter((r) => r.access.startsWith('STAFF:') && r.access !== 'STAFF:any');
  it(`every admin route (${staffRoutes.length}) refuses anonymous callers`, async () => {
    const anon = await new Client().init();
    for (const r of staffRoutes) {
      const res = await (anon as unknown as Record<string, (p: string, b?: unknown) => Promise<{status: number}>>)[r.method]!(fake(r.path), {});
      expect([401, 403], `${r.method} ${r.path}`).toContain(res.status);
    }
  });
  it('every admin route refuses each role that lacks its permission (negative RBAC matrix)', async () => {
    const clients = Object.fromEntries(await Promise.all(STAFF_ROLES.map(async (role) => [role, await staff(role)] as const)));
    let checked = 0;
    for (const r of staffRoutes) {
      const perm = r.access.slice(6) as Permission;
      const allowed = PERMISSIONS[perm] as readonly string[];
      for (const role of STAFF_ROLES.filter((x) => !allowed.includes(x))) {
        const res = await (clients[role] as unknown as Record<string, (p: string, b?: unknown) => Promise<{status: number; body: {error?: {code: string}}}>>)[r.method]!(fake(r.path), {});
        expect(res.status, `${role} ${r.method} ${r.path}`).toBe(403);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });
});

describe('route registry', () => {
  it('documents every mounted route exactly once with an access rule', () => {
    const keys = registry.map((r) => `${r.method} ${r.path}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const r of registry) expect(r.access).toBeTruthy();
    // All 64 architecture contracts are present.
    const required = ['post /auth/otp/request', 'post /auth/otp/verify', 'post /auth/logout', 'get /me', 'patch /me', 'get /me/addresses', 'post /me/addresses', 'patch /me/addresses/:id',
      'get /navigation', 'get /categories', 'get /collections/:slug', 'get /products', 'get /products/:slug', 'get /products/:id/availability', 'get /search', 'get /pages/:slug', 'get /articles', 'get /articles/:slug', 'get /certificates/verify/:reportNo',
      'post /carts', 'get /carts/:id', 'put /carts/:id/items/:variantId', 'delete /carts/:id/items/:variantId', 'post /checkout/preview', 'post /checkout/orders', 'post /orders/:id/payment-intents', 'get /orders/:id', 'get /me/orders', 'post /orders/:id/cancel', 'post /orders/:id/returns',
      'post /webhooks/payments/:provider', 'post /webhooks/shipping/:provider', 'get /orders/:id/shipments', 'get /orders/:id/invoice', 'post /custom-requests', 'get /custom-requests/:ref', 'post /custom-requests/:ref/accept-quote', 'get /consultation/options', 'post /consultation/enquiries',
      'get /admin/overview', 'get /admin/products', 'post /admin/products', 'patch /admin/products/:id', 'post /admin/products/:id/publish', 'post /admin/products/:id/media/presign', 'get /admin/categories', 'post /admin/collections', 'patch /admin/inventory/:variantId', 'get /admin/orders', 'get /admin/orders/:id', 'post /admin/orders/:id/fulfill', 'post /admin/orders/:id/refund', 'get /admin/custom-requests', 'post /admin/custom-requests/:id/quotes', 'patch /admin/custom-requests/:id/status', 'get /admin/certificates', 'post /admin/certificates', 'get /admin/cms/pages', 'patch /admin/cms/pages/:id', 'get /admin/reports/sales', 'get /admin/audit',
      'get /health/live', 'get /health/ready', 'post /internal/jobs/run'];
    expect(required).toHaveLength(64); // the Razorpay webhook is served as /webhooks/payments/:provider with provider=razorpay
    for (const k of required) expect(keys, k).toContain(k);
  });
});
