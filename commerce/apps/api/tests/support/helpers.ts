import request from 'supertest';
import type {Response} from 'supertest';
import {createApp} from '../../src/app.js';
import {prisma} from '../../src/lib/db.js';
import {encrypt, hashPassword, newTotpSecret, totp} from '../../src/lib/crypto.js';
import {ulid} from '../../src/lib/ids.js';
import {devMailbox} from '../../src/lib/mail.js';
import {putSetting} from '../../src/lib/settings.js';
import type {StaffRole} from '@sc/contracts';

export const app = createApp();
const server = app.listen(0); // one HTTP server for the whole file instead of one per request
export {prisma};
import {afterAll} from 'vitest';
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

/** A cookie-keeping client that sends the CSRF header the web app would send. */
export class Client {
  agent = request.agent(server);
  csrf = '';
  headers: Record<string, string> = {};
  private capture(res: Response) {
    const set = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const c = set.find((x) => x.startsWith('sc_csrf='));
    if (c) this.csrf = decodeURIComponent(c.split(';')[0]!.slice('sc_csrf='.length));
    return res;
  }
  private with(r: request.Test, extra: Record<string, string> = {}) {
    for (const [k, v] of Object.entries({...this.headers, ...(this.csrf && {'X-CSRF-Token': this.csrf}), Origin: 'http://localhost:3000', ...extra})) r.set(k, v);
    return r;
  }
  async get(path: string, extra?: Record<string, string>) { return this.capture(await this.with(this.agent.get(`/api/v1${path}`), extra)); }
  async post(path: string, body?: unknown, extra?: Record<string, string>) { return this.capture(await this.with(this.agent.post(`/api/v1${path}`), extra).send(body as object)); }
  async put(path: string, body?: unknown, extra?: Record<string, string>) { return this.capture(await this.with(this.agent.put(`/api/v1${path}`), extra).send(body as object)); }
  async patch(path: string, body?: unknown, extra?: Record<string, string>) { return this.capture(await this.with(this.agent.patch(`/api/v1${path}`), extra).send(body as object)); }
  async delete(path: string, extra?: Record<string, string>) { return this.capture(await this.with(this.agent.delete(`/api/v1${path}`), extra)); }
  /** Raw body (uploads, signed webhooks). */
  async raw(method: 'post' | 'put', path: string, body: Buffer | string, extra: Record<string, string>) { return this.capture(await this.with(this.agent[method](`/api/v1${path}`), extra).send(body)); }
  async init() { await this.get('/auth/csrf'); return this; }
}

export async function customer(email = `c${ulid().toLowerCase()}@example.test`) {
  const c = await new Client().init();
  await c.post('/auth/otp/request', {email});
  const mail = devMailbox().filter((m) => m.to === email && m.tag === 'otp').at(-1);
  const code = /(\d{6})/.exec(mail!.subject)![1]!;
  const res = await c.post('/auth/otp/verify', {email, code});
  if (res.status !== 200) throw new Error(`OTP verify failed ${res.status} ${JSON.stringify(res.body)}`);
  return Object.assign(c, {email, userId: res.body.data.user.id as string});
}

export async function staff(role: StaffRole, opts: {mfa?: boolean} = {}) {
  const email = `${role.toLowerCase()}-${ulid().toLowerCase()}@example.test`;
  const secret = newTotpSecret();
  const password = 'correct horse battery staple';
  const id = ulid();
  await prisma.user.create({data: {id, email, name: `Test ${role}`, role, passwordHash: await hashPassword(password), ...(opts.mfa !== false && {mfaSecretEnc: encrypt(secret), mfaEnabledAt: new Date()})}});
  const c = await new Client().init();
  const res = await c.post('/auth/staff/login', {email, password, ...(opts.mfa !== false && {totp: totp(secret)})});
  if (res.status !== 200) throw new Error(`staff login failed ${res.status} ${JSON.stringify(res.body)}`);
  return Object.assign(c, {id, email, secret, password});
}

export const SHIPPING = {methods: [{id: 'standard', label: 'Standard delivery', feePaise: '9900', freeAbovePaise: '199900', etaText: '4–7 working days', active: true}], holdMinutes: 15, couriers: [{id: 'scenario-courier', name: 'Scenario Courier', trackingUrlTemplate: 'https://track.example.test/{tracking}'}]};
export async function configureShipping() { await putSetting('shipping', SHIPPING, null); }

export const address = {fullName: 'Test Buyer', phone: '9876543210', line1: '12 Test Lane', city: 'Dehradun', state: 'Uttarakhand', postalCode: '248001'};

let skuSeq = 0;
/** Creates a published product with one variant and stock straight in the DB (fixtures for API tests). */
export async function product(opts: {stock: number; pricePaise?: bigint; unique?: boolean; family?: 'crystals' | 'gemstones' | 'rudraksha' | 'yantras'; returnEligible?: boolean} ) {
  const cat = await prisma.category.findUniqueOrThrow({where: {slug: opts.family ?? 'crystals'}});
  const id = ulid();
  const vid = ulid();
  const sku = `T-${Date.now().toString(36).toUpperCase()}-${++skuSeq}`;
  await prisma.product.create({data: {id, categoryId: cat.id, slug: `test-${id.toLowerCase()}`, title: `Test item ${sku}`, body: 'Test fixture', status: 'PUBLISHED', publishedAt: new Date(), isDemo: true, returnEligible: opts.returnEligible ?? false}});
  await prisma.productVariant.create({data: {id: vid, productId: id, sku, title: 'Default', optionJson: {}, pricePaise: opts.pricePaise ?? 100_000n, weightG: 50, uniqueSpecimen: opts.unique ?? false}});
  await prisma.inventoryItem.create({data: {variantId: vid, onHandQty: opts.stock}});
  return {productId: id, variantId: vid, sku};
}

/** Guest cart with one line; returns the client (holding the cart cookie) and cart id. */
export async function cartWith(variantId: string, qty = 1, client?: Client) {
  const c = client ?? (await new Client().init());
  const created = await c.post('/carts');
  const cartId = created.body.data.cartId as string;
  const put = await c.put(`/carts/${cartId}/items/${variantId}`, {qty});
  if (put.status !== 200) throw new Error(`add to cart ${put.status} ${JSON.stringify(put.body)}`);
  return {c, cartId};
}

export const key = () => `test-${ulid()}`;
export async function checkout(c: Client, cartId: string, extra: Record<string, unknown> = {}, idemKey = key()) {
  return c.post('/checkout/orders', {cartId, email: `buyer-${ulid().toLowerCase()}@example.test`, shippingAddress: address, shippingMethodId: 'standard', acceptTerms: true, ...extra}, {'Idempotency-Key': idemKey});
}
export async function payMock(c: Client, orderId: string, token: string, outcome: 'success' | 'failure' = 'success', deliverWebhook = true) {
  const intent = await c.post(`/orders/${orderId}/payment-intents`, {}, {'Idempotency-Key': key(), 'X-Order-Token': token});
  if (intent.status !== 201) throw new Error(`intent ${intent.status} ${JSON.stringify(intent.body)}`);
  const providerOrderId = intent.body.data.checkout.orderId as string;
  const pay = await c.post('/dev/mock-pay', {providerOrderId, outcome, deliverWebhook});
  return {providerOrderId, pay};
}
export const inventory = (variantId: string) => prisma.inventoryItem.findUniqueOrThrow({where: {variantId}});
