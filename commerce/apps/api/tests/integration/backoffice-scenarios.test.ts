/**
 * Back-office demo scenarios: every function and configuration exercised through the API the way staff, customers,
 * partners, couriers and the payment provider use it — then all demo data is deleted and the database is proven to be
 * byte-for-byte back to its starting state (per-table checksums).
 */
import {createServer, type Server} from 'node:http';
import {createHmac} from 'node:crypto';
import {rm} from 'node:fs/promises';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {Client, customer, staff, prisma, key, address, SHIPPING, product} from '../support/helpers.js';
import {restore, snapshot, type Snapshot} from '../support/snapshot.js';
import {runJobs} from '../../src/services/jobs.js';
import {devMailbox} from '../../src/lib/mail.js';
import {solidPng} from '../../src/scripts/png.js';
import {ulid} from '../../src/lib/ids.js';

let baseline: Snapshot;
let owner: Awaited<ReturnType<typeof staff>>;
const S: Record<string, string> = {}; // ids shared between scenarios
const png = solidPng(64, 64, [20, 120, 80], [30, 140, 100]);

// A stand-in for Razorpay's REST API, so the real test-mode adapter (Basic auth, orders, payments, refunds) is exercised.
const fakeRzp = {server: null as Server | null, url: '', payments: new Map<string, {id: string; amount: number; status: string}[]>(), auth: ''};
function startFakeRazorpay(): Promise<void> {
  return new Promise((resolve) => {
    fakeRzp.server = createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        const json = (code: number, data: unknown) => { res.writeHead(code, {'Content-Type': 'application/json'}); res.end(JSON.stringify(data)); };
        if (req.headers.authorization !== fakeRzp.auth) return json(401, {error: {description: 'Authentication failed'}});
        if (req.method === 'POST' && req.url === '/orders') { const id = `order_${ulid()}`; fakeRzp.payments.set(id, []); return json(200, {id, amount: JSON.parse(body).amount, status: 'created'}); }
        const pay = /^\/orders\/([^/]+)\/payments$/.exec(req.url ?? '');
        if (req.method === 'GET' && pay) return json(200, {items: (fakeRzp.payments.get(pay[1]!) ?? []).map((x) => ({...x, currency: 'INR'}))});
        const refund = /^\/payments\/([^/]+)\/refund$/.exec(req.url ?? '');
        if (req.method === 'POST' && refund) return json(200, {id: `rfnd_${ulid()}`, status: 'processed', amount: JSON.parse(body).amount});
        json(404, {error: {description: 'not found'}});
      });
    }).listen(0, () => { fakeRzp.url = `http://127.0.0.1:${(fakeRzp.server!.address() as {port: number}).port}`; resolve(); });
  });
}

async function upload(c: Client, productId: string, contentType: string, purpose: 'product' | 'certificate' = 'product') {
  const pre = await c.post(`/admin/products/${productId}/media/presign`, {contentType, purpose});
  expect(pre.status).toBe(201);
  const path = new URL(pre.body.data.url).pathname.replace('/api/v1', '');
  const put = await c.raw('put', path, contentType === 'application/pdf' ? Buffer.from('%PDF-1.4 scenario report') : png, {'Content-Type': contentType});
  expect(put.status).toBe(201);
  return pre.body.data.objectKey as string;
}
async function checkoutAs(c: Client, variantId: string, opts: {qty?: number; email?: string; couponCode?: string; ref?: string} = {}) {
  const cart = await c.post('/carts');
  await c.put(`/carts/${cart.body.data.cartId}/items/${variantId}`, {qty: opts.qty ?? 1});
  return c.post('/checkout/orders', {cartId: cart.body.data.cartId, email: opts.email ?? `buyer-${ulid().toLowerCase()}@example.test`, shippingAddress: address, shippingMethodId: 'standard', acceptTerms: true, ...(opts.couponCode && {couponCode: opts.couponCode}), ...(opts.ref && {ref: opts.ref})}, {'Idempotency-Key': key()});
}
async function payMock(c: Client, orderId: string, token: string) {
  const intent = await c.post(`/orders/${orderId}/payment-intents`, {}, {'Idempotency-Key': key(), 'X-Order-Token': token});
  expect(intent.status).toBe(201);
  const pay = await c.post('/dev/mock-pay', {providerOrderId: intent.body.data.checkout.orderId, outcome: 'success'});
  expect(pay.body.data.webhook.outcome).toMatch(/PAID/);
}
const order = (id: string) => prisma.order.findUniqueOrThrow({where: {id}});

beforeAll(async () => {
  await runJobs(); // settle anything earlier test files left queued, so the baseline is stable
  baseline = await snapshot();
  owner = await staff('OWNER');
  await startFakeRazorpay();
});

afterAll(async () => {
  fakeRzp.server?.close();
  await prisma.siteSetting.deleteMany({where: {key: 'payments.mode'}}).catch(() => undefined);
  delete process.env['RAZORPAY_API_BASE'];
});

describe('back-office demo scenarios', () => {
  it('1. settings: every configuration group validates, saves, audits and is reported', async () => {
    const bad = await owner.put('/admin/settings/invoice', {sellerLegalName: 'X', gstin: 'NOT-A-GSTIN', address: 'short', invoicePrefix: 'x'});
    expect(bad.status).toBe(422);
    const before = await owner.get('/admin/settings');
    expect(before.body.data.missing).toEqual(expect.arrayContaining(['tax', 'returns', 'invoice']));
    const groups: Record<string, unknown> = {
      tax: {mode: 'EXCLUSIVE', groups: {GST_3: 300}, shippingGroup: null, reviewedBy: 'Scenario tax advisor', reviewedOn: '2026-11-01'},
      shipping: SHIPPING,
      returns: {enabled: true, windowDays: 7, policyPageSlug: 'scenario-returns-policy', reviewedBy: 'Scenario advisor'},
      invoice: {sellerLegalName: 'Scenario Seller Pvt Ltd', gstin: '05ABCDE1234F1Z5', address: '1 Scenario Road, Dehradun, Uttarakhand 248001', invoicePrefix: 'SCN'},
      consultation: {topics: [{id: 'NUMEROLOGY', label: 'Numerology', description: 'Personal numerology reading'}, {id: 'PRODUCT_GUIDANCE', label: 'Which product suits me', description: 'Guidance before buying'}], note: 'We reply within two working days.'},
      catalogue: {allowDemoPublish: false, lowStockThreshold: 2},
      navigation: {highlights: [{label: 'Diwali edit', href: '/collections/scenario-diwali'}]},
      affiliates: {holdDays: 0, minPayoutPaise: '100', tdsRateBp: 200, tdsThresholdPaise: '0', termsVersion: 'v1', termsPageSlug: 'scenario-partner-terms', reviewedBy: 'Scenario advisor'},
    };
    for (const [k, v] of Object.entries(groups)) expect((await owner.put(`/admin/settings/${k}`, v)).status, k).toBe(200);
    const after = await owner.get('/admin/settings');
    expect(after.body.data.missing).toEqual([]);
    expect(after.body.data.values.tax.groups.GST_3).toBe(300);
    expect(await prisma.auditLog.count({where: {action: 'settings.update', actorId: owner.id}})).toBe(8);
    const finance = await staff('FINANCE');
    expect((await finance.get('/admin/settings')).status).toBe(200); // finance may read
    expect((await finance.put('/admin/settings/tax', groups['tax'])).status).toBe(403); // but not change
    expect((await (await new Client().init()).get('/consultation/options')).body.data.topics).toHaveLength(2);
  });

  it('2. payments: keys are encrypted, mode switches without code changes, live stays locked; Razorpay test mode works end to end', async () => {
    expect((await owner.patch('/admin/settings/payment-mode', {mode: 'test'})).body.error.code).toBe('PAYMENT_NOT_CONFIGURED');
    expect((await owner.get('/admin/settings')).body.data.optional).toEqual(['international']);
    expect((await owner.patch('/admin/settings/payment-keys', {provider: 'razorpay', environment: 'test', keyId: 'rzp_live_wrongprefix'})).status).toBe(422);
    const keys = {provider: 'razorpay', environment: 'test', keyId: 'rzp_test_SCENARIO1234', keySecret: 'scenario_key_secret', webhookSecret: 'scenario_webhook_secret'};
    const saved = await owner.patch('/admin/settings/payment-keys', keys);
    expect(saved.body.data.keys.razorpay.test).toEqual({keyId: 'rzp_test_…1234', keySecret: true, webhookSecret: true});
    const stored = await prisma.secret.findMany({where: {name: {startsWith: 'payments.razorpay.test'}}});
    expect(stored).toHaveLength(3);
    expect(stored.every((s) => !s.ciphertext.includes('scenario'))).toBe(true); // encrypted at rest
    expect(JSON.stringify((await owner.get('/admin/settings')).body)).not.toContain('scenario_key_secret');
    expect((await owner.patch('/admin/settings/payment-mode', {mode: 'live', confirmLive: true})).body.error.code).toBe('LIVE_PAYMENTS_LOCKED');
    const finance = await staff('FINANCE');
    expect((await finance.patch('/admin/settings/payment-mode', {mode: 'test'})).status).toBe(403);
    expect((await owner.patch('/admin/settings/payment-mode', {mode: 'test'})).status).toBe(200);

    // Razorpay TEST flow through the real adapter and the real webhook endpoint.
    process.env['RAZORPAY_API_BASE'] = fakeRzp.url;
    fakeRzp.auth = `Basic ${Buffer.from('rzp_test_SCENARIO1234:scenario_key_secret').toString('base64')}`;
    const p = {id: (await product({stock: 5, pricePaise: 120_000n})).variantId};
    const buyer = await new Client().init();
    const o = (await checkoutAs(buyer, p.id)).body.data;
    const intent = await buyer.post(`/orders/${o.orderId}/payment-intents`, {}, {'Idempotency-Key': key(), 'X-Order-Token': o.orderAccessToken});
    expect(intent.body.data.checkout).toMatchObject({provider: 'razorpay', keyId: 'rzp_test_SCENARIO1234', currency: 'INR'});
    const rzpOrder = intent.body.data.checkout.orderId as string;
    const event = JSON.stringify({event: 'payment.captured', created_at: 1, payload: {payment: {entity: {id: `pay_${ulid()}`, order_id: rzpOrder, amount: Number(o.totalPaise), currency: 'INR', status: 'captured'}}}});
    const forged = await buyer.raw('post', '/webhooks/payments/razorpay', event, {'Content-Type': 'application/json', 'X-Razorpay-Signature': createHmac('sha256', 'wrong').update(event).digest('hex')});
    expect(forged.status).toBe(401);
    const sig = createHmac('sha256', 'scenario_webhook_secret').update(event).digest('hex');
    const hook = await buyer.raw('post', '/webhooks/payments/razorpay', event, {'Content-Type': 'application/json', 'X-Razorpay-Signature': sig, 'X-Razorpay-Event-Id': `evt_${ulid()}`});
    expect(hook.body.data).toMatchObject({duplicate: false, outcome: 'PAID'});
    expect((await order(o.orderId)).status).toBe('PAID');
    const refund = await owner.post(`/admin/orders/${o.orderId}/refund`, {amountPaise: o.totalPaise, reason: 'Scenario: test-mode refund'}, {'Idempotency-Key': key()});
    expect(refund.body.data.status).toBe('PROCESSED');
    expect((await order(o.orderId)).status).toBe('REFUNDED');
    // Wrong keys are reported as a configuration problem, not a crash.
    fakeRzp.auth = 'Basic nope';
    const o2 = (await checkoutAs(buyer, p.id)).body.data;
    expect((await buyer.post(`/orders/${o2.orderId}/payment-intents`, {}, {'Idempotency-Key': key(), 'X-Order-Token': o2.orderAccessToken})).status).toBe(409);
    expect((await owner.patch('/admin/settings/payment-mode', {mode: 'mock'})).status).toBe(200);
  });

  it('3. AI provider keys and storefront settings', async () => {
    const set = await owner.patch('/admin/settings/ai', {provider: 'anthropic', apiKey: 'sk-ant-scenario-1234', model: 'claude-sonnet-5-5', enabled: true});
    expect(set.body.data).toMatchObject({provider: 'anthropic', model: 'claude-sonnet-5-5', enabled: true, key: {set: true, last4: '1234'}});
    expect(JSON.stringify((await owner.get('/admin/settings')).body)).not.toContain('sk-ant-scenario');
    const removed = await owner.patch('/admin/settings/ai', {provider: 'anthropic', removeKey: true});
    expect(removed.body.data).toMatchObject({enabled: false, key: {set: false}});
    const sf = await prisma.storefront.findUniqueOrThrow({where: {id: 'crystal'}});
    expect((await owner.patch('/admin/storefronts/crystal', {allowedOrigins: ['https://staging.example.test']})).status).toBe(200);
    expect((await prisma.storefront.findUniqueOrThrow({where: {id: 'crystal'}})).allowedOrigins).toEqual(['https://staging.example.test']);
    await owner.patch('/admin/storefronts/crystal', {allowedOrigins: sf.allowedOrigins as string[]});
  });

  it('4. staff management: create, MFA enrolment, role change revokes sessions, disable', async () => {
    const email = `scenario-support-${ulid().toLowerCase()}@example.test`;
    const created = await owner.post('/admin/staff', {email, name: 'Scenario Support', role: 'SUPPORT', temporaryPassword: 'temporary-password-123'});
    expect(created.status).toBe(201);
    const s = await new Client().init();
    const login = await s.post('/auth/staff/login', {email, password: 'temporary-password-123'});
    expect(login.body.data).toMatchObject({mfaVerified: false, mfaSetupRequired: true});
    expect((await s.get('/admin/orders')).body.error.code).toBe('MFA_REQUIRED');
    const {totp} = await import('../../src/lib/crypto.js');
    const setup = await s.post('/auth/staff/mfa/setup');
    expect(setup.body.data.otpauthUri).toMatch(/^otpauth:\/\/totp\//);
    await s.post('/auth/staff/mfa/confirm', {code: totp(setup.body.data.secret)});
    expect((await s.get('/admin/orders')).status).toBe(200);
    expect((await s.get('/admin/reports/sales?from=2026-01-01&to=2026-01-31')).status).toBe(403);
    expect((await owner.patch(`/admin/staff/${created.body.data.id}`, {role: 'FINANCE'})).status).toBe(200);
    expect((await s.get('/admin/orders')).status).toBe(401); // sessions revoked on role change
    expect((await owner.patch(`/admin/staff/${owner.id}`, {status: 'DISABLED'})).status).toBe(409); // cannot lock yourself out
    await owner.patch(`/admin/staff/${created.body.data.id}`, {status: 'DISABLED'});
    expect((await s.post('/auth/staff/login', {email, password: 'temporary-password-123', totp: totp(setup.body.data.secret)})).status).toBe(401);
    expect((await owner.get('/admin/staff')).body.data.some((u: {email: string; status: string}) => u.email === email && u.status === 'DISABLED')).toBe(true);
  });

  it('5. catalogue: taxonomy, draft → publish gate → photos → stock → publish, versioning, collections', async () => {
    const cm = await staff('CATALOG_MANAGER');
    const crystals = await prisma.category.findUniqueOrThrow({where: {slug: 'crystals'}});
    const sub = await cm.post('/admin/categories', {slug: `scenario-bracelets-${ulid().slice(-5).toLowerCase()}`, title: 'Scenario bracelets', kind: 'CRYSTAL', parentId: crystals.id});
    expect(sub.status).toBe(201);
    expect((await cm.post('/admin/attributes', {code: `scenario_charm_${ulid().slice(-4).toLowerCase()}`, label: 'Charm', type: 'ENUM', filterable: true, categoryId: sub.body.data.id, options: ['Om', 'Lotus']})).status).toBe(201);
    const draft = await cm.post('/admin/products', {categoryId: sub.body.data.id, title: 'Scenario rose quartz bracelet', slug: `scenario-rose-quartz-${ulid().slice(-6).toLowerCase()}`, shortDescription: 'Scenario item', body: 'Short', attributes: {crystal_mineral: 'Rose quartz', product_form: 'Bracelet'}});
    expect(draft.status).toBe(201);
    const id = draft.body.data.id as string;
    S['crystalProduct'] = id;
    const blocked = await cm.post(`/admin/products/${id}/publish`);
    expect(blocked.body.error.code).toBe('PUBLISH_BLOCKED');
    expect(blocked.body.error.details.map((c: {code: string}) => c.code)).toEqual(expect.arrayContaining(['TITLE_BODY', 'MEDIA', 'ATTRIBUTES', 'RETURN_POLICY', 'VARIANT', 'STOCK', 'TAX_GROUP']));
    expect((await cm.patch(`/admin/products/${id}`, {version: 99, title: 'x'})).body.error.code).toBe('STALE_VERSION');
    const patched = await cm.patch(`/admin/products/${id}`, {version: 0, body: 'Rose quartz beads, 8 mm, hand-strung on stretch cord. Scenario description long enough.', returnEligible: true, taxGroup: 'GST_3', attributes: {natural_status: 'Natural', bead_size_mm: 8}});
    expect(patched.body.data.version).toBe(1);
    const variant = await cm.post(`/admin/products/${id}/variants`, {sku: `SCN-RQ-${ulid().slice(-6)}`, title: 'Medium wrist', pricePaise: '150000', weightGrams: 40});
    expect(variant.status).toBe(201);
    S['crystalVariant'] = variant.body.data.id;
    expect((await cm.post(`/admin/products/${id}/media`, {objectKey: `products/${id}/${ulid()}.png`, altText: 'Rose quartz bracelet', authorized: false})).status).toBe(422);
    const objectKey = await upload(cm, id, 'image/png');
    expect((await cm.post(`/admin/products/${id}/media`, {objectKey, altText: 'Rose quartz bracelet on linen', authorized: true, width: 64, height: 64})).status).toBe(201);
    const inv = await cm.get(`/admin/inventory?variantId=${S['crystalVariant']}`);
    const row = inv.body.data[0];
    const adj = await cm.patch(`/admin/inventory/${S['crystalVariant']}`, {delta: 10, reason: 'RECEIPT', note: 'Scenario receipt', expectedVersion: row.version});
    expect(adj.body.data).toMatchObject({onHand: 10, reserved: 0});
    expect((await cm.patch(`/admin/inventory/${S['crystalVariant']}`, {delta: 1, reason: 'RECEIPT', expectedVersion: row.version})).body.error.code).toBe('STALE_VERSION');
    expect((await cm.patch(`/admin/inventory/${S['crystalVariant']}`, {delta: -11, reason: 'DAMAGE', expectedVersion: row.version + 1})).status).toBe(409);
    const published = await cm.post(`/admin/products/${id}/publish`);
    expect(published.body.error?.details ?? published.body.data.status).toBe('PUBLISHED');
    const pub = await new Client().init();
    const slug = (await prisma.product.findUniqueOrThrow({where: {id}})).slug;
    const detail = await pub.get(`/products/${slug}`);
    expect(detail.body.data.attributes.crystal_mineral.value).toBe('Rose quartz');
    expect(detail.body.data.media[0].alt).toBe('Rose quartz bracelet on linen');
    expect((await pub.get(`/products?category=crystals&attr_crystal_mineral=rose%20quartz`)).body.data.some((x: {id: string}) => x.id === id)).toBe(true);
    expect((await pub.get('/products?attr_not_a_filter=1')).status).toBe(422);
    const coll = await cm.post('/admin/collections', {slug: 'scenario-diwali', title: 'Scenario Diwali edit', productIds: [id], status: 'PUBLISHED'});
    expect(coll.status).toBe(201);
    expect((await pub.get('/collections/scenario-diwali')).body.data.products.map((p: {id: string}) => p.id)).toContain(id);
    const support = await staff('SUPPORT');
    expect((await support.post('/admin/products', {})).status).toBe(403);
    expect((await support.patch(`/admin/inventory/${S['crystalVariant']}`, {delta: 1, reason: 'RECEIPT', expectedVersion: 0})).status).toBe(403);
  });

  it('6. certificates: "Certified" needs a verified issuer report; public verification shows only verified data', async () => {
    const cm = await staff('CATALOG_MANAGER');
    const rud = await prisma.category.findUniqueOrThrow({where: {slug: 'rudraksha'}});
    const p = await cm.post('/admin/products', {categoryId: rud.id, title: 'Scenario seven mukhi', slug: `scenario-seven-mukhi-${ulid().slice(-6).toLowerCase()}`, shortDescription: 'Seven mukhi Nepal bead with lab report', body: 'Seven mukhi bead with an independent lab report. Scenario description text.', returnEligible: false, taxGroup: 'GST_3', attributes: {mukhi_count: 7, rudraksha_origin: 'Nepal', bead_type: 'Single bead', bead_diameter_mm: 22, certification_status: 'Certified'}});
    const id = p.body.data.id;
    const v = await cm.post(`/admin/products/${id}/variants`, {sku: `SCN-7M-${ulid().slice(-6)}`, title: '22 mm', pricePaise: '650000', weightGrams: 10, uniqueSpecimen: true});
    const objectKey = await upload(cm, id, 'image/png');
    await cm.post(`/admin/products/${id}/media`, {objectKey, altText: 'Seven mukhi bead front', authorized: true});
    await cm.patch(`/admin/inventory/${v.body.data.id}`, {delta: 1, reason: 'RECEIPT', expectedVersion: 0});
    expect((await cm.patch(`/admin/inventory/${v.body.data.id}`, {delta: 1, reason: 'RECEIPT', expectedVersion: 1})).status).toBe(409); // a unique specimen is at most 1
    const blocked = await cm.post(`/admin/products/${id}/publish`);
    expect(blocked.body.error.details.map((c: {code: string}) => c.code)).toEqual(['CERTIFICATE']);
    const reportNo = `SCN-LAB-${ulid().slice(-8)}`;
    const noDoc = await cm.post('/admin/certificates', {variantId: v.body.data.id, issuer: 'Scenario Gem Testing Lab', reportNo, reportType: 'Rudraksha identification', issuedOn: '2026-10-15', evidenceNote: 'Original report seen and matched to bead'});
    expect((await cm.post(`/admin/certificates/${noDoc.body.data.id}/decision`, {decision: 'VERIFIED', note: 'Checked against issuer portal'})).status).toBe(409); // no uploaded report
    await prisma.certificate.delete({where: {id: noDoc.body.data.id}});
    const pdf = await upload(cm, id, 'application/pdf', 'certificate');
    const cert = await cm.post('/admin/certificates', {variantId: v.body.data.id, issuer: 'Scenario Gem Testing Lab', reportNo, reportType: 'Rudraksha identification', issuedOn: '2026-10-15', objectKey: pdf, evidenceNote: 'Original report uploaded'});
    const pub = await new Client().init();
    expect((await pub.get(`/certificates/verify/${reportNo}`)).status).toBe(404); // unverified is never shown
    await cm.post(`/admin/certificates/${cert.body.data.id}/decision`, {decision: 'VERIFIED', note: 'Report number confirmed on the issuer website'});
    expect((await pub.get(`/certificates/verify/${reportNo}`)).body.data).toMatchObject({issuer: 'Scenario Gem Testing Lab', reportNo});
    expect((await cm.post(`/admin/products/${id}/publish`)).status).toBe(200);
    expect((await pub.get(`/media/${pdf}`)).status).toBe(404); // certificate originals are private
  });

  it('7. festive campaign: automatic discount, theme in navigation, coupon interplay', async () => {
    const mk = await staff('MARKETING');
    const now = Date.now();
    const camp = await mk.post('/admin/campaigns', {name: 'Scenario Diwali sale', slug: `scenario-diwali-${ulid().slice(-5).toLowerCase()}`, startsAt: new Date(now - 60_000).toISOString(), endsAt: new Date(now + 3_600_000).toISOString(), priority: 10, rule: {type: 'PERCENT', percentBp: 1000, appliesTo: {families: ['CRYSTAL'], productIds: []}}, theme: {badge: 'Diwali', bannerText: 'Festival of lights — 10% off crystals', decoration: 'diyas', colors: {accent: '#D4A017'}, showCountdown: true}});
    expect(camp.status).toBe(201);
    S['campaign'] = camp.body.data.id;
    const pub = await new Client().init();
    expect((await pub.get('/navigation')).body.data.campaign).toMatchObject({name: 'Scenario Diwali sale', theme: {decoration: 'diyas'}});
    const code = `SCNFLAT${ulid().slice(-4)}`;
    expect((await mk.post('/admin/discounts', {code, rule: {type: 'FIXED', amountPaise: '5000'}, combinable: true})).status).toBe(201);
    const cart = await pub.post('/carts');
    await pub.put(`/carts/${cart.body.data.cartId}/items/${S['crystalVariant']}`, {qty: 1});
    const prev = await pub.post('/checkout/preview', {cartId: cart.body.data.cartId, shippingMethodId: 'standard', couponCode: code});
    // ₹1,500 − 10% campaign (₹150) − ₹50 combinable coupon = ₹1,300; ₹99 shipping; 3% tax ₹39 → ₹1,438
    expect(prev.body.data.breakdown).toMatchObject({subtotalPaise: '150000', discountPaise: '20000', shippingPaise: '9900', taxPaise: '3900', totalPaise: '143800'});
    expect(prev.body.data.breakdown.campaign.label).toBe('Scenario Diwali sale');
    const d = await prisma.discount.findUniqueOrThrow({where: {code}});
    expect((await mk.put(`/admin/discounts/${d.id}`, {code, rule: {type: 'FIXED', amountPaise: '5000'}, combinable: true, active: false, version: 5})).body.error.code).toBe('STALE_VERSION');
    await mk.put(`/admin/discounts/${d.id}`, {code, rule: {type: 'FIXED', amountPaise: '5000'}, combinable: true, active: false, version: 0});
    expect((await pub.post('/checkout/preview', {cartId: cart.body.data.cartId, couponCode: code})).body.data.coupon).toMatchObject({valid: false});
    await mk.put(`/admin/campaigns/${S['campaign']}`, {name: 'Scenario Diwali sale', slug: camp.body.data.slug ?? `scenario-diwali-x`, startsAt: new Date(now - 60_000).toISOString(), endsAt: new Date(now + 3_600_000).toISOString(), rule: {type: 'PERCENT', percentBp: 1000}, active: false}).catch(() => undefined);
    await prisma.campaign.update({where: {id: S['campaign']}, data: {active: false}});
    expect((await pub.get('/navigation')).body.data.campaign).toBeNull();
  });

  it('8. CMS: policies need the owner and a named legal approver; guides publish; stale saves are refused', async () => {
    const cm = await staff('CATALOG_MANAGER');
    for (const slug of ['scenario-returns-policy', 'scenario-partner-terms']) {
      const page = await cm.post('/admin/cms/pages', {slug, title: slug.replace(/-/g, ' '), kind: 'POLICY'});
      S[slug] = page.body.data.id;
      expect((await cm.patch(`/admin/cms/pages/${page.body.data.id}`, {version: 0, bodyBlocks: [{type: 'paragraph', text: 'Scenario policy text reviewed by counsel.'}]})).status).toBe(200);
      expect((await cm.patch(`/admin/cms/pages/${page.body.data.id}`, {version: 1, status: 'PUBLISHED'})).status).toBe(403);
      expect((await owner.patch(`/admin/cms/pages/${page.body.data.id}`, {version: 1, status: 'PUBLISHED'})).body.error.code).toBe('PUBLISH_BLOCKED');
      expect((await owner.patch(`/admin/cms/pages/${page.body.data.id}`, {version: 1, status: 'PUBLISHED', legalApprovedBy: 'Scenario Counsel LLP'})).status).toBe(200);
      expect((await owner.patch(`/admin/cms/pages/${page.body.data.id}`, {version: 1, title: 'late edit'})).body.error.code).toBe('STALE_VERSION');
    }
    const pub = await new Client().init();
    expect((await pub.get('/pages/scenario-returns-policy')).body.data.blocks[0].text).toMatch(/Scenario policy/);
    const article = await cm.post('/admin/articles', {slug: `scenario-guide-${ulid().slice(-5).toLowerCase()}`, title: 'How to care for a rudraksha', body: 'Scenario guide body.', author: 'Scenario author', status: 'PUBLISHED'});
    expect(article.status).toBe(201);
    expect((await pub.get('/articles')).body.data.some((a: {title: string}) => a.title === 'How to care for a rudraksha')).toBe(true);
  });

  it('9. order desk: pay → pack → ship → courier webhooks (forward-only) → return → restock → refund → invoice → reports', async () => {
    const buyer = await customer();
    const placed = await checkoutAs(buyer, S['crystalVariant']!, {qty: 2, email: buyer.email});
    expect(placed.status).toBe(201);
    const o = placed.body.data;
    S['deskOrder'] = o.orderId;
    await payMock(buyer, o.orderId, o.orderAccessToken);
    const desk = await staff('FULFILLMENT');
    const view = await desk.get(`/admin/orders/${o.orderId}`);
    expect(view.body.data.actions).toMatchObject({markProcessing: true, fulfill: true, refund: true});
    expect((await desk.post(`/admin/orders/${o.orderId}/refund`, {amountPaise: '100', reason: 'x'}, {'Idempotency-Key': key()})).status).toBe(403); // fulfilment cannot refund
    await desk.post(`/admin/orders/${o.orderId}/processing`);
    const tracking = `SCNTRK${ulid().slice(-8)}`;
    const shipped = await desk.post(`/admin/orders/${o.orderId}/fulfill`, {courier: 'scenario-courier', trackingNo: tracking});
    expect(shipped.body.data.status).toBe('SHIPPED');
    const courier = await new Client().init();
    const hook = (status: string, eventId: string) => {
      const body = JSON.stringify({eventId, trackingNo: tracking, courier: 'scenario-courier', status, occurredAt: new Date().toISOString(), location: 'Dehradun hub', description: `Scan ${status}`});
      return courier.raw('post', '/webhooks/shipping/generic', body, {'Content-Type': 'application/json', 'X-Signature': createHmac('sha256', 'test-shipping-webhook-secret').update(body).digest('hex')});
    };
    expect((await hook('IN_TRANSIT', 'e1')).body.data.results[0]).toMatchObject({applied: true, status: 'IN_TRANSIT'});
    expect((await hook('IN_TRANSIT', 'e1')).body.data.results[0].duplicate).toBe(true);
    expect((await courier.raw('post', '/webhooks/shipping/generic', '{"eventId":"x"}', {'Content-Type': 'application/json', 'X-Signature': 'bad'})).status).toBe(401);
    // Customer tracking portal: by order number + email (no account), and from the order page.
    const lookup = await courier.post('/track', {orderCode: o.publicCode, email: buyer.email});
    expect(lookup.body.data.shipments[0]).toMatchObject({courier: 'scenario-courier', trackingNo: tracking, status: 'IN_TRANSIT', trackingUrl: `https://track.example.test/${tracking}`});
    expect(lookup.body.data.shipments[0].scans.map((x: {status: string}) => x.status)).toEqual(['SHIPPED', 'IN_TRANSIT']);
    expect(lookup.body.data.steps.filter((x: {done: boolean}) => x.done).map((x: {key: string}) => x.key)).toEqual(['placed', 'paid', 'packed', 'shipped']);
    expect(JSON.stringify(lookup.body)).not.toMatch(/9876543210|12 Test Lane/);
    expect((await courier.post('/track', {orderCode: o.publicCode, email: 'someone-else@example.test'})).status).toBe(404);
    expect((await buyer.post(`/orders/${o.orderId}/delivery-feedback`, {rating: 5})).status).toBe(409); // not delivered yet
    expect((await hook('OUT_FOR_DELIVERY', 'e2')).body.data.results[0].status).toBe('OUT_FOR_DELIVERY');
    expect((await hook('DELIVERED', 'e3')).body.data.results[0].status).toBe('DELIVERED');
    expect((await hook('IN_TRANSIT', 'e4')).body.data.results[0]).toMatchObject({applied: false, status: 'DELIVERED'}); // never reverts
    expect((await order(o.orderId)).status).toBe('DELIVERED');
    const tracked = await buyer.get(`/orders/${o.orderId}/tracking`);
    expect(tracked.body.data).toMatchObject({status: 'DELIVERED', feedback: {canGive: true}});
    expect(tracked.body.data.steps.every((x: {done: boolean}) => x.done)).toBe(true);
    expect(await prisma.jobOutbox.count({where: {dedupeKey: `feedback_request:${o.orderId}`}})).toBe(1);
    expect((await buyer.post(`/orders/${o.orderId}/delivery-feedback`, {rating: 4, onTime: true, packagingOk: true, comment: 'Well packed'})).status).toBe(201);
    expect((await buyer.post(`/orders/${o.orderId}/delivery-feedback`, {rating: 1})).status).toBe(409);
    const fb = await desk.get('/admin/delivery-feedback');
    expect(fb.body.data.byCourier['scenario-courier']).toMatchObject({count: 1, average: 4, onTimeRate: 1});
    const lines = (await buyer.get(`/orders/${o.orderId}`)).body.data.lines;
    const ret = await buyer.post(`/orders/${o.orderId}/returns`, {reason: 'Scenario: size did not fit', lineIds: [lines[0].id]});
    expect(ret.status).toBe(201);
    const support = await staff('SUPPORT');
    expect((await support.patch(`/admin/returns/${ret.body.data.returnId}`, {status: 'RECEIVED', note: 'skip approval'})).body.error.code).toBe('ILLEGAL_TRANSITION');
    await support.patch(`/admin/returns/${ret.body.data.returnId}`, {status: 'APPROVED', note: 'Within policy window'});
    const stockBefore = (await prisma.inventoryItem.findUniqueOrThrow({where: {variantId: S['crystalVariant']!}})).onHandQty;
    await support.patch(`/admin/returns/${ret.body.data.returnId}`, {status: 'RECEIVED', restock: true, note: 'Received unused'});
    expect((await prisma.inventoryItem.findUniqueOrThrow({where: {variantId: S['crystalVariant']!}})).onHandQty).toBe(stockBefore + 2);
    expect((await order(o.orderId)).status).toBe('RETURNED');
    const finance = await staff('FINANCE');
    const total = (await order(o.orderId)).totalPaise;
    expect((await finance.post(`/admin/orders/${o.orderId}/refund`, {amountPaise: String(total + 1n), reason: 'Too much'}, {'Idempotency-Key': key()})).status).toBe(409);
    expect((await finance.post(`/admin/orders/${o.orderId}/refund`, {amountPaise: String(total), reason: 'Return received'}, {'Idempotency-Key': key()})).status).toBe(202);
    expect((await order(o.orderId)).status).toBe('REFUNDED');
    const invoice = await buyer.get(`/orders/${o.orderId}/invoice`);
    expect(invoice.body.data).toMatchObject({seller: {gstin: '05ABCDE1234F1Z5'}, order: {taxMode: 'EXCLUSIVE'}});
    expect(invoice.body.data.invoiceNo).toMatch(/^SCN-/);
    const today = new Date().toISOString().slice(0, 10);
    const report = await finance.get(`/admin/reports/sales?from=${today}&to=${today}`);
    expect(Number(report.body.data[0].orders)).toBeGreaterThan(0);
    const csv = await finance.get(`/admin/reports/sales?from=${today}&to=${today}&format=csv`);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    expect(csv.text.split('\n')[0]).toBe('day,orders,gross_paise,discount_paise,shipping_paise,tax_paise,refunded_paise');
    // Support sees masked contact details; fulfilment sees them to ship.
    expect((await support.get('/admin/orders')).body.data.find((x: {id: string}) => x.id === o.orderId).email).toMatch(/\*\*\*/);
    expect((await desk.get('/admin/orders')).body.data.find((x: {id: string}) => x.id === o.orderId).email).toBe(buyer.email);
    const audit = await owner.get(`/admin/audit?entityType=order&entityId=${o.orderId}`);
    expect(audit.body.data.map((a: {action: string}) => a.action)).toEqual(expect.arrayContaining(['order.fulfill', 'order.refund']));
  });

  it('10. partner programme: invite → terms → secure links → attributed sale → hold → approval → payout with TDS', async () => {
    const mk = await staff('MARKETING');
    const partnerEmail = `influencer-${ulid().toLowerCase()}@example.test`;
    const invited = await mk.post('/admin/affiliates', {name: 'Scenario Influencer', email: partnerEmail, platform: 'Instagram', handle: '@scenario', commission: {type: 'PERCENT', percentBp: 1000}, attributionDays: 30});
    expect(invited.body.data.status).toBe('INVITED');
    const affId = invited.body.data.id;
    await runJobs(['outbox']);
    expect(devMailbox().some((m) => m.to === partnerEmail && m.tag === 'partner_invite')).toBe(true);
    const couponCode = `SCNINFL${ulid().slice(-4)}`;
    const coupon = await mk.post('/admin/discounts', {code: couponCode, rule: {type: 'PERCENT', percentBp: 500}, lockedToLink: true});
    const link = await mk.post(`/admin/affiliates/${affId}/links`, {storefront: 'crystal', targetPath: '/crystals', couponId: coupon.body.data.id, label: 'Bio link'});
    expect(link.body.data.code).toMatch(/^[A-Za-z0-9]{10}$/);

    // The partner signs in with the invited email and must accept the published terms.
    const partner = await customer(partnerEmail);
    const me = await partner.get('/partner/me');
    expect(me.body.data).toMatchObject({status: 'INVITED', terms: {needsAcceptance: true, required: 'v1'}});
    expect((await partner.post('/partner/links', {targetPath: '/crystals'})).status).toBe(403);
    expect((await partner.post('/partner/terms', {termsVersion: 'v1', accept: true})).body.data.status).toBe('ACTIVE');
    const own = await partner.post('/partner/links', {targetPath: '/rudraksha', label: 'Reel'});
    expect(own.status).toBe(201);
    expect((await partner.post('/partner/links', {targetPath: 'https://evil.example/'})).status).toBe(422);

    // A follower clicks the link: the API records the click and returns a signed attribution token.
    const visitor = await new Client().init();
    const click = await visitor.get(`/r/${link.body.data.code}`, {'X-Visitor-User-Agent': 'Mozilla/5.0 (iPhone) Scenario', 'X-Visitor-Referrer': 'https://instagram.com/'});
    expect(click.body.data).toMatchObject({targetPath: '/crystals', couponCode, maxAgeDays: 30});
    const ref = click.body.data.token as string;
    expect((await visitor.get('/r/doesnotexist1')).status).toBe(404);
    const bot = await visitor.get(`/r/${link.body.data.code}`, {'X-Visitor-User-Agent': 'Googlebot/2.1'});
    expect(bot.status).toBe(200);
    expect((await prisma.affiliateClick.findFirstOrThrow({where: {clickId: bot.body.data.token.split('.')[0]}})).suspectedBot).toBe(true);

    // The locked coupon only works through the partner's link.
    const stranger = await new Client().init();
    const scart = await stranger.post('/carts');
    await stranger.put(`/carts/${scart.body.data.cartId}/items/${S['crystalVariant']}`, {qty: 1});
    expect((await stranger.post('/checkout/preview', {cartId: scart.body.data.cartId, couponCode})).body.data.coupon).toMatchObject({valid: false});
    // Forged or tampered tokens are ignored (no attribution), not errors.
    const forged = `${ref.split('.')[0]}.${ref.split('.')[1]}.${'0'.repeat(32)}`;
    const forgedOrder = await checkoutAs(stranger, S['crystalVariant']!, {ref: forged});
    expect(forgedOrder.body.error ?? forgedOrder.status).toBe(201);
    expect((await order(forgedOrder.body.data.orderId)).affiliateLinkId).toBeNull();

    // Genuine attributed sale with the partner coupon.
    const sale = await checkoutAs(visitor, S['crystalVariant']!, {ref, couponCode, qty: 1});
    expect(sale.status).toBe(201);
    expect((await order(sale.body.data.orderId)).affiliateLinkId).toBe(link.body.data.id);
    await payMock(visitor, sale.body.data.orderId, sale.body.data.orderAccessToken);
    const commission = await prisma.affiliateCommission.findUniqueOrThrow({where: {orderId: sale.body.data.orderId}});
    const lines = await prisma.orderLine.findMany({where: {orderId: sale.body.data.orderId}});
    const basis = lines.reduce((s, l) => s + l.totalPaise - l.taxPaise, 0n);
    expect(commission).toMatchObject({status: 'PENDING', basisPaise: basis, amountPaise: basis / 10n, attribution: 'LINK'}); // shipping and tax excluded

    // Self-referral through the partner's own link earns nothing.
    const selfClick = await partner.get(`/r/${own.body.data.shareUrl.split('/r/')[1]}`, {'X-Visitor-User-Agent': 'Mozilla/5.0 Scenario'});
    const selfOrder = await checkoutAs(partner, S['crystalVariant']!, {ref: selfClick.body.data.token, email: partnerEmail});
    await payMock(partner, selfOrder.body.data.orderId, selfOrder.body.data.orderAccessToken);
    expect(await prisma.affiliateCommission.findUniqueOrThrow({where: {orderId: selfOrder.body.data.orderId}})).toMatchObject({status: 'REJECTED', amountPaise: 0n, flags: ['SELF_REFERRAL']});

    // Partner dashboard: own numbers only, no customer details.
    const summary = await partner.get('/partner/summary');
    expect(summary.body.data).toMatchObject({orders: 1, balances: {pendingPaise: String(basis / 10n)}});
    expect(summary.body.data.uniqueClicks).toBeGreaterThanOrEqual(1);
    const ledger = await partner.get('/partner/commissions');
    expect(JSON.stringify(ledger.body)).not.toMatch(/@example\.test|Dehradun|9876543210/);
    expect(ledger.body.data[0].order).toMatch(/^NVC-••••/);

    // Commission is approved only after delivery + hold (holdDays = 0 in this scenario), by the cron job.
    await runJobs(['approve-commissions']);
    expect((await prisma.affiliateCommission.findUniqueOrThrow({where: {orderId: sale.body.data.orderId}})).status).toBe('PENDING');
    const desk = await staff('FULFILLMENT');
    await desk.post(`/admin/orders/${sale.body.data.orderId}/fulfill`, {courier: 'scenario-courier', trackingNo: `SCNAFF${ulid().slice(-8)}`});
    const shipment = await prisma.shipment.findFirstOrThrow({where: {orderId: sale.body.data.orderId}});
    await desk.patch(`/admin/shipments/${shipment.id}`, {status: 'DELIVERED'});
    await runJobs(['approve-commissions']);
    expect((await prisma.affiliateCommission.findUniqueOrThrow({where: {orderId: sale.body.data.orderId}})).status).toBe('APPROVED');

    // Payout: needs payout details (and PAN, because TDS is configured), deducts 2%, then is marked paid.
    const finance = await staff('FINANCE');
    expect((await finance.post('/admin/affiliate-payouts', {affiliateId: affId}, {'Idempotency-Key': key()})).body.error.message).toMatch(/payout details/);
    await partner.put('/partner/payout-details', {method: 'UPI', accountName: 'Scenario Influencer', upiId: 'scenario@okaxis'});
    expect((await finance.post('/admin/affiliate-payouts', {affiliateId: affId}, {'Idempotency-Key': key()})).body.error.message).toMatch(/PAN/);
    const hint = await partner.put('/partner/payout-details', {method: 'UPI', accountName: 'Scenario Influencer', upiId: 'scenario@okaxis', pan: 'ABCDE1234F'});
    expect(hint.body.data.hint).toBe('UPI ••••io@okaxis · PAN ••••4F');
    const affRow = await prisma.affiliate.findUniqueOrThrow({where: {id: affId}});
    expect(affRow.payoutDetailsEnc).not.toContain('ABCDE1234F');
    const payout = await finance.post('/admin/affiliate-payouts', {affiliateId: affId}, {'Idempotency-Key': key()});
    expect(payout.status).toBe(201);
    const gross = basis / 10n;
    const tds = (gross * 200n) / 10_000n;
    expect(payout.body.data).toMatchObject({grossPaise: String(gross), tdsPaise: String(tds), netPaise: String(gross - tds), commissions: 1, taxConfigured: true});
    await finance.post(`/admin/affiliate-payouts/${payout.body.data.id}/paid`, {method: 'UPI', reference: 'UTR-SCENARIO-0001'});
    expect((await prisma.affiliateCommission.findUniqueOrThrow({where: {orderId: sale.body.data.orderId}})).status).toBe('PAID');
    expect((await partner.get('/partner/payouts')).body.data[0]).toMatchObject({status: 'PAID', reference: 'UTR-SCENARIO-0001'});

    // A refund on an attributed order reverses commission proportionally (pending ones) and flags a clawback (paid ones).
    const sale2 = await checkoutAs(visitor, S['crystalVariant']!, {ref, qty: 2});
    await payMock(visitor, sale2.body.data.orderId, sale2.body.data.orderAccessToken);
    const o2 = await order(sale2.body.data.orderId);
    await finance.post(`/admin/orders/${o2.id}/refund`, {amountPaise: String(o2.totalPaise / 2n), reason: 'Half returned'}, {'Idempotency-Key': key()});
    const c2 = await prisma.affiliateCommission.findUniqueOrThrow({where: {orderId: o2.id}});
    expect(c2.reversedPaise).toBe((c2.amountPaise * (o2.totalPaise / 2n)) / o2.totalPaise);
    await finance.post(`/admin/orders/${sale.body.data.orderId}/refund`, {amountPaise: '1000', reason: 'Goodwill after payout'}, {'Idempotency-Key': key()});
    expect((await prisma.affiliateCommission.findUniqueOrThrow({where: {orderId: sale.body.data.orderId}})).flags).toContain('CLAWBACK_NEEDED');

    // Suspension stops attribution immediately.
    await mk.post(`/admin/affiliates/${affId}/status`, {status: 'SUSPENDED', note: 'Scenario: policy breach test'});
    expect((await visitor.get(`/r/${link.body.data.code}`)).status).toBe(404);
    const after = await checkoutAs(visitor, S['crystalVariant']!, {ref});
    expect((await order(after.body.data.orderId)).affiliateLinkId).toBeNull();
    expect((await partner.post('/partner/links', {targetPath: '/'})).status).toBe(403);
    const list = await mk.get('/admin/affiliates');
    expect(JSON.stringify(list.body)).not.toContain('scenario@okaxis');
  });

  it('11. made-to-order wristwatch: request → review → versioned quotes → accept → pay → in progress → completed', async () => {
    const pub = await new Client().init();
    const req = await pub.post('/custom-requests', {requestType: 'WRISTWATCH', name: 'Scenario Client', email: `watch-${ulid().toLowerCase()}@example.test`, phone: '9876501234', preferredStyle: 'Steel, minimal dial', budgetBand: '10K_25K', requirements: 'Lucky number 5 on the dial', dateOfBirth: '1990-05-14', consentVersion: 'v1', consent: true});
    expect(req.status).toBe(201);
    const {referenceCode, accessToken} = req.body.data;
    const row = await prisma.customRequest.findUniqueOrThrow({where: {referenceCode}});
    expect(row.privateDetailsEncrypted).not.toContain('1990-05-14');
    const support = await staff('SUPPORT');
    const inbox = await support.get('/admin/custom-requests');
    expect(JSON.stringify(inbox.body)).not.toContain('Scenario Client');
    expect((await support.get(`/admin/custom-requests/${row.id}`)).body.data.details.dateOfBirth).toBe('1990-05-14');
    expect(await prisma.auditLog.count({where: {action: 'custom_request.view_private', entityId: row.id}})).toBe(1);
    expect((await support.post(`/admin/custom-requests/${row.id}/quotes`, {items: [{description: 'x', qty: 1, unitPaise: '100'}], validDays: 7, terms: 't'})).body.error.code).toBe('ILLEGAL_TRANSITION');
    await support.patch(`/admin/custom-requests/${row.id}/status`, {status: 'REVIEWING'});
    const q1 = await support.post(`/admin/custom-requests/${row.id}/quotes`, {items: [{description: 'Custom steel watch, numerology dial', qty: 1, unitPaise: '1800000', taxPaise: '54000'}], validDays: 7, terms: 'Made to order; 21 working days; non-returnable once production starts.'});
    const q2 = await support.post(`/admin/custom-requests/${row.id}/quotes`, {items: [{description: 'Custom steel watch, numerology dial (revised)', qty: 1, unitPaise: '1650000', taxPaise: '49500'}], validDays: 7, terms: 'Made to order; 21 working days.'});
    expect([q1.body.data.version, q2.body.data.version]).toEqual([1, 2]);
    const status = await pub.get(`/custom-requests/${referenceCode}`, {'X-Request-Token': accessToken});
    expect(status.body.data.quotes.map((q: {version: number; status: string}) => `${q.version}:${q.status}`)).toEqual(['2:SENT']);
    expect((await (await new Client().init()).get(`/custom-requests/${referenceCode}`)).status).toBe(404);
    expect((await pub.post(`/custom-requests/${referenceCode}/accept-quote`, {version: 1, acceptTerms: true}, {'X-Request-Token': accessToken, 'Idempotency-Key': key()})).status).toBe(409);
    const accepted = await pub.post(`/custom-requests/${referenceCode}/accept-quote`, {version: 2, acceptTerms: true}, {'X-Request-Token': accessToken, 'Idempotency-Key': key()});
    expect(accepted.body.data.totalPaise).toBe('1699500');
    await payMock(pub, accepted.body.data.orderId, accepted.body.data.orderAccessToken);
    expect((await prisma.customRequest.findUniqueOrThrow({where: {id: row.id}})).status).toBe('IN_PROGRESS');
    await support.patch(`/admin/custom-requests/${row.id}/status`, {status: 'COMPLETED', note: 'Delivered to client'});
    expect((await pub.get(`/custom-requests/${referenceCode}`, {'X-Request-Token': accessToken})).body.data.status).toBe('COMPLETED');
  });

  it('12. consultation enquiries: configured topics only, encrypted contact, audited access', async () => {
    const pub = await new Client().init();
    expect((await pub.post('/consultation/enquiries', {topic: 'VASTU', name: 'A', email: 'a@example.test', message: 'Hi', consentVersion: 'v1', consent: true})).status).toBe(422); // not configured
    const ok = await pub.post('/consultation/enquiries', {topic: 'NUMEROLOGY', name: 'Scenario Seeker', email: `seek-${ulid().toLowerCase()}@example.test`, phone: '9811122233', message: 'I would like a reading', consentVersion: 'v1', consent: true});
    expect(ok.status).toBe(201);
    const support = await staff('SUPPORT');
    const lead = (await support.get('/admin/consultation-leads')).body.data[0];
    expect(JSON.stringify(lead)).not.toContain('Scenario Seeker');
    expect((await support.get(`/admin/consultation-leads/${lead.id}`)).body.data.contact.name).toBe('Scenario Seeker');
    expect((await support.patch(`/admin/consultation-leads/${lead.id}`, {status: 'CONTACTED'})).body.data.status).toBe('CONTACTED');
  });

  it('13. review moderation shows only approved reviews, marking verified purchases', async () => {
    const line = await prisma.orderLine.findFirstOrThrow({where: {orderId: S['deskOrder']}});
    const id = ulid();
    await prisma.review.create({data: {id, productId: S['crystalProduct']!, orderLineId: line.id, rating: 5, body: 'Lovely bracelet', authorName: 'Scenario R.'}});
    const slug = (await prisma.product.findUniqueOrThrow({where: {id: S['crystalProduct']!}})).slug;
    const pub = await new Client().init();
    expect((await pub.get(`/products/${slug}`)).body.data.reviews).toHaveLength(0);
    const mk = await staff('MARKETING');
    await mk.patch(`/admin/reviews/${id}`, {status: 'APPROVED'});
    expect((await pub.get(`/products/${slug}`)).body.data.reviews[0]).toMatchObject({rating: 5, verifiedPurchase: true});
  });

  it('14. customer account: addresses, history, data export and erasure', async () => {
    const c = await customer();
    await c.post('/me/addresses', {fullName: 'Scenario Person', phone: '9876543210', line1: 'House 1', city: 'Noida', state: 'Uttar Pradesh', postalCode: '201301'});
    expect((await c.post('/me/addresses', {fullName: 'X', phone: '12345', line1: 'L', city: 'C', state: 'S', postalCode: '000000'})).status).toBe(422);
    const exp = await c.get('/me/export');
    expect(exp.body.data.addresses).toHaveLength(1);
    expect((await c.delete('/me')).body.data.erased).toBe(true);
    const u = await prisma.user.findUniqueOrThrow({where: {id: c.userId}});
    expect(u).toMatchObject({email: null, status: 'ERASED'});
    expect((await c.get('/me')).status).toBe(401);
  });

  it('15. operations: overview KPIs, jobs health, dead-job retry, cron endpoint', async () => {
    const ov = await owner.get('/admin/overview');
    expect(ov.body.data.queues).toHaveProperty('toShip');
    expect(ov.body.data).toHaveProperty('last30Days');
    const support = await staff('SUPPORT');
    expect((await support.get('/admin/overview')).body.data).not.toHaveProperty('last30Days'); // finance figures hidden
    const dead = await prisma.jobOutbox.create({data: {id: ulid(), type: 'finance.alert', payloadJson: {kind: 'SCENARIO'}, status: 'DEAD', attempts: 8, lastError: 'scenario'}});
    expect((await owner.get('/admin/jobs')).body.data.dead.some((j: {id: string}) => j.id === dead.id)).toBe(true);
    await owner.post(`/admin/jobs/${dead.id}/retry`);
    const cron = await (await new Client().init()).post('/internal/jobs/run', {jobs: ['outbox']}, {Authorization: 'Bearer test-cron-secret-0123456789abcdefghijklmnopqrstuv'});
    expect(cron.status).toBe(200);
    expect((await prisma.jobOutbox.findUniqueOrThrow({where: {id: dead.id}})).status).toBe('DONE');
  });

  it('17. PayPal (overseas, USD): reviewed exchange rate → order → server-side capture → verified webhook → USD refund', async () => {
    const calls: string[] = [];
    let verifyResult = 'SUCCESS';
    const orders = new Map<string, {amount: {value: string; currency_code: string}; status: string; captureId?: string}>();
    const pp = createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        const json = (code: number, data: unknown) => { res.writeHead(code, {'Content-Type': 'application/json'}); res.end(JSON.stringify(data)); };
        calls.push(`${req.method} ${req.url}`);
        if (req.url === '/v1/oauth2/token') return req.headers.authorization === `Basic ${Buffer.from('pp-client:pp-secret').toString('base64')}` ? json(200, {access_token: 'tok', expires_in: 3600}) : json(401, {error: 'invalid_client'});
        if (req.headers.authorization !== 'Bearer tok') return json(401, {name: 'AUTHENTICATION_FAILURE'});
        if (req.url === '/v2/checkout/orders' && req.method === 'POST') { const id = `PP${ulid()}`; orders.set(id, {amount: JSON.parse(body).purchase_units[0].amount, status: 'CREATED'}); return json(201, {id, status: 'CREATED'}); }
        const cap = /^\/v2\/checkout\/orders\/([^/]+)\/capture$/.exec(req.url ?? '');
        if (cap) {
          const o = orders.get(cap[1]!)!;
          if (o.status === 'COMPLETED') return json(422, {name: 'UNPROCESSABLE_ENTITY', details: [{issue: 'ORDER_ALREADY_CAPTURED'}]});
          if (o.status !== 'APPROVED') return json(422, {name: 'UNPROCESSABLE_ENTITY', details: [{issue: 'ORDER_NOT_APPROVED'}]});
          o.status = 'COMPLETED'; o.captureId = `CAP${ulid()}`;
          return json(201, {id: cap[1], status: 'COMPLETED', purchase_units: [{payments: {captures: [{id: o.captureId, status: 'COMPLETED', amount: o.amount}]}}]});
        }
        const get = /^\/v2\/checkout\/orders\/([^/]+)$/.exec(req.url ?? '');
        if (get) { const o = orders.get(get[1]!)!; return json(200, {id: get[1], status: o.status, purchase_units: [{payments: o.captureId ? {captures: [{id: o.captureId, status: 'COMPLETED', amount: o.amount}]} : {}}]}); }
        if (req.url === '/v1/notifications/verify-webhook-signature') return json(200, {verification_status: JSON.parse(body).webhook_id === 'WH-SCENARIO' ? verifyResult : 'FAILURE'});
        const refund = /^\/v2\/payments\/captures\/([^/]+)\/refund$/.exec(req.url ?? '');
        if (refund) return json(201, {id: `RF${ulid()}`, status: 'COMPLETED', amount: JSON.parse(body).amount});
        json(404, {});
      });
    });
    await new Promise<void>((r) => pp.listen(0, r));
    process.env['PAYPAL_API_BASE'] = `http://127.0.0.1:${(pp.address() as {port: number}).port}`;
    try {
      await owner.patch('/admin/settings/payment-keys', {provider: 'paypal', environment: 'test', clientId: 'pp-client', clientSecret: 'pp-secret', webhookId: 'WH-SCENARIO'});
      expect((await owner.patch('/admin/settings/payment-keys', {provider: 'paypal', environment: 'test', keyId: 'rzp_test_x'})).status).toBe(422);
      expect((await owner.put('/admin/settings/international', {currency: 'USD', inrPerUnit: '84.25', reviewedBy: 'Scenario finance', reviewedOn: '2026-11-01'})).status).toBe(200);
      expect((await owner.patch('/admin/settings/payment-mode', {mode: 'test'})).status).toBe(200);
      const settings = await owner.get('/admin/settings');
      expect(settings.body.data.payments.keys.paypal.test).toEqual({clientId: 'pp-client…ient', clientSecret: true, webhookId: true});
      expect(settings.body.data.payments.webhookUrls.paypal).toMatch(/\/api\/v1\/webhooks\/payments\/paypal$/);

      const buyer = await new Client().init();
      const p = await product({stock: 3, pricePaise: 250_000n});
      const o = (await checkoutAs(buyer, p.variantId)).body.data;
      const options = await buyer.get(`/orders/${o.orderId}/payment-options`, {'X-Order-Token': o.orderAccessToken});
      const ppOption = options.body.data.find((x: {provider: string}) => x.provider === 'paypal');
      // ₹2,500 + ₹99 shipping + 3% tax… total / 84.25, rounded UP to the cent
      const expectedCents = (BigInt(o.totalPaise) * 10_000n + 842_499n) / 842_500n;
      expect(ppOption.charge).toMatchObject({currency: 'USD', amountMinor: String(expectedCents), exchangeRate: '84.25'});
      const intent = await buyer.post(`/orders/${o.orderId}/payment-intents`, {provider: 'paypal'}, {'Idempotency-Key': key(), 'X-Order-Token': o.orderAccessToken});
      expect(intent.body.data.checkout).toMatchObject({provider: 'paypal', clientId: 'pp-client', currency: 'USD'});
      const ppOrder = intent.body.data.checkout.orderId as string;
      // The browser claims success before approval: the server asks PayPal and nothing is captured.
      expect((await buyer.post(`/orders/${o.orderId}/payment-sync`, {}, {'X-Order-Token': o.orderAccessToken})).body.data.status).toBe('AWAITING_PAYMENT');
      orders.get(ppOrder)!.status = 'APPROVED'; // buyer approves in PayPal's popup
      // CHECKOUT.ORDER.APPROVED webhook → the API captures server-to-server and confirms the order.
      const hdr = {'Content-Type': 'application/json', 'paypal-auth-algo': 'SHA256withRSA', 'paypal-cert-url': 'https://api.paypal.com/cert', 'paypal-transmission-id': ulid(), 'paypal-transmission-sig': 'sig', 'paypal-transmission-time': new Date().toISOString()};
      const approved = JSON.stringify({id: `WH-${ulid()}`, event_type: 'CHECKOUT.ORDER.APPROVED', resource: {id: ppOrder, status: 'APPROVED'}});
      verifyResult = 'FAILURE';
      expect((await buyer.raw('post', '/webhooks/payments/paypal', approved, hdr)).status).toBe(401);
      verifyResult = 'SUCCESS';
      const hook = await buyer.raw('post', '/webhooks/payments/paypal', approved, hdr);
      expect(hook.body.data.outcome).toBe('PAID');
      expect(calls.filter((c) => c.endsWith('/capture'))).toHaveLength(1);
      const pay = await prisma.payment.findFirstOrThrow({where: {orderId: o.orderId}});
      expect(pay).toMatchObject({provider: 'paypal', providerCurrency: 'USD', providerAmountMinor: expectedCents, exchangeRate: '84.25', status: 'CAPTURED'});
      // The later PAYMENT.CAPTURE.COMPLETED for the same capture is a no-op.
      const completed = JSON.stringify({id: `WH-${ulid()}`, event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: {id: pay.providerPaymentId, status: 'COMPLETED', amount: {value: `${expectedCents / 100n}.${String(expectedCents % 100n).padStart(2, '0')}`, currency_code: 'USD'}, supplementary_data: {related_ids: {order_id: ppOrder}}}});
      expect((await buyer.raw('post', '/webhooks/payments/paypal', completed, {...hdr, 'paypal-transmission-id': ulid()})).body.data.outcome).toBe('DUPLICATE');
      // Partial refund converts at the stored rate; the final refund takes exactly the remaining cents.
      const finance = await staff('FINANCE');
      await finance.post(`/admin/orders/${o.orderId}/refund`, {amountPaise: '100000', reason: 'Partial'}, {'Idempotency-Key': key()});
      const rest = BigInt(o.totalPaise) - 100_000n;
      await finance.post(`/admin/orders/${o.orderId}/refund`, {amountPaise: String(rest), reason: 'Rest'}, {'Idempotency-Key': key()});
      const refunds = await prisma.refund.findMany({where: {orderId: o.orderId}, orderBy: {createdAt: 'asc'}});
      expect(refunds.map((x) => x.status)).toEqual(['PROCESSED', 'PROCESSED']);
      expect(refunds[0]!.providerAmountMinor + refunds[1]!.providerAmountMinor).toBe(expectedCents);
      expect((await order(o.orderId)).status).toBe('REFUNDED');

      // Razorpay with manual capture: payment.authorized → the API captures it.
      await owner.patch('/admin/settings/payment-keys', {provider: 'razorpay', environment: 'test', keyId: 'rzp_test_SCENARIO1234', keySecret: 'scenario_key_secret', webhookSecret: 'scenario_webhook_secret'});
      process.env['RAZORPAY_API_BASE'] = fakeRzp.url;
      fakeRzp.auth = `Basic ${Buffer.from('rzp_test_SCENARIO1234:scenario_key_secret').toString('base64')}`;
      const o2 = (await checkoutAs(buyer, p.variantId)).body.data;
      const i2 = await buyer.post(`/orders/${o2.orderId}/payment-intents`, {provider: 'razorpay'}, {'Idempotency-Key': key(), 'X-Order-Token': o2.orderAccessToken});
      const rzpOrder = i2.body.data.checkout.orderId as string;
      const payId = `pay_${ulid()}`;
      fakeRzp.payments.set(rzpOrder, [{id: payId, amount: Number(o2.totalPaise), status: 'authorized'}]);
      const capturing = fakeRzp.server!.listeners('request')[0] as (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void;
      fakeRzp.server!.removeAllListeners('request');
      fakeRzp.server!.on('request', (req, res) => {
        if (req.method === 'POST' && req.url === `/payments/${payId}/capture`) { fakeRzp.payments.get(rzpOrder)![0]!.status = 'captured'; res.writeHead(200, {'Content-Type': 'application/json'}); res.end(JSON.stringify({id: payId, status: 'captured'})); return; }
        capturing(req, res);
      });
      const authEvt = JSON.stringify({event: 'payment.authorized', payload: {payment: {entity: {id: payId, order_id: rzpOrder, amount: Number(o2.totalPaise), currency: 'INR', status: 'authorized'}}}});
      const authHook = await buyer.raw('post', '/webhooks/payments/razorpay', authEvt, {'Content-Type': 'application/json', 'X-Razorpay-Signature': createHmac('sha256', 'scenario_webhook_secret').update(authEvt).digest('hex'), 'X-Razorpay-Event-Id': `evt_${ulid()}`});
      expect(authHook.body.data.outcome).toBe('PAID');
      expect((await order(o2.orderId)).status).toBe('PAID');
    } finally {
      pp.close();
      delete process.env['PAYPAL_API_BASE'];
      await owner.patch('/admin/settings/payment-mode', {mode: 'mock'});
    }
  });

  it('16. clean-up: every demo record is deleted and the database is back to its exact starting state', async () => {
    const created = await prisma.order.count() + await prisma.product.count();
    expect(created).toBeGreaterThan(0);
    const {deleted, mismatched} = await restore(baseline);
    console.log('Scenario clean-up deleted rows per table:', JSON.stringify(deleted));
    expect(Object.keys(deleted).length).toBeGreaterThan(20);
    expect(mismatched).toEqual([]);
    const after = await snapshot();
    for (const t of baseline.tables) expect(after.checksums.get(t), t).toBe(baseline.checksums.get(t));
    await rm(process.env['STORAGE_LOCAL_DIR']!, {recursive: true, force: true});
  });
});
