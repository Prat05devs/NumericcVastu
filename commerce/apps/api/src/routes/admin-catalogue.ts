import express, {Router} from 'express';
import {z} from 'zod';
import * as C from '@sc/contracts';
import {prisma, type Tx} from '../lib/db.js';
import {AppError, notFound} from '../lib/errors.js';
import {ulid} from '../lib/ids.js';
import {noStore, param, parse, route, send, toPlain, mounted} from '../lib/http.js';
import {audit} from '../lib/audit.js';
import {enqueue} from '../lib/outbox.js';
import {getSetting} from '../lib/settings.js';
import {transaction, affected, isUniqueViolation} from '../lib/tx.js';
import {mediaUrl} from '../lib/media.js';
import {acceptLocalUpload, objectKeyFor, presignUpload} from '../lib/storage.js';
import {auditCtx, requireStaff, staffOf} from '../middleware/auth.js';
import {normalize} from '../services/catalogue.js';

export const adminCatalogueRouter = mounted(Router(), '/admin');
const r = adminCatalogueRouter;
const staff = requireStaff;

// ───────────── Products
route(r, {method: 'get', path: '/products', access: 'STAFF:catalogue.read', tag: 'Admin catalogue', summary: 'Admin product search and filtering'}, staff('catalogue.read'), async (req, res) => {
  noStore(res);
  const q = parse(z.object({q: z.string().max(100).optional(), status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(), category: z.string().max(160).optional(), demo: z.enum(['true', 'false']).optional(), page: z.coerce.number().int().min(1).max(500).default(1)}), req.query);
  const where = {
    ...(q.q && {OR: [{title: {contains: q.q}}, {slug: {contains: q.q}}, {variants: {some: {sku: {contains: q.q.toUpperCase()}}}}]}),
    ...(q.status && {status: q.status}), ...(q.category && {category: {slug: q.category}}), ...(q.demo && {isDemo: q.demo === 'true'}),
  };
  const [rows, total] = await Promise.all([
    prisma.product.findMany({where, orderBy: {updatedAt: 'desc'}, skip: (q.page - 1) * 50, take: 50, include: {category: {select: {slug: true, title: true}}, variants: {include: {inventory: true}}, _count: {select: {media: true}}}}),
    prisma.product.count({where}),
  ]);
  send(res, toPlain(rows.map((p) => ({id: p.id, slug: p.slug, title: p.title, status: p.status, productType: p.productType, isDemo: p.isDemo, featured: p.featured, version: p.version, category: p.category, updatedAt: p.updatedAt, media: p._count.media,
    variants: p.variants.map((v) => ({id: v.id, sku: v.sku, title: v.title, pricePaise: v.pricePaise, status: v.status, onHand: v.inventory?.onHandQty ?? 0, reserved: v.inventory?.reservedQty ?? 0}))}))), 200, {total});
});

route(r, {method: 'get', path: '/products/:id', access: 'STAFF:catalogue.read', tag: 'Admin catalogue', summary: 'Full product for editing'}, staff('catalogue.read'), async (req, res) => {
  noStore(res);
  const p = await prisma.product.findUnique({where: {id: param(req, 'id')}, include: {category: true, variants: {include: {inventory: true, gemstone: true, certificates: true, attributeValues: {include: {definition: true}}}}, media: {orderBy: {position: 'asc'}}, attributeValues: {where: {variantId: null}, include: {definition: true}}, rudraksha: true, crystal: true, yantra: true}});
  if (!p) throw notFound('Product');
  send(res, toPlain({...p, media: p.media.map((m) => ({...m, url: mediaUrl(m.objectKey)})), publishChecks: await publishChecks(prisma, p.id)}));
});

/** Writes product-level attributes and the family spec table (Rudraksha / Crystal / Yantra). */
async function writeAttributes(tx: Tx, productId: string, categoryId: string, attributes: Record<string, string | number | boolean>, variantId: string | null = null) {
  if (!Object.keys(attributes).length) return;
  const defs = await tx.attributeDefinition.findMany({where: {code: {in: Object.keys(attributes)}, OR: [{categoryId}, {categoryId: null}, {category: {children: {some: {id: categoryId}}}}]}});
  for (const [code, value] of Object.entries(attributes)) {
    const def = defs.find((d) => d.code === code);
    if (!def) throw new AppError('VALIDATION_FAILED', 422, `Attribute "${code}" is not defined for this category.`);
    const num = def.type === 'INT' || def.type === 'DECIMAL' ? Number(value) : null;
    if (num !== null && !Number.isFinite(num)) throw new AppError('VALIDATION_FAILED', 422, `Attribute "${code}" must be a number.`);
    const data = {valueText: num === null ? String(value).slice(0, 500) : null, valueNumber: num === null ? null : String(num), normalizedValue: normalize(value)};
    const existing = await tx.productAttributeValue.findFirst({where: {productId, variantId, definitionId: def.id}});
    if (existing) await tx.productAttributeValue.update({where: {id: existing.id}, data});
    else await tx.productAttributeValue.create({data: {id: ulid(), productId, variantId, definitionId: def.id, ...data}});
  }
  if (variantId) return;
  const cat = await tx.category.findUniqueOrThrow({where: {id: categoryId}});
  const a = attributes;
  if (cat.kind === 'RUDRAKSHA' && a['mukhi_count'] !== undefined && a['rudraksha_origin'] && a['bead_type'] && a['bead_diameter_mm'] !== undefined) {
    const spec = {mukhiCount: Number(a['mukhi_count']), origin: String(a['rudraksha_origin']), beadType: String(a['bead_type']), sizeMm: String(a['bead_diameter_mm'])};
    await tx.rudrakshaSpec.upsert({where: {productId}, create: {productId, ...spec}, update: spec});
  }
  if (cat.kind === 'CRYSTAL' && a['crystal_mineral'] && a['product_form']) {
    const spec = {mineral: String(a['crystal_mineral']), form: String(a['product_form']), beadSizeMm: a['bead_size_mm'] !== undefined ? String(a['bead_size_mm']) : null, baseMaterial: a['natural_status'] ? String(a['natural_status']) : null};
    await tx.crystalSpec.upsert({where: {productId}, create: {productId, ...spec}, update: spec});
  }
  if (cat.kind === 'YANTRA' && a['yantra_name'] && a['material']) {
    const spec = {yantraType: String(a['yantra_name']), material: String(a['material']), dimensionsJson: {widthMm: Number(a['width_mm'] ?? 0), heightMm: Number(a['height_mm'] ?? 0)}, usageInstructions: a['placement_guidance'] ? String(a['placement_guidance']) : null};
    await tx.yantraSpec.upsert({where: {productId}, create: {productId, ...spec}, update: spec});
  }
}

route(r, {method: 'post', path: '/products', access: 'STAFF:catalogue.write', tag: 'Admin catalogue', summary: 'Create a DRAFT product', body: C.ProductDraft}, staff('catalogue.write'), async (req, res) => {
  const b = parse(C.ProductDraft, req.body);
  const id = ulid();
  try {
    await transaction(async (tx) => {
      const cat = await tx.category.findUnique({where: {id: b.categoryId}});
      if (!cat) throw new AppError('VALIDATION_FAILED', 422, 'Unknown category.');
      await tx.product.create({data: {id, categoryId: b.categoryId, slug: b.slug, title: b.title, productType: b.productType, shortDescription: b.shortDescription, body: b.body, seoTitle: b.seoTitle ?? null, seoDescription: b.seoDescription ?? null, taxGroup: b.taxGroup ?? null, shippingProfile: b.shippingProfile ?? null, returnEligible: b.returnEligible ?? null, isDemo: b.isDemo}});
      await writeAttributes(tx, id, b.categoryId, b.attributes);
      await audit(tx, auditCtx(req, res), 'product.create', 'product', id, {title: b.title, slug: b.slug, isDemo: b.isDemo});
    });
  } catch (e) { if (isUniqueViolation(e)) throw new AppError('CONFLICT', 409, 'That URL slug is already used.'); throw e; }
  send(res, {id, status: 'DRAFT', version: 0}, 201);
});

route(r, {method: 'patch', path: '/products/:id', access: 'STAFF:catalogue.write', tag: 'Admin catalogue', summary: 'Edit with optimistic version check', body: C.ProductPatch}, staff('catalogue.write'), async (req, res) => {
  const b = parse(C.ProductPatch, req.body);
  const id = param(req, 'id');
  const {version, attributes, ...fields} = b;
  const result = await transaction(async (tx) => {
    const n = await tx.product.updateMany({where: {id, version}, data: {...fields, version: {increment: 1}}});
    if (n.count !== 1) {
      if (!(await tx.product.findUnique({where: {id}, select: {id: true}}))) throw notFound('Product');
      throw new AppError('STALE_VERSION', 409, 'Someone else changed this product. Reload to see their changes.');
    }
    const p = await tx.product.findUniqueOrThrow({where: {id}});
    if (attributes) await writeAttributes(tx, id, p.categoryId, attributes);
    await audit(tx, auditCtx(req, res), 'product.update', 'product', id, {fields: Object.keys(fields), attributes: attributes ? Object.keys(attributes) : []});
    if (p.status === 'PUBLISHED') await enqueue(tx, 'web.revalidate', {paths: [`/products/${p.slug}`], tags: ['catalogue']}, null);
    return {id, version: p.version, status: p.status};
  });
  send(res, result);
});

/** Publish gate: a product goes live only with truthful, complete data and real stock (or as made-to-order). */
async function publishChecks(db: Tx | typeof prisma, productId: string): Promise<C.PublishCheck[]> {
  const p = await db.product.findUniqueOrThrow({where: {id: productId}, include: {category: true, variants: {where: {status: 'ACTIVE'}, include: {inventory: true, certificates: true}}, media: true, attributeValues: {include: {definition: true}}}});
  const fam = C.FAMILIES.find((f) => f.family === p.category.kind);
  const have = new Set(p.attributeValues.map((a) => a.definition.code));
  const missing = (fam?.attributes ?? []).filter((a) => a.required && !have.has(a.code)).map((a) => a.label);
  const [tax, cat] = await Promise.all([getSetting('tax', db), getSetting('catalogue', db)]);
  const certified = p.attributeValues.some((a) => a.definition.code === 'certification_status' && a.normalizedValue === 'certified');
  const checks: C.PublishCheck[] = [
    {code: 'TITLE_BODY', ok: p.title.length >= 3 && p.body.trim().length >= 40, message: 'Title and a description of at least 40 characters'},
    {code: 'SEO', ok: Boolean((p.seoDescription ?? p.shortDescription).trim()), message: 'SEO description or short description'},
    {code: 'MEDIA', ok: p.media.some((m) => m.authorized && m.visibility === 'PUBLIC' && m.altText.trim().length >= 5), message: 'At least one original photo confirmed as authorised, with alt text'},
    {code: 'ATTRIBUTES', ok: missing.length === 0, message: missing.length ? `Required details missing: ${missing.join(', ')}` : 'Required category details'},
    {code: 'RETURN_POLICY', ok: p.returnEligible !== null, message: 'Return eligibility explicitly set'},
  ];
  if (p.productType === 'PRODUCT') {
    checks.push({code: 'VARIANT', ok: p.variants.some((v) => v.pricePaise > 0n), message: 'At least one active variant with a price'});
    checks.push({code: 'STOCK', ok: p.variants.some((v) => (v.inventory?.onHandQty ?? 0) > 0), message: 'Real stock recorded (on hand > 0)'});
    if (tax) checks.push({code: 'TAX_GROUP', ok: Boolean(p.taxGroup && tax.groups[p.taxGroup] !== undefined), message: 'Tax group that exists in tax settings'});
  }
  if (certified) checks.push({code: 'CERTIFICATE', ok: p.variants.some((v) => v.certificates.some((c) => c.verifiedStatus === 'VERIFIED')), message: '"Certified" needs a verified issuer report on a variant'});
  if (p.isDemo) checks.push({code: 'DEMO', ok: Boolean(cat?.allowDemoPublish), message: 'Demo fixtures can be published only when demo publishing is enabled (staging)'});
  return checks;
}

route(r, {method: 'post', path: '/products/:id/publish', access: 'STAFF:catalogue.publish', tag: 'Admin catalogue', summary: 'Validate required fields and publish; invalidates caches'}, staff('catalogue.publish'), async (req, res) => {
  const id = param(req, 'id');
  const result = await transaction(async (tx) => {
    const p = await tx.product.findUnique({where: {id}});
    if (!p) throw notFound('Product');
    const checks = await publishChecks(tx, id);
    const failing = checks.filter((c) => !c.ok);
    if (failing.length) throw new AppError('PUBLISH_BLOCKED', 422, 'This product is not ready to publish.', failing);
    await tx.product.update({where: {id}, data: {status: 'PUBLISHED', publishedAt: p.publishedAt ?? new Date(), publishedBy: staffOf(res).user.id, version: {increment: 1}}});
    await audit(tx, auditCtx(req, res), 'product.publish', 'product', id, {});
    await enqueue(tx, 'web.revalidate', {paths: [`/products/${p.slug}`], tags: ['catalogue']}, null);
    return {id, status: 'PUBLISHED', checks};
  });
  send(res, result);
});
route(r, {method: 'post', path: '/products/:id/unpublish', access: 'STAFF:catalogue.publish', tag: 'Admin catalogue', summary: 'Return to draft or archive', body: z.object({archive: z.boolean().default(false)})}, staff('catalogue.publish'), async (req, res) => {
  const {archive} = parse(z.object({archive: z.boolean().default(false)}), req.body);
  const id = param(req, 'id');
  await transaction(async (tx) => {
    const p = await tx.product.findUnique({where: {id}});
    if (!p) throw notFound('Product');
    await tx.product.update({where: {id}, data: {status: archive ? 'ARCHIVED' : 'DRAFT', version: {increment: 1}}});
    await audit(tx, auditCtx(req, res), archive ? 'product.archive' : 'product.unpublish', 'product', id);
    await enqueue(tx, 'web.revalidate', {paths: [`/products/${p.slug}`], tags: ['catalogue']}, null);
  });
  send(res, {id, status: archive ? 'ARCHIVED' : 'DRAFT'});
});

route(r, {method: 'post', path: '/products/:id/variants', access: 'STAFF:catalogue.write', tag: 'Admin catalogue', summary: 'Create or update a variant (price change is audited)', body: C.VariantUpsert}, staff('catalogue.write'), async (req, res) => {
  const b = parse(C.VariantUpsert, req.body);
  const productId = param(req, 'id');
  try {
    const out = await transaction(async (tx) => {
      const p = await tx.product.findUnique({where: {id: productId}});
      if (!p) throw notFound('Product');
      const data = {sku: b.sku, title: b.title, optionJson: b.options, pricePaise: BigInt(b.pricePaise), compareAtPaise: b.compareAtPaise ? BigInt(b.compareAtPaise) : null, weightG: b.weightGrams, uniqueSpecimen: b.uniqueSpecimen};
      let id = b.id;
      if (id) {
        const before = await tx.productVariant.findFirst({where: {id, productId}});
        if (!before) throw notFound('Variant');
        await tx.productVariant.update({where: {id}, data});
        await audit(tx, auditCtx(req, res), 'variant.update', 'variant', id, {sku: b.sku, priceBefore: before.pricePaise, priceAfter: data.pricePaise});
      } else {
        id = ulid();
        await tx.productVariant.create({data: {id, productId, ...data}});
        await tx.inventoryItem.create({data: {variantId: id}});
        await audit(tx, auditCtx(req, res), 'variant.create', 'variant', id, {sku: b.sku, price: data.pricePaise});
      }
      await writeAttributes(tx, productId, p.categoryId, b.attributes, id);
      const cat = await tx.category.findUniqueOrThrow({where: {id: p.categoryId}});
      const a = b.attributes;
      if (cat.kind === 'GEMSTONE' && a['gemstone_mineral'] && a['variety'] && a['carat_weight'] !== undefined && a['treatment'] && a['gemstone_origin'] && a['shape']) {
        const spec = {mineral: String(a['gemstone_mineral']), variety: String(a['variety']), caratDecimal: String(a['carat_weight']), rattiDecimal: a['ratti_weight'] !== undefined ? String(a['ratti_weight']) : null, cut: String(a['shape']), treatment: String(a['treatment']), origin: String(a['gemstone_origin'])};
        await tx.gemstoneSpec.upsert({where: {variantId: id}, create: {variantId: id, ...spec}, update: spec});
      }
      if (p.status === 'PUBLISHED') await enqueue(tx, 'web.revalidate', {paths: [`/products/${p.slug}`], tags: ['catalogue']}, null);
      return {id};
    });
    send(res, out, b.id ? 200 : 201);
  } catch (e) { if (isUniqueViolation(e)) throw new AppError('CONFLICT', 409, 'That SKU is already used.'); throw e; }
});
route(r, {method: 'patch', path: '/variants/:id/status', access: 'STAFF:catalogue.write', tag: 'Admin catalogue', summary: 'Activate or retire a variant', body: z.object({status: z.enum(['ACTIVE', 'RETIRED'])})}, staff('catalogue.write'), async (req, res) => {
  const {status} = parse(z.object({status: z.enum(['ACTIVE', 'RETIRED'])}), req.body);
  const n = await prisma.productVariant.updateMany({where: {id: param(req, 'id')}, data: {status}});
  if (n.count !== 1) throw notFound('Variant');
  await audit(prisma, auditCtx(req, res), 'variant.status', 'variant', param(req, 'id'), {status});
  send(res, {id: param(req, 'id'), status});
});

// ───────────── Media (presigned upload → register)
const Presign = z.object({contentType: z.string().max(60), purpose: z.enum(['product', 'certificate']).default('product')});
route(r, {method: 'post', path: '/products/:id/media/presign', access: 'STAFF:catalogue.write', tag: 'Admin catalogue', summary: 'Signed upload URL to object storage', body: Presign}, staff('catalogue.write'), async (req, res) => {
  const {contentType, purpose} = parse(Presign, req.body);
  const productId = param(req, 'id');
  if (!(await prisma.product.findUnique({where: {id: productId}, select: {id: true}}))) throw notFound('Product');
  send(res, presignUpload(objectKeyFor(purpose === 'certificate' ? 'certificates' : 'products', productId, ulid(), contentType), contentType), 201);
});
route(r, {method: 'put', path: '/uploads/:token', access: 'STAFF:catalogue.write', tag: 'Admin catalogue', summary: 'Local-driver upload target (development only)'}, staff('catalogue.write'), express.raw({type: () => true, limit: '10mb'}), async (req, res) => {
  send(res, await acceptLocalUpload(param(req, 'token'), req.get('Content-Type'), req.body as Buffer), 201);
});
const MediaIn = z.object({objectKey: z.string().regex(/^products\/[A-Z0-9]{26}\/[A-Z0-9]{26}\.(jpg|png|webp|avif)$/), altText: z.string().trim().min(5).max(250), variantId: C.Id.nullable().optional(), width: z.number().int().positive().optional(), height: z.number().int().positive().optional(), authorized: z.literal(true, {message: 'Confirm the photo is your own original or licensed image'}), position: z.number().int().min(0).default(0)});
route(r, {method: 'post', path: '/products/:id/media', access: 'STAFF:catalogue.write', tag: 'Admin catalogue', summary: 'Register an uploaded original photo (authorisation required)', body: MediaIn}, staff('catalogue.write'), async (req, res) => {
  const b = parse(MediaIn, req.body);
  const productId = param(req, 'id');
  if (!b.objectKey.startsWith(`products/${productId}/`)) throw new AppError('VALIDATION_FAILED', 422, 'That upload belongs to another product.');
  const id = ulid();
  await prisma.productMedia.create({data: {id, productId, variantId: b.variantId ?? null, objectKey: b.objectKey, altText: b.altText, width: b.width ?? null, height: b.height ?? null, authorized: true, position: b.position}});
  await audit(prisma, auditCtx(req, res), 'media.add', 'product', productId, {objectKey: b.objectKey, authorized: true});
  send(res, {id, url: mediaUrl(b.objectKey)}, 201);
});
route(r, {method: 'delete', path: '/media/:id', access: 'STAFF:catalogue.write', tag: 'Admin catalogue', summary: 'Remove a photo'}, staff('catalogue.write'), async (req, res) => {
  const m = await prisma.productMedia.findUnique({where: {id: param(req, 'id')}});
  if (!m) throw notFound('Media');
  await prisma.productMedia.delete({where: {id: m.id}});
  await audit(prisma, auditCtx(req, res), 'media.remove', 'product', m.productId, {objectKey: m.objectKey});
  send(res, {deleted: true});
});

// ───────────── Taxonomy & collections
route(r, {method: 'get', path: '/categories', access: 'STAFF:catalogue.read', tag: 'Admin catalogue', summary: 'Taxonomy and filter definitions'}, staff('catalogue.read'), async (_req, res) => {
  noStore(res);
  send(res, await prisma.category.findMany({orderBy: [{storefrontId: 'asc'}, {sortOrder: 'asc'}], include: {attributes: {include: {options: {orderBy: {sortOrder: 'asc'}}}}, _count: {select: {products: true}}}}));
});
const CategoryIn = z.object({slug: C.Slug, title: z.string().trim().min(2).max(160), kind: z.enum(['RUDRAKSHA', 'GEMSTONE', 'CRYSTAL', 'YANTRA', 'WATCH', 'COURSE', 'CONSULTATION', 'OTHER']), parentId: C.Id.nullable().optional(), storefrontId: z.string().max(40).default('crystal'), intro: z.string().max(4000).optional(), sortOrder: z.number().int().default(0), status: z.enum(['ACTIVE', 'HIDDEN']).default('ACTIVE')});
route(r, {method: 'post', path: '/categories', access: 'STAFF:catalogue.write', tag: 'Admin catalogue', summary: 'Create a category', body: CategoryIn}, staff('catalogue.write'), async (req, res) => {
  const b = parse(CategoryIn, req.body);
  const id = ulid();
  try { await prisma.category.create({data: {id, ...b, parentId: b.parentId ?? null, intro: b.intro ?? null}}); } catch (e) { if (isUniqueViolation(e)) throw new AppError('CONFLICT', 409, 'That slug is already used.'); throw e; }
  await audit(prisma, auditCtx(req, res), 'category.create', 'category', id, b);
  send(res, {id}, 201);
});
route(r, {method: 'patch', path: '/categories/:id', access: 'STAFF:catalogue.write', tag: 'Admin catalogue', summary: 'Edit a category', body: C.patchOf(CategoryIn)}, staff('catalogue.write'), async (req, res) => {
  const b = parse(C.patchOf(CategoryIn), req.body);
  const n = await prisma.category.updateMany({where: {id: param(req, 'id')}, data: b});
  if (n.count !== 1) throw notFound('Category');
  await audit(prisma, auditCtx(req, res), 'category.update', 'category', param(req, 'id'), b);
  send(res, {id: param(req, 'id')});
});
const AttrIn = z.object({code: z.string().regex(/^[a-z][a-z0-9_]{1,59}$/), label: z.string().max(120), type: z.enum(['INT', 'DECIMAL', 'TEXT', 'ENUM', 'BOOL']), unit: z.string().max(20).nullable().optional(), filterable: z.boolean().default(false), searchable: z.boolean().default(false), required: z.boolean().default(false), categoryId: C.Id.nullable(), options: z.array(z.string().max(120)).max(100).default([])});
route(r, {method: 'post', path: '/attributes', access: 'STAFF:catalogue.write', tag: 'Admin catalogue', summary: 'Define a filterable attribute', body: AttrIn}, staff('catalogue.write'), async (req, res) => {
  const b = parse(AttrIn, req.body);
  const id = ulid();
  try {
    await prisma.$transaction([
      prisma.attributeDefinition.create({data: {id, code: b.code, label: b.label, type: b.type, unit: b.unit ?? null, filterable: b.filterable, searchable: b.searchable, required: b.required, categoryId: b.categoryId}}),
      ...b.options.map((o, i) => prisma.attributeOption.create({data: {id: ulid(), definitionId: id, value: normalize(o), label: o, sortOrder: i}})),
    ]);
  } catch (e) { if (isUniqueViolation(e)) throw new AppError('CONFLICT', 409, 'That attribute code exists.'); throw e; }
  await audit(prisma, auditCtx(req, res), 'attribute.create', 'attribute', id, {code: b.code});
  send(res, {id}, 201);
});
const CollectionIn = z.object({slug: C.Slug, title: z.string().trim().min(2).max(160), description: z.string().max(4000).optional(), productIds: z.array(C.Id).max(500).default([]), status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'), seoTitle: z.string().max(70).optional(), seoDescription: z.string().max(170).optional()});
route(r, {method: 'get', path: '/collections', access: 'STAFF:catalogue.read', tag: 'Admin catalogue', summary: 'Collections'}, staff('catalogue.read'), async (_req, res) => {
  noStore(res);
  send(res, await prisma.collection.findMany({orderBy: {createdAt: 'desc'}, include: {_count: {select: {products: true}}}}));
});
route(r, {method: 'post', path: '/collections', access: 'STAFF:catalogue.write', tag: 'Admin catalogue', summary: 'Create a collection', body: CollectionIn}, staff('catalogue.write'), async (req, res) => {
  const b = parse(CollectionIn, req.body);
  const id = ulid();
  try {
    await prisma.$transaction([
      prisma.collection.create({data: {id, slug: b.slug, title: b.title, description: b.description ?? null, status: b.status, seoTitle: b.seoTitle ?? null, seoDescription: b.seoDescription ?? null}}),
      prisma.collectionProduct.createMany({data: b.productIds.map((productId, position) => ({collectionId: id, productId, position}))}),
    ]);
  } catch (e) { if (isUniqueViolation(e)) throw new AppError('CONFLICT', 409, 'That slug is already used.'); throw e; }
  await audit(prisma, auditCtx(req, res), 'collection.create', 'collection', id, {slug: b.slug, products: b.productIds.length});
  send(res, {id}, 201);
});
route(r, {method: 'patch', path: '/collections/:id', access: 'STAFF:catalogue.write', tag: 'Admin catalogue', summary: 'Edit a collection and its products', body: C.patchOf(CollectionIn)}, staff('catalogue.write'), async (req, res) => {
  const b = parse(C.patchOf(CollectionIn), req.body);
  const id = param(req, 'id');
  const {productIds, ...fields} = b;
  await transaction(async (tx) => {
    const n = await tx.collection.updateMany({where: {id}, data: fields});
    if (n.count !== 1) throw notFound('Collection');
    if (productIds) {
      await tx.collectionProduct.deleteMany({where: {collectionId: id}});
      await tx.collectionProduct.createMany({data: productIds.map((productId, position) => ({collectionId: id, productId, position}))});
    }
    await audit(tx, auditCtx(req, res), 'collection.update', 'collection', id, {fields: Object.keys(fields), products: productIds?.length});
  });
  send(res, {id});
});

// ───────────── Inventory (movement ledger + version check)
const InventoryQuery = z.object({q: z.string().max(64).optional(), variantId: C.Id.optional(), lowOnly: z.enum(['true']).optional()});
route(r, {method: 'get', path: '/inventory', access: 'STAFF:catalogue.read', tag: 'Admin inventory', summary: 'Stock positions, low-stock first; filter by SKU/title or variant', query: InventoryQuery}, staff('catalogue.read'), async (req, res) => {
  noStore(res);
  const q = parse(InventoryQuery, req.query);
  const threshold = (await getSetting('catalogue'))?.lowStockThreshold ?? 2;
  const rows = await prisma.inventoryItem.findMany({where: {...(q.variantId && {variantId: q.variantId}), ...(q.q && {variant: {OR: [{sku: {contains: q.q.toUpperCase()}}, {product: {title: {contains: q.q}}}]}})}, include: {variant: {select: {sku: true, title: true, product: {select: {id: true, title: true, status: true, isDemo: true}}}}}, orderBy: {onHandQty: 'asc'}, take: 500});
  send(res, rows.map((i) => ({variantId: i.variantId, sku: i.variant.sku, title: `${i.variant.product.title} — ${i.variant.title}`, productId: i.variant.product.id, productStatus: i.variant.product.status, isDemo: i.variant.product.isDemo, onHand: i.onHandQty, reserved: i.reservedQty, available: i.onHandQty - i.reservedQty, version: i.version, low: i.onHandQty - i.reservedQty <= threshold})).filter((r) => !q.lowOnly || r.low));
});
route(r, {method: 'get', path: '/inventory/:variantId/movements', access: 'STAFF:catalogue.read', tag: 'Admin inventory', summary: 'Movement ledger for a variant'}, staff('catalogue.read'), async (req, res) => {
  noStore(res);
  send(res, await prisma.inventoryMovement.findMany({where: {variantId: param(req, 'variantId')}, orderBy: {createdAt: 'desc'}, take: 200}));
});
route(r, {method: 'patch', path: '/inventory/:variantId', access: 'STAFF:inventory.adjust', tag: 'Admin inventory', summary: 'Stock adjustment through the movement ledger (version-checked)', body: C.InventoryAdjust}, staff('inventory.adjust'), async (req, res) => {
  const b = parse(C.InventoryAdjust, req.body);
  const variantId = param(req, 'variantId');
  const out = await transaction(async (tx) => {
    const n = await tx.$executeRaw`UPDATE inventory_items SET on_hand_qty=on_hand_qty+${b.delta}, version=version+1, updated_at=UTC_TIMESTAMP(3) WHERE variant_id=${variantId} AND version=${b.expectedVersion} AND on_hand_qty+${b.delta}>=reserved_qty AND on_hand_qty+${b.delta}>=0`;
    if (affected(n) !== 1) {
      const item = await tx.inventoryItem.findUnique({where: {variantId}});
      if (!item) throw notFound('Variant');
      if (item.version !== b.expectedVersion) throw new AppError('STALE_VERSION', 409, 'Stock changed since you loaded it (for example, a checkout). Reload and try again.', {version: item.version, onHand: item.onHandQty, reserved: item.reservedQty});
      throw new AppError('CONFLICT', 409, `Stock cannot go below what is held for open orders (${item.reservedQty}).`);
    }
    const variant = await tx.productVariant.findUniqueOrThrow({where: {id: variantId}, select: {uniqueSpecimen: true}});
    const item = await tx.inventoryItem.findUniqueOrThrow({where: {variantId}});
    if (variant.uniqueSpecimen && item.onHandQty > 1) throw new AppError('CONFLICT', 409, 'A one-of-a-kind specimen can have at most 1 in stock.');
    await tx.inventoryMovement.create({data: {id: ulid(), variantId, kind: b.reason, qtyDelta: b.delta, referenceType: 'manual', note: b.note ?? null, actorId: staffOf(res).user.id}});
    await audit(tx, auditCtx(req, res), 'inventory.adjust', 'variant', variantId, {delta: b.delta, reason: b.reason, onHand: item.onHandQty});
    return {variantId, onHand: item.onHandQty, reserved: item.reservedQty, version: item.version};
  });
  send(res, out);
});

// ───────────── Certificates (real issuer evidence only)
route(r, {method: 'get', path: '/certificates', access: 'STAFF:catalogue.read', tag: 'Admin certificates', summary: 'Certificate management'}, staff('catalogue.read'), async (_req, res) => {
  noStore(res);
  send(res, await prisma.certificate.findMany({orderBy: {createdAt: 'desc'}, take: 200, include: {variant: {select: {sku: true, product: {select: {title: true}}}}}}));
});
route(r, {method: 'post', path: '/certificates', access: 'STAFF:certificates.write', tag: 'Admin certificates', summary: 'Register a real issuer document (starts UNVERIFIED)', body: C.CertificateCreate}, staff('certificates.write'), async (req, res) => {
  const b = parse(C.CertificateCreate, req.body);
  const variant = await prisma.productVariant.findUnique({where: {id: b.variantId}, include: {product: {select: {isDemo: true}}}});
  if (!variant) throw notFound('Variant');
  const id = ulid();
  try {
    await prisma.certificate.create({data: {id, productVariantId: b.variantId, issuer: b.issuer, reportNo: b.reportNo, reportType: b.reportType, issuedOn: new Date(`${b.issuedOn}T00:00:00Z`), objectKey: b.objectKey ?? null, disclosureJson: b.disclosure, evidenceNote: b.evidenceNote, isDemo: variant.product.isDemo}});
  } catch (e) { if (isUniqueViolation(e)) throw new AppError('CONFLICT', 409, 'That report number is already registered.'); throw e; }
  await audit(prisma, auditCtx(req, res), 'certificate.create', 'certificate', id, {issuer: b.issuer, reportNo: b.reportNo});
  send(res, {id, verifiedStatus: 'UNVERIFIED'}, 201);
});
const CertDecision = z.object({decision: z.enum(['VERIFIED', 'REJECTED']), note: z.string().trim().min(10).max(500)});
route(r, {method: 'post', path: '/certificates/:id/decision', access: 'STAFF:certificates.write', tag: 'Admin certificates', summary: 'Mark verified (needs the uploaded report and a check note) or rejected', body: CertDecision}, staff('certificates.write'), async (req, res) => {
  const b = parse(CertDecision, req.body);
  const c = await prisma.certificate.findUnique({where: {id: param(req, 'id')}});
  if (!c) throw notFound('Certificate');
  if (b.decision === 'VERIFIED' && !c.objectKey && !c.isDemo) throw new AppError('CONFLICT', 409, 'Upload the issuer’s report before marking it verified.');
  await prisma.certificate.update({where: {id: c.id}, data: {verifiedStatus: b.decision, verifiedBy: staffOf(res).user.id, verifiedAt: new Date(), evidenceNote: `${c.evidenceNote} | ${b.decision}: ${b.note}`.slice(0, 500)}});
  await audit(prisma, auditCtx(req, res), `certificate.${b.decision.toLowerCase()}`, 'certificate', c.id, {note: b.note});
  send(res, {id: c.id, verifiedStatus: b.decision});
});
