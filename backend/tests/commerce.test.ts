import {test, after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

/**
 * Database tests against a real MySQL or MariaDB. Set TEST_DATABASE_URL to a database whose name ends in _test
 * (it is emptied first), e.g. TEST_DATABASE_URL=mysql://root:root@127.0.0.1:3306/numericcvaastu_test npm test
 * Without it these tests are skipped; the pricing and crypto tests still run.
 */
const url = process.env.TEST_DATABASE_URL;
const skip = !url ? 'set TEST_DATABASE_URL to run database tests' : !/_test(\?|$)/.test(url) ? 'TEST_DATABASE_URL must name a database ending in _test' : false;

let db: any, buildQuote: any, recordRedemption: any, storefrontConfig: any;
if (!skip) {
  process.env.DATABASE_URL = url;
  const {createDb, getDb} = await import('../src/lib/db.ts');
  const reset = createDb(url);
  await reset.execute('SET FOREIGN_KEY_CHECKS = 0');
  for (const row of await reset.query<{name: string}>('SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()')) await reset.execute(`DROP TABLE \`${row.name}\``);
  await reset.close();
  ({buildQuote, recordRedemption, storefrontConfig} = await import('../src/lib/commerce.ts'));
  db = await getDb();
  after(() => db.close());
}

const day = 86_400_000;
const at = (offset: number) => new Date(Date.now() + offset);

test('migrations create the schema and the website catalogue', {skip}, async () => {
  const items = await db.one("select count(*) as n from catalogue_items where storefront_id = 'numericcvaastu'");
  assert.equal(items?.n, 14);
  const relationship = await db.one("select price_inr, price_usd, active from catalogue_items where id = 'consult-relationship'");
  assert.deepEqual(relationship, {price_inr: 750000, price_usd: 18000, active: true});
  const {migrate} = await import('../src/lib/db.ts');
  assert.deepEqual(await migrate(db), []);
});

test('a quote uses server prices and refuses unknown items', {skip}, async () => {
  const q = await buildQuote({storefront: 'numericcvaastu', currency: 'INR', items: [{id: 'course-launchpad'}]});
  assert.equal(q.total, 2999900);
  await assert.rejects(buildQuote({storefront: 'numericcvaastu', currency: 'INR', items: [{id: 'not-real'}]}), /Unknown/);
  await assert.rejects(buildQuote({storefront: 'crystal', currency: 'INR', items: [{id: 'course-launchpad'}]}), /Unknown/);
});

test('coupons apply, expire and respect usage limits', {skip}, async () => {
  await db.execute(`insert into coupons (id, code, discount, storefronts, max_redemptions) values (?, 'WELCOME10', ?, '[]', 1)`, [randomUUID(), JSON.stringify({type: 'percent', percentOff: 10, appliesTo: {kinds: ['consultation']}})]);
  await db.execute(`insert into coupons (id, code, discount, storefronts, ends_at) values (?, 'OLD', ?, '[]', ?)`, [randomUUID(), JSON.stringify({type: 'percent', percentOff: 50}), at(-day)]);
  const q = await buildQuote({storefront: 'numericcvaastu', currency: 'INR', items: [{id: 'consult-relationship'}], couponCode: 'welcome10'});
  assert.equal(q.coupon?.amount, 75000);
  assert.equal(q.total, 675000);
  const expired = await buildQuote({storefront: 'numericcvaastu', currency: 'INR', items: [{id: 'consult-relationship'}], couponCode: 'OLD'});
  assert.equal(expired.couponError, 'This code has expired.');
  const first = await recordRedemption({storefront: 'numericcvaastu', orderRef: 'order_1', currency: 'INR', items: [{id: 'consult-relationship'}], couponCode: 'WELCOME10', customerEmail: 'a@example.com'});
  assert.equal(first.recorded, true);
  const repeat = await recordRedemption({storefront: 'numericcvaastu', orderRef: 'order_1', currency: 'INR', items: [{id: 'consult-relationship'}], couponCode: 'WELCOME10'});
  assert.equal(repeat.recorded, false);
  const used = await buildQuote({storefront: 'numericcvaastu', currency: 'INR', items: [{id: 'consult-relationship'}], couponCode: 'WELCOME10'});
  assert.equal(used.couponError, 'This code has been fully used.');
});

test('a running sale discounts automatically and decorates the storefront', {skip}, async () => {
  await db.execute(`insert into campaigns (id, name, slug, storefronts, starts_at, ends_at, discount, theme) values (?, 'Diwali Sale', 'diwali', '[]', ?, ?, ?, ?)`,
    [randomUUID(), at(-day), at(day), JSON.stringify({type: 'percent', percentOff: 15, appliesTo: {kinds: ['course']}}), JSON.stringify({badge: 'Diwali Sale', decoration: 'diyas'})]);
  const q = await buildQuote({storefront: 'numericcvaastu', currency: 'USD', items: [{id: 'course-launchpad'}]});
  assert.equal(q.campaign?.label, 'Diwali Sale');
  assert.equal(q.discount, 10300); // 15% of $690 = $103.50 → $103
  const config = await storefrontConfig('numericcvaastu');
  assert.equal(config.campaign?.theme.decoration, 'diyas');
  assert.ok(config.campaign.endsAt instanceof Date);
  assert.equal(config.payments.razorpay.mode, 'test');
});

test('an affiliate link applies its coupon, earns commission and matches its code exactly', {skip}, async () => {
  const couponId = randomUUID(); const affiliateId = randomUUID();
  await db.execute(`insert into coupons (id, code, discount, storefronts) values (?, 'PRIYA10', ?, '[]')`, [couponId, JSON.stringify({type: 'percent', percentOff: 10})]);
  await db.execute(`insert into affiliates (id, name, commission, notes) values (?, 'Priya', '{"type":"percent","percent":10}', '')`, [affiliateId]);
  await db.execute(`insert into affiliate_links (id, code, affiliate_id, coupon_id, storefront_id) values (?, 'Abc23xyz45', ?, ?, 'numericcvaastu')`, [randomUUID(), affiliateId, couponId]);
  const wrongCase = await buildQuote({storefront: 'numericcvaastu', currency: 'INR', items: [{id: 'consult-career'}], ref: 'abc23XYZ45'});
  assert.equal(wrongCase.affiliate, null);
  const q = await buildQuote({storefront: 'numericcvaastu', currency: 'INR', items: [{id: 'consult-career'}], ref: 'Abc23xyz45'});
  assert.equal(q.couponCode, 'PRIYA10');
  assert.equal(q.affiliate?.code, 'Abc23xyz45');
  const {recorded, quote} = await recordRedemption({storefront: 'numericcvaastu', orderRef: 'order_2', currency: 'INR', items: [{id: 'consult-career'}], ref: 'Abc23xyz45'});
  assert.equal(recorded, true);
  const row = await db.one("select commission from redemptions where order_ref = 'order_2'");
  assert.equal(row?.commission, Math.floor(quote.total / 10));
  await db.execute("update affiliate_links set active = 0 where code = 'Abc23xyz45'");
  const off = await buildQuote({storefront: 'numericcvaastu', currency: 'INR', items: [{id: 'consult-career'}], ref: 'Abc23xyz45'});
  assert.equal(off.affiliate, null);
  assert.equal(off.coupon, null);
});

test('times are stored and read back in UTC', {skip}, async () => {
  const when = new Date('2026-11-14T18:30:00.000Z');
  await db.execute(`insert into campaigns (id, name, slug, storefronts, starts_at, ends_at, discount, theme) values (?, 'Tz', 'tz', '[]', ?, ?, '{"type":"none"}', '{}')`, [randomUUID(), when, at(400 * day)]);
  const row = await db.one("select starts_at, created_at from campaigns where slug = 'tz'");
  assert.equal(row.starts_at.toISOString(), when.toISOString());
  assert.ok(Math.abs(row.created_at.getTime() - Date.now()) < 60_000, 'database clock read as UTC');
});
