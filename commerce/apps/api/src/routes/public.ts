import express, {Router, type Request, type Response} from 'express';
import {z} from 'zod';
import * as C from '@sc/contracts';
import {env} from '../config/env.js';
import {prisma} from '../lib/db.js';
import {AppError, notFound} from '../lib/errors.js';
import {decrypt, encrypt, randomToken, sha256, sixDigitCode, safeEqual} from '../lib/crypto.js';
import {publicCode, ulid} from '../lib/ids.js';
import {decodeCursor, encodeCursor, noStore, param, parse, publicCache, route, send, toPlain} from '../lib/http.js';
import {idempotent} from '../lib/idempotency.js';
import {sendMail} from '../lib/mail.js';
import {enqueue} from '../lib/outbox.js';
import {getSetting} from '../lib/settings.js';
import {transaction} from '../lib/tx.js';
import {audit} from '../lib/audit.js';
import {mediaUrl} from '../lib/media.js';
import {cookies, rateLimit} from '../middleware/core.js';
import {auditCtx, clearCookie, customerOf, issueCsrf, requireCustomer, setCookie, startSession} from '../middleware/auth.js';
import {availability, listProducts, productDetail} from '../services/catalogue.js';
import {breakdown, priceCart} from '../services/pricing.js';
import {createOrder} from '../services/checkout.js';
import {handlePaymentWebhook, paymentIntent, reconcilePayment} from '../services/payments.js';
import {paymentOptions} from '../providers/payments/index.js';
import {lockOrder, moveOrder, releaseHolds} from '../services/orders.js';
import {emailHash, recordClick} from '../services/affiliates.js';
import {type OrderStatus} from '@sc/contracts';
import {handleShippingWebhook, trackingView} from '../services/shipping.js';
import {isUniqueViolation} from '../lib/tx.js';

export const publicRouter = Router();
const r = publicRouter;
const authLimit = rateLimit('auth', 10, 60_000);
const browseLimit = rateLimit('browse', 300, 60_000);
const checkoutLimit = rateLimit('checkout', 30, 60_000);
const formLimit = rateLimit('forms', 5, 10 * 60_000);

/** Storefront scope: crystal shop by default; the main NumericcVaastu site sends X-Storefront: numericcvaastu. */
const storefrontCache = new Map<string, number>();
async function storefrontOf(req: Request): Promise<string> {
  const id = (req.get('X-Storefront') ?? 'crystal').toLowerCase();
  if (!/^[a-z0-9-]{2,40}$/.test(id)) throw new AppError('VALIDATION_FAILED', 422, 'Unknown storefront.');
  const cached = storefrontCache.get(id);
  if (cached && cached > Date.now()) return id;
  if (!(await prisma.storefront.findUnique({where: {id}, select: {id: true}}))) throw new AppError('VALIDATION_FAILED', 422, 'Unknown storefront.');
  storefrontCache.set(id, Date.now() + 60_000);
  return id;
}

// ───────────── Health
route(r, {method: 'get', path: '/health/live', access: 'PUBLIC', tag: 'Health', summary: 'Process liveness'}, (_req, res) => { noStore(res); send(res, {status: 'ok'}); });
route(r, {method: 'get', path: '/health/ready', access: 'INTERNAL', tag: 'Health', summary: 'Database readiness (no sensitive detail)'}, async (_req, res) => {
  noStore(res);
  try { await prisma.$queryRaw`SELECT 1`; send(res, {status: 'ready'}); } catch { throw new AppError('SERVICE_UNAVAILABLE', 503, 'Not ready.'); }
});

// ───────────── Auth (customer email OTP)
route(r, {method: 'get', path: '/auth/csrf', access: 'PUBLIC', tag: 'Auth', summary: 'Issue the double-submit CSRF token cookie'}, (_req, res) => { noStore(res); send(res, {csrfToken: issueCsrf(res)}); });

const otpHash = (email: string, code: string) => sha256(`${env().SESSION_SECRET}|otp|${email}|${code}`);
route(r, {method: 'post', path: '/auth/otp/request', access: 'PUBLIC', tag: 'Auth', summary: 'Send a sign-in code. Generic response; no account enumeration', body: C.OtpRequest}, authLimit, async (req, res) => {
  noStore(res);
  const {email} = parse(C.OtpRequest, req.body);
  const recent = await prisma.otpChallenge.count({where: {email, createdAt: {gt: new Date(Date.now() - 15 * 60_000)}}});
  if (recent < 5) {
    const code = sixDigitCode();
    await prisma.otpChallenge.create({data: {id: ulid(), email, codeHash: otpHash(email, code), expiresAt: new Date(Date.now() + 10 * 60_000)}});
    await sendMail({to: email, subject: `Your sign-in code: ${code}`, text: `Your NumericcVaastu sign-in code is ${code}. It expires in 10 minutes. If you did not ask for it, ignore this email.`, tag: 'otp'}).catch(() => undefined);
  }
  send(res, {sent: true, message: 'If the address can receive email, a code is on its way.'});
});
route(r, {method: 'post', path: '/auth/otp/verify', access: 'PUBLIC', tag: 'Auth', summary: 'Verify the code; rotates and sets the session cookie', body: C.OtpVerify}, authLimit, async (req, res) => {
  noStore(res);
  const {email, code} = parse(C.OtpVerify, req.body);
  const challenge = await prisma.otpChallenge.findFirst({where: {email, consumedAt: null, expiresAt: {gt: new Date()}}, orderBy: {createdAt: 'desc'}});
  if (!challenge || challenge.attempts >= 5) throw new AppError('INVALID_OTP', 422, 'That code is invalid or has expired. Request a new one.');
  const bumped = await prisma.otpChallenge.updateMany({where: {id: challenge.id, attempts: {lt: 5}, consumedAt: null}, data: {attempts: {increment: 1}}});
  if (bumped.count !== 1 || !safeEqual(challenge.codeHash, otpHash(email, code))) throw new AppError('INVALID_OTP', 422, 'That code is invalid or has expired. Request a new one.');
  const consumed = await prisma.otpChallenge.updateMany({where: {id: challenge.id, consumedAt: null}, data: {consumedAt: new Date()}});
  if (consumed.count !== 1) throw new AppError('INVALID_OTP', 422, 'That code was already used.');
  const user = await prisma.user.upsert({where: {email}, create: {id: ulid(), email, verifiedAt: new Date()}, update: {verifiedAt: new Date(), lastLoginAt: new Date()}});
  if (user.status !== 'ACTIVE') throw new AppError('FORBIDDEN', 403, 'This account is not active.');
  await startSession(res, user.id, 'CUSTOMER', false, customerOf(res)?.sessionId, {ua: req.get('User-Agent')?.slice(0, 200)});
  // Adopt the guest cart, and link any partner account invited with this email.
  const cartToken = cookies(res)['sc_cart'];
  if (cartToken) await prisma.cart.updateMany({where: {guestTokenHash: sha256(cartToken), userId: null}, data: {userId: user.id}});
  await prisma.affiliate.updateMany({where: {email, userId: null}, data: {userId: user.id}});
  send(res, {user: {id: user.id, email: user.email, name: user.name}});
});
route(r, {method: 'post', path: '/auth/logout', access: 'CUSTOMER', tag: 'Auth', summary: 'Invalidate the current session'}, async (_req, res) => {
  const c = customerOf(res);
  if (c) await prisma.session.updateMany({where: {id: c.sessionId}, data: {revokedAt: new Date()}});
  clearCookie(res, 'sc_session');
  send(res, {signedOut: true});
});

// ───────────── Account
route(r, {method: 'get', path: '/me', access: 'CUSTOMER', tag: 'Account', summary: 'Current account'}, requireCustomer, async (_req, res) => {
  noStore(res);
  const u = await prisma.user.findUniqueOrThrow({where: {id: customerOf(res)!.user.id}, select: {id: true, email: true, phone: true, name: true, createdAt: true}});
  const partner = await prisma.affiliate.findFirst({where: {userId: u.id}, select: {status: true}});
  send(res, {...u, roles: ['CUSTOMER', ...(partner ? ['PARTNER'] : [])]});
});
route(r, {method: 'patch', path: '/me', access: 'CUSTOMER', tag: 'Account', summary: 'Update safe profile fields', body: C.ProfilePatch}, requireCustomer, async (req, res) => {
  const body = parse(C.ProfilePatch, req.body);
  const u = await prisma.user.update({where: {id: customerOf(res)!.user.id}, data: body, select: {id: true, email: true, phone: true, name: true}}).catch(() => { throw new AppError('CONFLICT', 409, 'That phone number is already in use.'); });
  send(res, u);
});
route(r, {method: 'get', path: '/me/addresses', access: 'CUSTOMER', tag: 'Account', summary: 'Own saved addresses'}, requireCustomer, async (_req, res) => {
  noStore(res);
  send(res, await prisma.customerAddress.findMany({where: {userId: customerOf(res)!.user.id}, orderBy: {createdAt: 'desc'}}));
});
const toAddressRow = (a: C.IndianAddress) => ({label: a.label ?? null, fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 ?? null, locality: a.locality ?? null, city: a.city, region: a.state, postalCode: a.postalCode, country: 'IN'});
route(r, {method: 'post', path: '/me/addresses', access: 'CUSTOMER', tag: 'Account', summary: 'Add an Indian address', body: C.IndianAddress}, requireCustomer, async (req, res) => {
  const a = parse(C.IndianAddress, req.body);
  const userId = customerOf(res)!.user.id;
  if ((await prisma.customerAddress.count({where: {userId}})) >= 20) throw new AppError('CONFLICT', 409, 'You can save up to 20 addresses.');
  send(res, await prisma.customerAddress.create({data: {id: ulid(), userId, ...toAddressRow(a)}}), 201);
});
route(r, {method: 'patch', path: '/me/addresses/:id', access: 'CUSTOMER', tag: 'Account', summary: 'Update own address', body: C.IndianAddress}, requireCustomer, async (req, res) => {
  const a = parse(C.IndianAddress, req.body);
  const n = await prisma.customerAddress.updateMany({where: {id: param(req, 'id'), userId: customerOf(res)!.user.id}, data: toAddressRow(a)});
  if (n.count !== 1) throw notFound('Address');
  send(res, await prisma.customerAddress.findUnique({where: {id: param(req, 'id')}}));
});
route(r, {method: 'delete', path: '/me/addresses/:id', access: 'CUSTOMER', tag: 'Account', summary: 'Delete own address'}, requireCustomer, async (req, res) => {
  const n = await prisma.customerAddress.deleteMany({where: {id: param(req, 'id'), userId: customerOf(res)!.user.id}});
  if (n.count !== 1) throw notFound('Address');
  send(res, {deleted: true});
});
route(r, {method: 'get', path: '/me/orders', access: 'CUSTOMER', tag: 'Account', summary: 'Own order history, cursor paging'}, requireCustomer, async (req, res) => {
  noStore(res);
  const cursor = decodeCursor<{c: string; id: string}>(req.query['cursor'] as string | undefined);
  const userId = customerOf(res)!.user.id;
  const rows = await prisma.order.findMany({
    where: {userId, ...(cursor && {OR: [{createdAt: {lt: new Date(cursor.c)}}, {createdAt: new Date(cursor.c), id: {lt: cursor.id}}]})},
    orderBy: [{createdAt: 'desc'}, {id: 'desc'}], take: 21,
    select: {id: true, publicCode: true, status: true, paymentStatus: true, fulfillmentStatus: true, totalPaise: true, createdAt: true, _count: {select: {lines: true}}},
  });
  const page = rows.slice(0, 20);
  const last = page.at(-1);
  send(res, page, 200, {nextCursor: rows.length > 20 && last ? encodeCursor({c: last.createdAt.toISOString(), id: last.id}) : null});
});
route(r, {method: 'get', path: '/me/export', access: 'CUSTOMER', tag: 'Account', summary: 'Download a copy of my personal data'}, requireCustomer, async (_req, res) => {
  noStore(res);
  const id = customerOf(res)!.user.id;
  const [user, addresses, orders, consents] = await Promise.all([
    prisma.user.findUnique({where: {id}, select: {email: true, phone: true, name: true, createdAt: true}}),
    prisma.customerAddress.findMany({where: {userId: id}}),
    prisma.order.findMany({where: {userId: id}, include: {lines: true, addresses: true}}),
    prisma.customerConsent.findMany({where: {userId: id}}),
  ]);
  send(res, toPlain({user, addresses, orders, consents}));
});
route(r, {method: 'delete', path: '/me', access: 'CUSTOMER', tag: 'Account', summary: 'Erase my account (orders kept only as legally required records)'}, requireCustomer, async (req, res) => {
  const id = customerOf(res)!.user.id;
  await transaction(async (tx) => {
    await tx.customerAddress.deleteMany({where: {userId: id}});
    await tx.session.updateMany({where: {userId: id}, data: {revokedAt: new Date()}});
    await tx.user.update({where: {id}, data: {email: null, phone: null, name: null, status: 'ERASED'}});
    await audit(tx, auditCtx(req, res), 'account.erase', 'user', id, {});
  });
  clearCookie(res, 'sc_session');
  send(res, {erased: true, note: 'Order and invoice records are retained where the law requires; they are no longer linked to a sign-in.'});
});

// ───────────── Catalogue & content
route(r, {method: 'get', path: '/navigation', access: 'PUBLIC', tag: 'Catalogue', summary: 'Menu tree, highlights and active campaign banner'}, browseLimit, async (req, res) => {
  const storefrontId = await storefrontOf(req);
  const [cats, nav] = await Promise.all([
    prisma.category.findMany({where: {storefrontId, status: 'ACTIVE'}, orderBy: [{sortOrder: 'asc'}, {title: 'asc'}], select: {id: true, parentId: true, slug: true, title: true, kind: true}}),
    getSetting('navigation'),
  ]);
  const now = new Date();
  const campaigns = (await prisma.campaign.findMany({where: {active: true, startsAt: {lte: now}, endsAt: {gt: now}}, orderBy: {priority: 'desc'}}))
    .filter((c) => !(c.storefronts as string[]).length || (c.storefronts as string[]).includes(storefrontId));
  const tree = cats.filter((c) => !c.parentId).map((c) => ({...c, children: cats.filter((x) => x.parentId === c.id)}));
  publicCache(res, 60);
  send(res, {categories: tree, highlights: nav?.highlights ?? [], campaign: campaigns[0] ? {slug: campaigns[0].slug, name: campaigns[0].name, endsAt: campaigns[0].endsAt, theme: campaigns[0].themeJson} : null});
});
route(r, {method: 'get', path: '/categories', access: 'PUBLIC', tag: 'Catalogue', summary: 'Category tree with filter definitions'}, browseLimit, async (req, res) => {
  const storefrontId = await storefrontOf(req);
  const cats = await prisma.category.findMany({where: {storefrontId, status: 'ACTIVE'}, orderBy: [{sortOrder: 'asc'}], include: {attributes: {where: {filterable: true}, include: {options: {orderBy: {sortOrder: 'asc'}}}}}});
  publicCache(res, 120);
  send(res, cats.map((c) => ({id: c.id, parentId: c.parentId, slug: c.slug, title: c.title, kind: c.kind, intro: c.intro, filters: c.attributes.map((a) => ({code: a.code, label: a.label, type: a.type, unit: a.unit, options: a.options.map((o) => ({value: o.value, label: o.label}))}))})));
});
const listQuery = async (req: Request) => {
  const raw = parse(C.ProductListQuery, req.query);
  const attrs: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (k.startsWith('attr_') && typeof v === 'string') attrs[k.slice(5)] = v;
  return {storefrontId: await storefrontOf(req), category: raw.category, collection: raw.collection, q: raw.q, sort: raw.sort, minPrice: raw.minPrice, maxPrice: raw.maxPrice, inStock: raw.inStock, cursor: raw.cursor, limit: raw.limit, attrs};
};
route(r, {method: 'get', path: '/products', access: 'PUBLIC', tag: 'Catalogue', summary: 'Cursor-paged listing with allowlisted filters (attr_<code>=v1,v2)', query: C.ProductListQuery}, browseLimit, async (req, res) => {
  const result = await listProducts(await listQuery(req));
  publicCache(res, 30);
  send(res, result.items, 200, {nextCursor: result.nextCursor});
});
route(r, {method: 'get', path: '/search', access: 'PUBLIC', tag: 'Catalogue', summary: 'Search with safe filters and suggestions', query: C.ProductListQuery}, rateLimit('search', 60, 60_000), async (req, res) => {
  const q = await listQuery(req);
  const result = await listProducts(q);
  const suggestions = q.q ? await prisma.category.findMany({where: {storefrontId: q.storefrontId, status: 'ACTIVE', title: {contains: q.q}}, select: {slug: true, title: true}, take: 5}) : [];
  publicCache(res, 30);
  send(res, {items: result.items, suggestions}, 200, {nextCursor: result.nextCursor});
});
route(r, {method: 'get', path: '/collections/:slug', access: 'PUBLIC', tag: 'Catalogue', summary: 'Collection SEO header and first page of products'}, browseLimit, async (req, res) => {
  const c = await prisma.collection.findUnique({where: {slug: param(req, 'slug')}});
  if (!c || c.status !== 'PUBLISHED') throw notFound('Collection');
  const products = await listProducts({...(await listQuery(req)), collection: c.slug});
  publicCache(res, 60);
  send(res, {slug: c.slug, title: c.title, description: c.description, seo: {title: c.seoTitle ?? c.title, description: c.seoDescription ?? c.description}, products: products.items}, 200, {nextCursor: products.nextCursor});
});
route(r, {method: 'get', path: '/products/:slug', access: 'PUBLIC', tag: 'Catalogue', summary: 'Product with variants, media, specs, verified certificates and reviews'}, browseLimit, async (req, res) => {
  const detail = await productDetail(param(req, 'slug'), await storefrontOf(req));
  publicCache(res, 60);
  send(res, detail);
});
route(r, {method: 'get', path: '/products/:id/availability', access: 'PUBLIC', tag: 'Catalogue', summary: 'Current sellable availability (no-store)'}, browseLimit, async (req, res) => {
  noStore(res);
  send(res, await availability(param(req, 'id')));
});
route(r, {method: 'get', path: '/pages/:slug', access: 'PUBLIC', tag: 'Content', summary: 'Published CMS / policy page'}, browseLimit, async (req, res) => {
  const p = await prisma.cmsPage.findUnique({where: {slug: param(req, 'slug')}});
  if (!p || p.status !== 'PUBLISHED') throw notFound('Page');
  publicCache(res, 300);
  send(res, {slug: p.slug, title: p.title, kind: p.kind, blocks: p.bodyBlocksJson, seo: {title: p.seoTitle ?? p.title, description: p.seoDescription}, publishedAt: p.publishedAt, updatedAt: p.updatedAt});
});
route(r, {method: 'get', path: '/articles', access: 'PUBLIC', tag: 'Content', summary: 'Published guides'}, browseLimit, async (_req, res) => {
  publicCache(res, 300);
  send(res, await prisma.article.findMany({where: {status: 'PUBLISHED'}, orderBy: {publishedAt: 'desc'}, take: 50, select: {slug: true, title: true, summary: true, author: true, publishedAt: true, isDemo: true}}));
});
route(r, {method: 'get', path: '/articles/:slug', access: 'PUBLIC', tag: 'Content', summary: 'Published guide'}, browseLimit, async (req, res) => {
  const a = await prisma.article.findUnique({where: {slug: param(req, 'slug')}});
  if (!a || a.status !== 'PUBLISHED') throw notFound('Article');
  publicCache(res, 300);
  send(res, a);
});
route(r, {method: 'get', path: '/certificates/verify/:reportNo', access: 'PUBLIC', tag: 'Content', summary: 'Verified public report metadata only'}, rateLimit('cert', 30, 60_000), async (req, res) => {
  const c = await prisma.certificate.findUnique({where: {reportNo: param(req, 'reportNo')}, include: {variant: {select: {sku: true, product: {select: {title: true, slug: true}}}}}});
  noStore(res);
  if (!c || c.verifiedStatus !== 'VERIFIED') throw new AppError('NOT_FOUND', 404, 'No verified report with that number. Check the number, or contact us.');
  send(res, {issuer: c.issuer, reportNo: c.reportNo, reportType: c.reportType, issuedOn: c.issuedOn, product: c.variant.product, sku: c.variant.sku, disclosure: c.disclosureJson, isDemo: c.isDemo});
});
route(r, {method: 'get', path: '/campaigns/active', access: 'PUBLIC', tag: 'Content', summary: 'Running sale campaigns and their themes (for banners)'}, browseLimit, async (req, res) => {
  const storefrontId = await storefrontOf(req);
  const now = new Date();
  const rows = (await prisma.campaign.findMany({where: {active: true, startsAt: {lte: now}, endsAt: {gt: now}}, orderBy: {priority: 'desc'}})).filter((c) => !(c.storefronts as string[]).length || (c.storefronts as string[]).includes(storefrontId));
  publicCache(res, 60);
  send(res, rows.map((c) => ({slug: c.slug, name: c.name, startsAt: c.startsAt, endsAt: c.endsAt, theme: c.themeJson})));
});
route(r, {method: 'get', path: '/media/*key', access: 'PUBLIC', tag: 'Content', summary: 'Local-driver media (production uses object storage / CDN)'}, async (req, res) => {
  if (env().STORAGE_DRIVER !== 'local') throw notFound();
  const key = ([] as string[]).concat((req.params as Record<string, string | string[]>)['key'] ?? []).join('/');
  if (!/^(products|certificates)\/[A-Za-z0-9/_.-]+$/.test(key) || key.includes('..') || key.startsWith('certificates/')) throw notFound();
  const media = await prisma.productMedia.findFirst({where: {objectKey: key, visibility: 'PUBLIC'}, select: {id: true}});
  if (!media) throw notFound();
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.sendFile(key, {root: env().STORAGE_LOCAL_DIR, dotfiles: 'deny'});
});

// ───────────── Partner link click (→ signed attribution token; the web app sets it as a first-party cookie)
route(r, {method: 'get', path: '/r/:code', access: 'PUBLIC', tag: 'Partners', summary: 'Record a partner-link click and return a signed attribution token'}, rateLimit('click', 30, 60_000), async (req, res) => {
  noStore(res);
  const result = await recordClick(param(req, 'code'), {ip: req.ip ?? '', userAgent: req.get('X-Visitor-User-Agent') ?? req.get('User-Agent'), referrer: req.get('X-Visitor-Referrer') ?? req.get('Referer')});
  if (!result) throw notFound('Link');
  send(res, result);
});

// ───────────── Cart
async function cartFor(req: Request, res: Response, cartId: string) {
  const cart = await prisma.cart.findUnique({where: {id: cartId}});
  const token = req.get('X-Cart-Token') ?? cookies(res)['sc_cart'];
  const customer = customerOf(res);
  const owner = cart && ((token && cart.guestTokenHash && safeEqual(cart.guestTokenHash, sha256(token))) || (customer && cart.userId === customer.user.id));
  if (!cart || !owner || cart.expiresAt <= new Date()) throw notFound('Cart'); // 404, never reveal another customer's cart
  return cart;
}
async function cartView(cartId: string, storefrontId: string, userId: string | null) {
  const p = await priceCart(cartId, {storefrontId, userId});
  return {
    id: cartId, currency: 'INR',
    items: p.lines.map((l) => ({variantId: l.variantId, productId: l.productId, sku: l.sku, title: l.title, productTitle: l.productTitle, qty: l.qty, unitPricePaise: l.pricePaise.toString(), sellable: l.sellable, inStock: l.available >= l.qty, uniqueSpecimen: l.uniqueSpecimen})),
    breakdown: toPlain(breakdown(p.result)), shippingOptions: toPlain(p.shippingOptions),
  };
}
route(r, {method: 'post', path: '/carts', access: 'PUBLIC', tag: 'Cart', summary: 'Create a cart; returns the cart token (also set as an httpOnly cookie)'}, checkoutLimit, async (req, res) => {
  noStore(res);
  const storefrontId = await storefrontOf(req);
  const token = randomToken(24);
  const customer = customerOf(res);
  const cart = await prisma.cart.create({data: {id: ulid(), storefrontId, guestTokenHash: sha256(token), userId: customer?.user.id ?? null, expiresAt: new Date(Date.now() + 30 * 86_400_000)}});
  setCookie(res, 'sc_cart', token, 30 * 86_400_000);
  if (!cookies(res)['sc_csrf']) issueCsrf(res);
  send(res, {cartId: cart.id, cartToken: token}, 201);
});
route(r, {method: 'get', path: '/carts/:id', access: 'CART_OWNER', tag: 'Cart', summary: 'Cart with server-calculated prices'}, async (req, res) => {
  noStore(res);
  const cart = await cartFor(req, res, param(req, 'id'));
  send(res, await cartView(cart.id, cart.storefrontId, customerOf(res)?.user.id ?? null));
});
route(r, {method: 'put', path: '/carts/:id/items/:variantId', access: 'CART_OWNER', tag: 'Cart', summary: 'Set quantity (idempotent); never reserves stock', body: C.CartItemPut}, checkoutLimit, async (req, res) => {
  noStore(res);
  const cart = await cartFor(req, res, param(req, 'id'));
  const {qty} = parse(C.CartItemPut, req.body);
  const variant = await prisma.productVariant.findUnique({where: {id: param(req, 'variantId')}, include: {product: {include: {category: {select: {storefrontId: true}}}}}});
  if (!variant || variant.status !== 'ACTIVE' || variant.product.status !== 'PUBLISHED' || variant.product.productType !== 'PRODUCT' || variant.product.category.storefrontId !== cart.storefrontId) throw notFound('Product');
  if (variant.uniqueSpecimen && qty > 1) throw new AppError('VALIDATION_FAILED', 422, 'This is a one-of-a-kind piece; the quantity must be 1.');
  if ((await prisma.cartItem.count({where: {cartId: cart.id}})) >= 30) throw new AppError('CONFLICT', 409, 'Your cart is full.');
  await prisma.cartItem.upsert({where: {cartId_variantId: {cartId: cart.id, variantId: variant.id}}, create: {cartId: cart.id, variantId: variant.id, qty}, update: {qty}});
  send(res, await cartView(cart.id, cart.storefrontId, customerOf(res)?.user.id ?? null));
});
route(r, {method: 'delete', path: '/carts/:id/items/:variantId', access: 'CART_OWNER', tag: 'Cart', summary: 'Remove a line'}, async (req, res) => {
  noStore(res);
  const cart = await cartFor(req, res, param(req, 'id'));
  await prisma.cartItem.deleteMany({where: {cartId: cart.id, variantId: param(req, 'variantId')}});
  send(res, await cartView(cart.id, cart.storefrontId, customerOf(res)?.user.id ?? null));
});

// ───────────── Checkout
const refOf = (req: Request, res: Response, bodyRef?: string) => bodyRef ?? cookies(res)['sc_ref'] ?? req.get('X-Attribution');
route(r, {method: 'post', path: '/checkout/preview', access: 'CART_OWNER', tag: 'Checkout', summary: 'Server-side discount, shipping, tax and availability', body: C.CheckoutPreview}, checkoutLimit, async (req, res) => {
  noStore(res);
  const body = parse(C.CheckoutPreview, req.body);
  const cart = await cartFor(req, res, body.cartId);
  const p = await priceCart(cart.id, {storefrontId: cart.storefrontId, couponCode: body.couponCode, shippingMethodId: body.shippingMethodId, ref: refOf(req, res, body.ref), userId: customerOf(res)?.user.id ?? null});
  send(res, {
    breakdown: toPlain(breakdown(p.result)), lines: toPlain(p.result.lines),
    availability: p.lines.map((l) => ({variantId: l.variantId, sellable: l.sellable, inStock: l.available >= l.qty})),
    coupon: p.coupon ? (p.coupon.ok ? {valid: true, code: p.coupon.discount.code} : {valid: false, message: p.coupon.message}) : null,
    partnerAttributed: Boolean(p.attribution), shippingOptions: toPlain(p.shippingOptions), shippingConfigured: p.shippingConfigured, taxConfigured: p.taxConfigured, holdMinutes: p.holdMinutes,
  });
});
route(r, {method: 'post', path: '/checkout/orders', access: 'CART_OWNER', tag: 'Checkout', summary: 'Idempotent stock reservation + pending order', body: C.CheckoutCreate, idempotent: true}, checkoutLimit, async (req, res) => {
  noStore(res);
  const body = parse(C.CheckoutCreate, req.body);
  const cart = await cartFor(req, res, body.cartId);
  const customer = customerOf(res);
  const result = await idempotent(req, 'checkout', customer?.user.id ?? `cart:${cart.id}`, (idem) =>
    createOrder({...body, ref: refOf(req, res, body.ref)}, {storefrontId: cart.storefrontId, userId: customer?.user.id ?? null, idem}));
  send(res, result.body, result.status);
});

// ───────────── Orders (owner = signed-in customer, or holder of the order access token)
async function orderFor(req: Request, res: Response) {
  const order = await prisma.order.findUnique({where: {id: param(req, 'id')}});
  const token = req.get('X-Order-Token') ?? (req.query['t'] as string | undefined);
  const customer = customerOf(res);
  const owner = order && ((customer && order.userId === customer.user.id) || (token && safeEqual(order.accessTokenHash, sha256(token))));
  if (!order || !owner) throw notFound('Order');
  return order;
}
route(r, {method: 'get', path: '/orders/:id', access: 'ORDER_OWNER', tag: 'Orders', summary: 'Order details and latest payment status'}, async (req, res) => {
  noStore(res);
  const o = await orderFor(req, res);
  const full = await prisma.order.findUniqueOrThrow({where: {id: o.id}, include: {lines: true, addresses: true, payments: {select: {status: true, provider: true, createdAt: true}}, shipments: true, events: {orderBy: {createdAt: 'asc'}, select: {toStatus: true, createdAt: true}}, returns: true}});
  send(res, toPlain({
    id: full.id, publicCode: full.publicCode, status: full.status, paymentStatus: full.paymentStatus, fulfillmentStatus: full.fulfillmentStatus, email: full.email,
    subtotalPaise: full.subtotalPaise, discountPaise: full.discountPaise, shippingPaise: full.shippingPaise, taxPaise: full.taxPaise, totalPaise: full.totalPaise, refundedPaise: full.refundedPaise, taxMode: full.taxMode,
    paymentDueAt: full.paymentDueAt, paidAt: full.paidAt, createdAt: full.createdAt,
    lines: full.lines.map((l) => ({id: l.id, sku: l.skuSnapshot, title: l.titleSnapshot, qty: l.qty, unitPricePaise: l.unitPricePaise, discountPaise: l.discountPaise, taxPaise: l.taxPaise, totalPaise: l.totalPaise})),
    shippingAddress: full.addresses.find((a) => a.type === 'SHIPPING')?.snapshotJson, payments: full.payments, shipments: full.shipments.map((s) => ({courier: s.courier, trackingNo: s.trackingNo, status: s.status})),
    timeline: full.events, returns: full.returns.map((x) => ({id: x.id, status: x.status, requestedAt: x.requestedAt})),
    // While the provider has not confirmed, the UI shows "verifying payment", never "paid".
    verifyingPayment: ['AWAITING_PAYMENT', 'PAYMENT_FAILED'].includes(full.status) && full.payments.some((p) => p.status === 'CREATED'),
  }));
});
route(r, {method: 'get', path: '/orders/:id/payment-options', access: 'ORDER_OWNER', tag: 'Orders', summary: 'Payment methods available for this order (with the amount each would charge)'}, async (req, res) => {
  noStore(res);
  const order = await orderFor(req, res);
  const {PROVIDERS} = await import('../providers/payments/index.js');
  const options = await paymentOptions();
  send(res, await Promise.all(options.map(async (o) => ({...o, charge: toPlain(await PROVIDERS[o.provider].chargeFor(order.totalPaise).catch(() => null))}))));
});
route(r, {method: 'post', path: '/orders/:id/payment-intents', access: 'ORDER_OWNER', tag: 'Orders', summary: 'Create or reuse the provider order safely (provider: razorpay | paypal)', body: C.PaymentIntentCreate, idempotent: true}, checkoutLimit, async (req, res) => {
  noStore(res);
  const order = await orderFor(req, res);
  const {provider} = parse(C.PaymentIntentCreate, req.body);
  const result = await idempotent(req, 'payment-intent', order.id, async () => ({status: 201, body: await paymentIntent(order.id, provider)}));
  send(res, result.body, result.status);
});
route(r, {method: 'post', path: '/orders/:id/payment-sync', access: 'ORDER_OWNER', tag: 'Orders', summary: 'After the provider popup closes (Razorpay success / PayPal approval): the API checks — and for PayPal captures — server-to-server; the browser is never trusted'}, rateLimit('sync', 10, 60_000), async (req, res) => {
  noStore(res);
  const order = await orderFor(req, res);
  const payments = await prisma.payment.findMany({where: {orderId: order.id, status: {in: ['CREATED', 'FAILED', 'AUTHORIZED']}}});
  for (const p of payments) await reconcilePayment(p.id).catch(() => undefined);
  const fresh = await prisma.order.findUniqueOrThrow({where: {id: order.id}, select: {status: true, paymentStatus: true}});
  send(res, fresh);
});
route(r, {method: 'post', path: '/orders/:id/cancel', access: 'ORDER_OWNER', tag: 'Orders', summary: 'Cancel an unpaid order, or request cancellation of a paid unshipped one', body: C.CancelOrder}, async (req, res) => {
  const order = await orderFor(req, res);
  const {reason} = parse(C.CancelOrder, req.body);
  const outcome = await transaction(async (tx) => {
    await lockOrder(tx, order.id);
    const o = await tx.order.findUniqueOrThrow({where: {id: order.id}});
    if (['AWAITING_PAYMENT', 'PAYMENT_FAILED'].includes(o.status)) {
      await moveOrder(tx, o.id, o.status as OrderStatus, 'CANCELLED', customerOf(res)?.user.id ?? null, reason ?? 'Cancelled by customer', {cancelledAt: new Date()});
      await releaseHolds(tx, o.id);
      return {status: 'CANCELLED'};
    }
    if (['PAID', 'PROCESSING'].includes(o.status)) {
      await tx.orderEvent.create({data: {id: ulid(), orderId: o.id, actorId: customerOf(res)?.user.id ?? null, fromStatus: o.status, toStatus: o.status, reason: `CANCELLATION_REQUESTED: ${reason ?? 'no reason given'}`}});
      await enqueue(tx, 'finance.alert', {orderId: o.id, kind: 'CANCELLATION_REQUESTED'}, `cancel_req:${o.id}`);
      return {status: o.status, cancellationRequested: true, message: 'We have received your request; our team will confirm and refund if the order has not shipped.'};
    }
    throw new AppError('ILLEGAL_TRANSITION', 409, 'This order can no longer be cancelled. You may be able to request a return after delivery.');
  });
  send(res, outcome);
});
route(r, {method: 'post', path: '/orders/:id/returns', access: 'ORDER_OWNER', tag: 'Orders', summary: 'Request a return where the configured policy allows', body: C.ReturnRequest}, async (req, res) => {
  const order = await orderFor(req, res);
  const body = parse(C.ReturnRequest, req.body);
  const policy = await getSetting('returns');
  if (!policy?.enabled) throw new AppError('CONFLICT', 409, 'Returns are not available. Please contact us about your order.');
  const page = await prisma.cmsPage.findUnique({where: {slug: policy.policyPageSlug}, select: {status: true}});
  if (page?.status !== 'PUBLISHED') throw new AppError('CONFLICT', 409, 'Returns are not available until the returns policy is published.');
  const result = await transaction(async (tx) => {
    await lockOrder(tx, order.id);
    const o = await tx.order.findUniqueOrThrow({where: {id: order.id}, include: {lines: {include: {variant: {select: {product: {select: {returnEligible: true}}}}}}}});
    if (o.status !== 'DELIVERED') throw new AppError('ILLEGAL_TRANSITION', 409, 'Returns can be requested after delivery.');
    const delivered = await tx.orderEvent.findFirst({where: {orderId: o.id, toStatus: 'DELIVERED'}, orderBy: {createdAt: 'desc'}});
    if (!delivered || delivered.createdAt.getTime() + policy.windowDays * 86_400_000 < Date.now()) throw new AppError('CONFLICT', 409, `The ${policy.windowDays}-day return window has passed.`);
    const lines = o.lines.filter((l) => body.lineIds.includes(l.id));
    if (lines.length !== body.lineIds.length) throw new AppError('VALIDATION_FAILED', 422, 'Unknown order line.');
    if (lines.some((l) => l.variant.product.returnEligible !== true)) throw new AppError('CONFLICT', 409, 'One or more items are not eligible for return under the policy.');
    const id = ulid();
    await tx.returnRequest.create({data: {id, orderId: o.id, reason: body.reason, lineIdsJson: body.lineIds}});
    await moveOrder(tx, o.id, 'DELIVERED', 'RETURN_REQUESTED', customerOf(res)?.user.id ?? null, 'Return requested');
    return {returnId: id, status: 'REQUESTED'};
  });
  send(res, result, 201);
});
route(r, {method: 'get', path: '/orders/:id/shipments', access: 'ORDER_OWNER', tag: 'Orders', summary: 'Tracked shipments'}, async (req, res) => {
  noStore(res);
  const order = await orderFor(req, res);
  send(res, await prisma.shipment.findMany({where: {orderId: order.id}, include: {events: {orderBy: {occurredAt: 'asc'}, select: {status: true, occurredAt: true}}}}));
});
route(r, {method: 'get', path: '/orders/:id/invoice', access: 'ORDER_OWNER', tag: 'Orders', summary: 'Invoice data, only once seller tax details are configured'}, async (req, res) => {
  noStore(res);
  const order = await orderFor(req, res);
  const inv = await getSetting('invoice');
  if (!inv) throw new AppError('CONFLICT', 409, 'Invoices are issued once the seller’s registered tax details are configured.');
  if (!order.paidAt) throw new AppError('CONFLICT', 409, 'An invoice is issued after payment.');
  const full = await prisma.order.findUniqueOrThrow({where: {id: order.id}, include: {lines: true, addresses: true}});
  send(res, toPlain({seller: inv, invoiceNo: `${inv.invoicePrefix}-${full.publicCode.slice(4)}`, issuedAt: full.paidAt, order: {publicCode: full.publicCode, taxMode: full.taxMode, lines: full.lines, subtotalPaise: full.subtotalPaise, discountPaise: full.discountPaise, shippingPaise: full.shippingPaise, taxPaise: full.taxPaise, totalPaise: full.totalPaise}, billTo: full.addresses.find((a) => a.type === 'BILLING')?.snapshotJson}));
});

// ───────────── Webhooks (raw body, HMAC verified before parsing)
const raw = express.raw({type: () => true, limit: '512kb'});
const headerMap = (req: Request) => Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k.toLowerCase(), Array.isArray(v) ? v[0] : v]));
route(r, {method: 'post', path: '/webhooks/payments/:provider', access: 'WEBHOOK', tag: 'Webhooks', summary: 'Payment provider webhooks: razorpay (HMAC), paypal (verified with PayPal), mock outside production'}, rateLimit('webhook', 600, 60_000), raw, async (req, res) => {
  const result = await handlePaymentWebhook(param(req, 'provider'), req.body as Buffer, headerMap(req));
  send(res, result);
});
route(r, {method: 'post', path: '/webhooks/shipping/:provider', access: 'WEBHOOK', tag: 'Webhooks', summary: 'Delivery partner webhook: provider signature, dedupe, forward-only status'}, rateLimit('webhook', 600, 60_000), raw, async (req, res) => {
  send(res, await handleShippingWebhook(param(req, 'provider'), req.body as Buffer, headerMap(req)));
});

// ───────────── Order tracking & delivery feedback
route(r, {method: 'get', path: '/orders/:id/tracking', access: 'ORDER_OWNER', tag: 'Tracking', summary: 'Progress steps, courier scans and tracking links'}, async (req, res) => {
  noStore(res);
  const order = await orderFor(req, res);
  send(res, toPlain(await trackingView(order.id)));
});
route(r, {method: 'post', path: '/track', access: 'PUBLIC', tag: 'Tracking', summary: 'Track an order with its order number and email (no account needed)', body: C.TrackLookup}, rateLimit('track', 10, 10 * 60_000), async (req, res) => {
  noStore(res);
  const b = parse(C.TrackLookup, req.body);
  const order = await prisma.order.findUnique({where: {publicCode: b.orderCode}, select: {id: true, email: true}});
  if (!order || !safeEqual(sha256(order.email.toLowerCase()), sha256(b.email))) throw new AppError('NOT_FOUND', 404, 'We could not find an order with that number and email.');
  send(res, toPlain(await trackingView(order.id)));
});
route(r, {method: 'post', path: '/orders/:id/delivery-feedback', access: 'ORDER_OWNER', tag: 'Tracking', summary: 'Rate the delivery once the order has arrived', body: C.DeliveryFeedbackCreate}, rateLimit('feedback', 10, 60_000), async (req, res) => {
  const order = await orderFor(req, res);
  const b = parse(C.DeliveryFeedbackCreate, req.body);
  if (order.status !== 'DELIVERED' && !(await prisma.shipment.count({where: {orderId: order.id, status: 'DELIVERED'}}))) throw new AppError('CONFLICT', 409, 'You can rate the delivery once your order has arrived.');
  const shipment = await prisma.shipment.findFirst({where: {orderId: order.id}, orderBy: {createdAt: 'desc'}, select: {id: true}});
  try {
    await prisma.deliveryFeedback.create({data: {id: ulid(), orderId: order.id, shipmentId: shipment?.id ?? null, rating: b.rating, onTime: b.onTime ?? null, packagingOk: b.packagingOk ?? null, comment: b.comment ?? null}});
  } catch (e) { if (isUniqueViolation(e)) throw new AppError('CONFLICT', 409, 'Thank you — feedback for this order was already received.'); throw e; }
  send(res, {received: true}, 201);
});

// ───────────── Made-to-order wristwatch requests
route(r, {method: 'post', path: '/custom-requests', access: 'PUBLIC', tag: 'Custom requests', summary: 'Submit a wristwatch request (consent required; details encrypted)', body: C.CustomRequestCreate}, formLimit, async (req, res) => {
  noStore(res);
  const b = parse(C.CustomRequestCreate, req.body);
  const token = randomToken(24);
  const id = ulid();
  const referenceCode = publicCode('NVW');
  await transaction(async (tx) => {
    await tx.customRequest.create({data: {
      id, userId: customerOf(res)?.user.id ?? null, requestType: b.requestType, referenceCode, accessTokenHash: sha256(token), budgetBand: b.budgetBand, publicNotes: '',
      privateDetailsEncrypted: encrypt(JSON.stringify({name: b.name, email: b.email, phone: b.phone, preferredStyle: b.preferredStyle, requirements: b.requirements, dateOfBirth: b.dateOfBirth ?? null})),
      consentVersion: b.consentVersion, emailHash: emailHash(b.email),
    }});
    await tx.customerConsent.create({data: {id: ulid(), userId: customerOf(res)?.user.id ?? null, subjectRef: emailHash(b.email), purpose: 'CUSTOM_REQUEST', version: b.consentVersion, acceptedAt: new Date(), source: 'custom-request'}});
    await enqueue(tx, 'email.request_received', {email: b.email, referenceCode}, `request_received:${id}`);
  });
  send(res, {referenceCode, accessToken: token, status: 'REQUESTED'}, 201);
});
async function requestFor(req: Request, res: Response) {
  const cr = await prisma.customRequest.findUnique({where: {referenceCode: param(req, 'ref')}});
  const token = req.get('X-Request-Token') ?? (req.query['t'] as string | undefined);
  const customer = customerOf(res);
  if (!cr || !((customer && cr.userId === customer.user.id) || (token && safeEqual(cr.accessTokenHash, sha256(token))))) throw notFound('Request');
  return cr;
}
route(r, {method: 'get', path: '/custom-requests/:ref', access: 'REQUEST_OWNER', tag: 'Custom requests', summary: 'Own request status and quotations'}, async (req, res) => {
  noStore(res);
  const cr = await requestFor(req, res);
  const quotes = await prisma.quotation.findMany({where: {requestId: cr.id, status: {in: ['SENT', 'ACCEPTED', 'EXPIRED']}}, include: {items: true}, orderBy: {version: 'desc'}});
  const details = JSON.parse(decrypt(cr.privateDetailsEncrypted)) as Record<string, unknown>;
  send(res, toPlain({referenceCode: cr.referenceCode, status: cr.status, budgetBand: cr.budgetBand, notes: cr.publicNotes, createdAt: cr.createdAt, details: {name: details['name'], preferredStyle: details['preferredStyle'], requirements: details['requirements']},
    quotes: quotes.map((q) => ({version: q.version, status: q.expiresAt < new Date() && q.status === 'SENT' ? 'EXPIRED' : q.status, totalPaise: q.totalPaise, expiresAt: q.expiresAt, terms: q.termsSnapshot, orderId: q.orderId, items: q.items.map((i) => ({description: i.description, qty: i.qty, unitPaise: i.unitPaise, taxPaise: i.taxPaise}))}))}));
});
route(r, {method: 'post', path: '/custom-requests/:ref/accept-quote', access: 'REQUEST_OWNER', tag: 'Custom requests', summary: 'Accept a specific unexpired quote version → order awaiting payment', body: z.object({version: z.number().int().min(1), acceptTerms: z.literal(true)}), idempotent: true}, async (req, res) => {
  noStore(res);
  const cr = await requestFor(req, res);
  const {version} = parse(z.object({version: z.number().int().min(1), acceptTerms: z.literal(true)}), req.body);
  const result = await idempotent(req, 'accept-quote', cr.id, async (idem) => transaction(async (tx) => {
    const q = await tx.quotation.findUnique({where: {requestId_version: {requestId: cr.id, version}}, include: {items: true}});
    if (!q || q.status !== 'SENT') throw new AppError('CONFLICT', 409, 'That quotation is not open for acceptance.');
    if (q.expiresAt <= new Date()) throw new AppError('CONFLICT', 409, 'That quotation has expired. Ask us for an updated quote.');
    const moved = await tx.customRequest.updateMany({where: {id: cr.id, status: 'QUOTED'}, data: {status: 'PAYMENT_PENDING'}});
    if (moved.count !== 1) throw new AppError('ILLEGAL_TRANSITION', 409, 'This request is not awaiting a decision on a quote.');
    await tx.quotation.update({where: {id: q.id}, data: {status: 'ACCEPTED', acceptedAt: new Date()}});
    const variant = await tx.productVariant.findUnique({where: {sku: 'CUSTOM-WATCH'}});
    if (!variant) throw new AppError('CONFLICT', 409, 'Custom orders are not set up (missing CUSTOM-WATCH item).');
    const details = JSON.parse(decrypt(cr.privateDetailsEncrypted)) as {email: string; name: string; phone: string};
    const token = randomToken(24);
    const orderId = ulid();
    const subtotal = q.items.reduce((s, i) => s + i.unitPaise * BigInt(i.qty), 0n);
    const tax = q.items.reduce((s, i) => s + i.taxPaise, 0n);
    const code = publicCode('NVC');
    const due = new Date(Math.min(q.expiresAt.getTime(), Date.now() + 3 * 86_400_000));
    await tx.order.create({data: {id: orderId, publicCode: code, accessTokenHash: sha256(token), userId: cr.userId, email: details.email, storefrontId: 'crystal', subtotalPaise: subtotal, discountPaise: 0n, shippingPaise: 0n, taxPaise: tax, totalPaise: q.totalPaise, taxMode: 'QUOTED', priceVersion: sha256(`quote:${q.id}`), shippingMethodId: 'custom', pricingSnapshot: toPlain({quotationId: q.id, version: q.version}) as object, paymentDueAt: due, customRequestId: cr.id}});
    await tx.orderLine.createMany({data: q.items.map((i) => ({id: ulid(), orderId, variantId: variant.id, skuSnapshot: 'CUSTOM-WATCH', titleSnapshot: i.description, attributesSnapshotJson: {quotation: q.version}, qty: i.qty, unitPricePaise: i.unitPaise, discountPaise: 0n, taxPaise: i.taxPaise, totalPaise: i.unitPaise * BigInt(i.qty) + i.taxPaise}))});
    await tx.orderAddress.create({data: {orderId, type: 'BILLING', snapshotJson: {fullName: details.name, phone: details.phone}}});
    await tx.orderEvent.create({data: {id: ulid(), orderId, actorId: cr.userId, fromStatus: null, toStatus: 'AWAITING_PAYMENT', reason: `Quotation v${q.version} accepted`}});
    await tx.quotation.update({where: {id: q.id}, data: {orderId}});
    const body = {orderId, publicCode: code, orderAccessToken: token, totalPaise: q.totalPaise.toString(), paymentDueAt: due.toISOString()};
    await idem.complete(tx, {status: 201, body});
    return {status: 201, body};
  }));
  send(res, result.body, result.status);
});

// ───────────── Consultation enquiries
route(r, {method: 'get', path: '/consultation/options', access: 'PUBLIC', tag: 'Consultation', summary: 'Enquiry types as configured (not inferred availability)'}, async (_req, res) => {
  publicCache(res, 300);
  send(res, (await getSetting('consultation')) ?? {topics: [], note: 'Consultation enquiries are not open yet.'});
});
route(r, {method: 'post', path: '/consultation/enquiries', access: 'PUBLIC', tag: 'Consultation', summary: 'Opt-in consultation enquiry; contact details encrypted', body: C.ConsultationEnquiry}, formLimit, async (req, res) => {
  noStore(res);
  const b = parse(C.ConsultationEnquiry, req.body);
  const options = await getSetting('consultation');
  if (!options?.topics.some((t) => t.id === b.topic)) throw new AppError('VALIDATION_FAILED', 422, 'That enquiry type is not available.');
  const id = ulid();
  await prisma.$transaction([
    prisma.consultationLead.create({data: {id, userId: customerOf(res)?.user.id ?? null, topic: b.topic, contactRef: encrypt(JSON.stringify({name: b.name, email: b.email, phone: b.phone ?? null, message: b.message})), consentVersion: b.consentVersion}}),
    prisma.customerConsent.create({data: {id: ulid(), userId: customerOf(res)?.user.id ?? null, subjectRef: emailHash(b.email), purpose: 'CONSULTATION', version: b.consentVersion, acceptedAt: new Date(), source: 'consultation'}}),
  ]);
  send(res, {received: true, reference: id.slice(-8)}, 201);
});

export {storefrontOf, mediaUrl};
