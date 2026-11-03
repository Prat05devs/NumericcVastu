#!/usr/bin/env node
/**
 * Load test (Section 10 gates, scaled to what one machine can drive). Creates a throwaway database commerce_load,
 * seeds DEMO fixtures with deep stock, starts the API in production-like mode (no dev tools; rate limits disabled
 * because all traffic comes from one IP), then measures:
 *   A) browse: listing, filters, product detail, navigation — autocannon at N connections
 *   B) checkout: cart → add item → server-priced checkout with stock hold — M concurrent virtual users
 * and writes raw results to load-results/<timestamp>.json. Finally drops the database.
 *
 * Usage: node scripts/load-test.mjs [--browse 50] [--checkout 10] [--seconds 30]
 * These numbers describe THIS machine with local MySQL; they are NOT Hostinger capacity. Repeat on staging.
 */
import {spawn, execSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {cpus, totalmem, platform, arch} from 'node:os';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const autocannon = require('autocannon');
const mariadb = require('mariadb');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? Number(process.argv[i + 1]) : d; };
const BROWSE = arg('browse', 50), CHECKOUT = arg('checkout', 10), SECONDS = arg('seconds', 30);
const DB = 'mysql://root:root@127.0.0.1:3316/commerce_load';
const API = 'http://127.0.0.1:4500';
const env = {...process.env, NODE_ENV: 'development', PORT: '4500', DATABASE_URL: DB, DATABASE_POOL_SIZE: '5', LOG_LEVEL: 'warn', LOAD_TEST_DISABLE_RATE_LIMITS: 'true',
  SESSION_SECRET: 'load-'.repeat(10), ENCRYPTION_KEY: Buffer.alloc(32, 3).toString('base64'), CRON_JOB_SECRET: 'cron-'.repeat(10), CORS_ORIGINS: 'http://localhost:3000',
  STORAGE_DRIVER: 'local', STORAGE_LOCAL_DIR: '.storage-load', MAIL_DRIVER: 'disabled', DEV_TOOLS: 'false'};
const root = new URL('..', import.meta.url).pathname;
const api = new URL('../apps/api/', import.meta.url).pathname;

async function admin(sql) { const c = await mariadb.createConnection({host: '127.0.0.1', port: 3316, user: 'root', password: 'root'}); try { return await c.query(sql); } finally { await c.end(); } }
const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] : null; };

await admin('DROP DATABASE IF EXISTS commerce_load');
await admin('CREATE DATABASE commerce_load CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
let server;
try {
  execSync('npx prisma migrate deploy', {cwd: root, env, stdio: 'pipe'});
  execSync('npx tsx src/scripts/seed.ts --demo', {cwd: api, env: {...env, NODE_ENV: 'development'}, stdio: 'pipe'});
  await admin("UPDATE commerce_load.inventory_items i JOIN commerce_load.product_variants v ON v.id=i.variant_id SET i.on_hand_qty=1000000 WHERE v.unique_specimen=0");
  await admin(`INSERT INTO commerce_load.site_settings (\`key\`, value_json, updated_at) VALUES ('shipping', '{"methods":[{"id":"standard","label":"Standard","feePaise":"9900","freeAbovePaise":"199900","active":true}],"holdMinutes":15,"couriers":[]}', NOW(3))`);
  execSync('npx tsc -p tsconfig.build.json', {cwd: api, stdio: 'pipe'});
  server = spawn('node', ['dist/server.js'], {cwd: api, env, stdio: ['ignore', 'ignore', 'inherit']});
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`${API}/api/v1/health/ready`)).ok) break; } catch { /* not up yet */ } await new Promise((r) => setTimeout(r, 500)); }

  const products = (await (await fetch(`${API}/api/v1/products?limit=50`)).json()).data;
  const slug = products.find((p) => p.slug.includes('amethyst')).slug;
  const detail = (await (await fetch(`${API}/api/v1/products/${slug}`)).json()).data;
  const variantId = detail.variants[0].id;

  // A) Browse mix.
  const browse = await autocannon({
    url: API, connections: BROWSE, duration: SECONDS,
    requests: [
      {method: 'GET', path: '/api/v1/products?limit=24'},
      {method: 'GET', path: '/api/v1/products?category=crystals&attr_product_form=bracelet&sort=price_asc'},
      {method: 'GET', path: `/api/v1/products/${slug}`},
      {method: 'GET', path: '/api/v1/navigation'},
    ],
  });

  // B) Checkout virtual users, measured per step (pre-provider: no payment call).
  const lat = {cart: [], add: [], checkout: []};
  let ok = 0, failed = 0;
  const statuses = {};
  const end = Date.now() + SECONDS * 1000;
  const timed = async (bucket, fn) => { const t = performance.now(); const r = await fn(); lat[bucket].push(performance.now() - t); return r; };
  async function vu() {
    while (Date.now() < end) {
      try {
        const cart = await timed('cart', () => fetch(`${API}/api/v1/carts`, {method: 'POST'}).then((r) => r.json()));
        const h = {'Content-Type': 'application/json', 'X-Cart-Token': cart.data.cartToken};
        await timed('add', () => fetch(`${API}/api/v1/carts/${cart.data.cartId}/items/${variantId}`, {method: 'PUT', headers: h, body: JSON.stringify({qty: 1})}));
        const res = await timed('checkout', () => fetch(`${API}/api/v1/checkout/orders`, {method: 'POST', headers: {...h, 'Idempotency-Key': randomUUID()}, body: JSON.stringify({cartId: cart.data.cartId, email: `load-${randomUUID()}@example.test`, shippingMethodId: 'standard', acceptTerms: true, shippingAddress: {fullName: 'Load Test', phone: '9876543210', line1: '1 Load St', city: 'Delhi', state: 'Delhi', postalCode: '110001'}})}));
        statuses[res.status] = (statuses[res.status] ?? 0) + 1;
        if (res.status === 201) ok++; else failed++;
      } catch { failed++; }
    }
  }
  const started = Date.now();
  await Promise.all(Array.from({length: CHECKOUT}, vu));
  const elapsed = (Date.now() - started) / 1000;
  const inv = (await admin(`SELECT on_hand_qty, reserved_qty FROM commerce_load.inventory_items WHERE variant_id='${variantId}'`))[0];

  const result = {
    at: new Date().toISOString(), caveat: 'Single developer machine, local Docker MySQL 8.4, one compiled API process (NODE_ENV=development so per-IP rate limits can be disabled; dev tools off, warn-level logs). NOT a Hostinger measurement.',
    machine: {platform: platform(), arch: arch(), cpus: cpus().length, cpuModel: cpus()[0]?.model, memoryGB: Math.round(totalmem() / 1e9), node: process.version},
    browse: {connections: BROWSE, seconds: SECONDS, requests: browse.requests.total, rps: browse.requests.average, latencyMs: {p50: browse.latency.p50, p90: browse.latency.p90, p99: browse.latency.p99, max: browse.latency.max}, errors: browse.errors, non2xx: browse.non2xx, timeouts: browse.timeouts},
    checkout: {virtualUsers: CHECKOUT, seconds: Math.round(elapsed), ordersCreated: ok, failed, statuses, ordersPerSecond: +(ok / elapsed).toFixed(1),
      latencyMs: Object.fromEntries(Object.entries(lat).map(([k, v]) => [k, {p50: +pct(v, 50).toFixed(1), p95: +pct(v, 95).toFixed(1), p99: +pct(v, 99).toFixed(1)}])),
      inventoryAfter: {onHand: inv.on_hand_qty, reserved: inv.reserved_qty, reservedEqualsOrders: Number(inv.reserved_qty) === ok}},
  };
  mkdirSync(new URL('../load-results/', import.meta.url), {recursive: true});
  const file = new URL(`../load-results/${result.at.replace(/[:.]/g, '-')}.json`, import.meta.url);
  writeFileSync(file, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  server?.kill('SIGTERM');
  await admin('DROP DATABASE IF EXISTS commerce_load');
  execSync('rm -rf .storage-load', {cwd: api});
}
