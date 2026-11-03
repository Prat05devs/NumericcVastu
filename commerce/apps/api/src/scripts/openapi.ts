/**
 * Generates docs/api/openapi.json from the route registry (every mounted route is declared there with its access rule
 * and Zod schemas, and a test fails if a route is missing). Run: pnpm openapi
 */
import {writeFileSync, mkdirSync} from 'node:fs';
import {z} from 'zod';
import {ErrorEnvelope} from '@sc/contracts';

// Importing the app registers every route.
process.env['NODE_ENV'] ??= 'development';
for (const [k, v] of Object.entries({DATABASE_URL: 'mysql://openapi:x@127.0.0.1:3306/none', SESSION_SECRET: 'x'.repeat(40), ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'), CRON_JOB_SECRET: 'y'.repeat(40)})) process.env[k] ??= v;
const {createApp} = await import('../app.js');
const {registry} = await import('../lib/http.js');
createApp();

const schema = (s: z.ZodType) => { try { return z.toJSONSchema(s, {io: 'input', unrepresentable: 'any'}); } catch { return {type: 'object'}; } };
const security = (access: string) =>
  access === 'PUBLIC' || access === 'DEV' ? [] : access === 'WEBHOOK' ? [{providerSignature: []}] : access === 'CRON' ? [{cronBearer: []}]
  : access.startsWith('STAFF') ? [{staffSession: []}] : access === 'CART_OWNER' ? [{cartToken: []}, {customerSession: []}]
  : access === 'ORDER_OWNER' ? [{orderToken: []}, {customerSession: []}] : access === 'REQUEST_OWNER' ? [{requestToken: []}, {customerSession: []}] : [{customerSession: []}];

const paths: Record<string, Record<string, unknown>> = {};
for (const r of registry) {
  const path = `/api/v1${r.path.replace(/:([A-Za-z]+)/g, '{$1}').replace('*key', '{key}')}`;
  const params = [...r.path.matchAll(/:([A-Za-z]+)|\*([A-Za-z]+)/g)].map((m) => ({name: m[1] ?? m[2], in: 'path', required: true, schema: {type: 'string'}}));
  const query = r.query ? Object.entries((schema(r.query) as {properties?: Record<string, unknown>}).properties ?? {}).map(([name, s]) => ({name, in: 'query', required: false, schema: s})) : [];
  (paths[path] ??= {})[r.method] = {
    tags: [r.tag], summary: r.summary, 'x-access': r.access, security: security(r.access),
    parameters: [...params, ...query, ...(r.idempotent ? [{name: 'Idempotency-Key', in: 'header', required: true, schema: {type: 'string', minLength: 8, maxLength: 200}}] : [])],
    ...(r.body && {requestBody: {required: true, content: {'application/json': {schema: schema(r.body)}}}}),
    responses: {
      '200': {description: 'Success: {"data": …, "meta": {"requestId": …}}. Money is decimal paise strings.'},
      '4XX': {description: 'Stable error envelope', content: {'application/json': {schema: schema(ErrorEnvelope)}}},
    },
  };
}
const doc = {
  openapi: '3.1.0',
  info: {title: 'NumericcVaastu Commerce API', version: '1.0.0', description: 'Shared commerce API for the crystal store, the main NumericcVaastu site and the back office. Generated from the route registry.'},
  servers: [{url: 'https://api.numericcvaastucrystal.in'}, {url: 'http://localhost:4000'}],
  components: {securitySchemes: {
    customerSession: {type: 'apiKey', in: 'cookie', name: 'sc_session'}, staffSession: {type: 'apiKey', in: 'cookie', name: 'sc_staff', description: 'Requires completed TOTP MFA and an RBAC permission (x-access).'},
    cartToken: {type: 'apiKey', in: 'header', name: 'X-Cart-Token'}, orderToken: {type: 'apiKey', in: 'header', name: 'X-Order-Token'}, requestToken: {type: 'apiKey', in: 'header', name: 'X-Request-Token'},
    providerSignature: {type: 'apiKey', in: 'header', name: 'X-Razorpay-Signature', description: 'Razorpay: HMAC-SHA256 of the raw body. PayPal: transmission headers verified with PayPal. Shipping: X-Signature HMAC.'},
    cronBearer: {type: 'http', scheme: 'bearer'},
  }},
  paths,
};
mkdirSync(new URL('../../../../docs/api/', import.meta.url), {recursive: true});
writeFileSync(new URL('../../../../docs/api/openapi.json', import.meta.url), JSON.stringify(doc, null, 2));
console.log(`OpenAPI written: ${registry.length} operations, ${Object.keys(paths).length} paths → docs/api/openapi.json`);
process.exit(0);
