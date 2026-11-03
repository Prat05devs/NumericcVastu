import {Prisma} from '../generated/prisma/client.js';
import {prisma} from '../lib/db.js';
import {AppError} from '../lib/errors.js';
import {mediaUrl} from '../lib/media.js';
import {decodeCursor, encodeCursor} from '../lib/http.js';

export type ListQuery = {storefrontId: string; category?: string | undefined; collection?: string | undefined; q?: string | undefined; sort: 'featured' | 'newest' | 'price_asc' | 'price_desc'; minPrice?: string | undefined; maxPrice?: string | undefined; inStock?: boolean | undefined; cursor?: string | undefined; limit: number; attrs: Record<string, string>};

/** Normalised attribute value used for facet filtering (trimmed, lower-case, single spaces). */
export const normalize = (v: string | number | boolean) => String(v).trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 160);

/**
 * Public product listing. Filters are allowlisted: attribute filters must name a filterable definition; everything is
 * a bound parameter (no SQL assembled from query strings). The cursor is opaque; page size is capped at 50.
 */
export async function listProducts(q: ListQuery) {
  const conditions: Prisma.Sql[] = [Prisma.sql`p.status = 'PUBLISHED'`, Prisma.sql`c.storefront_id = ${q.storefrontId}`, Prisma.sql`c.status = 'ACTIVE'`];
  if (q.category) conditions.push(Prisma.sql`(c.slug = ${q.category} OR c.parent_id = (SELECT id FROM categories WHERE slug = ${q.category}))`);
  if (q.collection) conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM collection_products cp JOIN collections co ON co.id = cp.collection_id WHERE cp.product_id = p.id AND co.slug = ${q.collection} AND co.status = 'PUBLISHED')`);
  if (q.q) {
    const like = `%${q.q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    conditions.push(Prisma.sql`(p.title LIKE ${like} OR p.short_description LIKE ${like} OR EXISTS (SELECT 1 FROM product_attribute_values s WHERE s.product_id = p.id AND s.normalized_value LIKE ${like.toLowerCase()}))`);
  }
  const codes = Object.keys(q.attrs);
  if (codes.length) {
    const defs = await prisma.attributeDefinition.findMany({where: {code: {in: codes}, filterable: true}, select: {id: true, code: true}});
    for (const code of codes) {
      const def = defs.find((d) => d.code === code);
      if (!def) throw new AppError('VALIDATION_FAILED', 422, `Unknown filter: ${code}`);
      const values = q.attrs[code]!.split(',').map(normalize).filter(Boolean).slice(0, 10);
      if (values.length) conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM product_attribute_values f WHERE f.product_id = p.id AND f.definition_id = ${def.id} AND f.normalized_value IN (${Prisma.join(values)}))`);
    }
  }
  const having: Prisma.Sql[] = [Prisma.sql`COUNT(v.id) > 0`];
  if (q.minPrice) having.push(Prisma.sql`MIN(v.price_paise) >= ${BigInt(q.minPrice)}`);
  if (q.maxPrice) having.push(Prisma.sql`MIN(v.price_paise) <= ${BigInt(q.maxPrice)}`);
  if (q.inStock) having.push(Prisma.sql`SUM(GREATEST(COALESCE(i.on_hand_qty, 0) - COALESCE(i.reserved_qty, 0), 0)) > 0`);
  const order = {
    featured: Prisma.sql`p.featured DESC, p.published_at DESC, p.id DESC`,
    newest: Prisma.sql`p.published_at DESC, p.id DESC`,
    price_asc: Prisma.sql`min_price ASC, p.id ASC`,
    price_desc: Prisma.sql`min_price DESC, p.id DESC`,
  }[q.sort];
  const offset = decodeCursor<{o: number}>(q.cursor)?.o ?? 0;
  if (!Number.isInteger(offset) || offset < 0 || offset > 10_000) throw new AppError('VALIDATION_FAILED', 422, 'Invalid cursor.');
  const rows = await prisma.$queryRaw<{id: string}[]>`
    SELECT p.id, MIN(v.price_paise) AS min_price
    FROM products p
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN product_variants v ON v.product_id = p.id AND v.status = 'ACTIVE'
    LEFT JOIN inventory_items i ON i.variant_id = v.id
    WHERE ${Prisma.join(conditions, ' AND ')}
    GROUP BY p.id, p.featured, p.published_at
    HAVING ${Prisma.join(having, ' AND ')}
    ORDER BY ${order}
    LIMIT ${q.limit + 1} OFFSET ${offset}`;
  const page = rows.slice(0, q.limit).map((r) => r.id);
  const cards = await productCards(page);
  return {items: page.map((id) => cards.get(id)).filter(Boolean), nextCursor: rows.length > q.limit ? encodeCursor({o: offset + q.limit}) : null};
}

export async function productCards(ids: string[]) {
  const products = await prisma.product.findMany({
    where: {id: {in: ids}},
    include: {
      category: {select: {slug: true, title: true}},
      variants: {where: {status: 'ACTIVE'}, include: {inventory: true, certificates: {where: {verifiedStatus: 'VERIFIED'}, select: {id: true}}}},
      media: {where: {visibility: 'PUBLIC', authorized: true}, orderBy: {position: 'asc'}, take: 1},
    },
  });
  return new Map(products.map((p) => {
    const prices = p.variants.map((v) => v.pricePaise);
    const from = prices.length ? prices.reduce((a, b) => (b < a ? b : a)) : null;
    const available = p.variants.some((v) => v.inventory && v.inventory.onHandQty - v.inventory.reservedQty > 0);
    const badges = [
      ...(p.isDemo ? ['DEMO'] : []),
      ...(p.variants.some((v) => v.uniqueSpecimen) ? ['One of a kind'] : []),
      ...(p.variants.some((v) => v.certificates.length) ? ['Lab report'] : []),
      ...(p.productType === 'CUSTOM_REQUEST' ? ['Made to order'] : []),
    ];
    const m = p.media[0];
    return [p.id, {
      id: p.id, slug: p.slug, title: p.title, category: p.category.slug, categoryTitle: p.category.title, productType: p.productType, shortDescription: p.shortDescription,
      fromPricePaise: from?.toString() ?? null, compareAtPaise: p.variants.find((v) => v.pricePaise === from)?.compareAtPaise?.toString() ?? null,
      image: m ? {url: mediaUrl(m.objectKey), alt: m.altText, width: m.width, height: m.height} : null,
      available: p.productType === 'CUSTOM_REQUEST' ? true : available, isDemo: p.isDemo, badges,
    }] as const;
  }));
}

const FAMILY_SPEC = {RUDRAKSHA: 'rudraksha', CRYSTAL: 'crystal', YANTRA: 'yantra'} as const;

export async function productDetail(slug: string, storefrontId: string) {
  const p = await prisma.product.findUnique({
    where: {slug},
    include: {
      category: {include: {parent: {select: {slug: true, title: true}}}},
      variants: {where: {status: 'ACTIVE'}, orderBy: {pricePaise: 'asc'}, include: {inventory: true, gemstone: true, attributeValues: {include: {definition: true}}, certificates: {where: {verifiedStatus: 'VERIFIED'}}}},
      media: {where: {visibility: 'PUBLIC', authorized: true}, orderBy: {position: 'asc'}},
      attributeValues: {where: {variantId: null}, include: {definition: true}},
      rudraksha: true, crystal: true, yantra: true,
      reviews: {where: {status: 'APPROVED'}, orderBy: {createdAt: 'desc'}, take: 20, select: {id: true, rating: true, body: true, authorName: true, createdAt: true, orderLineId: true}},
    },
  });
  if (!p || p.status !== 'PUBLISHED' || p.category.storefrontId !== storefrontId) throw new AppError('NOT_FOUND', 404, 'Product not found.');
  const attr = (vals: typeof p.attributeValues) => Object.fromEntries(vals.map((a) => [a.definition.code, {label: a.definition.label, value: a.valueText ?? a.valueNumber?.toString() ?? null, unit: a.definition.unit}]));
  const kind = p.category.kind as keyof typeof FAMILY_SPEC;
  return {
    id: p.id, slug: p.slug, title: p.title, productType: p.productType, shortDescription: p.shortDescription, body: p.body,
    seo: {title: p.seoTitle ?? p.title, description: p.seoDescription ?? p.shortDescription},
    category: {slug: p.category.slug, title: p.category.title, kind: p.category.kind, parent: p.category.parent},
    isDemo: p.isDemo, returnEligible: p.returnEligible,
    attributes: attr(p.attributeValues),
    spec: FAMILY_SPEC[kind] ? (p as unknown as Record<string, unknown>)[FAMILY_SPEC[kind]] ?? null : null,
    media: p.media.map((m) => ({url: mediaUrl(m.objectKey), alt: m.altText, width: m.width, height: m.height, variantId: m.variantId})),
    variants: p.variants.map((v) => ({
      id: v.id, sku: v.sku, title: v.title, options: v.optionJson, pricePaise: v.pricePaise.toString(), compareAtPaise: v.compareAtPaise?.toString() ?? null,
      available: Boolean(v.inventory && v.inventory.onHandQty - v.inventory.reservedQty > 0), uniqueSpecimen: v.uniqueSpecimen, weightG: v.weightG,
      attributes: attr(v.attributeValues), gemstone: v.gemstone,
      certificates: v.certificates.map((c) => ({issuer: c.issuer, reportNo: c.reportNo, reportType: c.reportType, issuedOn: c.issuedOn, isDemo: c.isDemo})),
    })),
    reviews: p.reviews.map((r) => ({...r, verifiedPurchase: Boolean(r.orderLineId), orderLineId: undefined})),
  };
}

export async function availability(productId: string) {
  const variants = await prisma.productVariant.findMany({where: {productId, status: 'ACTIVE', product: {status: 'PUBLISHED'}}, include: {inventory: true}});
  if (!variants.length) throw new AppError('NOT_FOUND', 404, 'Product not found.');
  return variants.map((v) => {
    const free = v.inventory ? v.inventory.onHandQty - v.inventory.reservedQty : 0;
    return {variantId: v.id, available: free > 0, lowStock: free > 0 && free <= 2};
  });
}
