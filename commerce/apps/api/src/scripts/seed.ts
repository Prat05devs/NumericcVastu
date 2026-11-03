/**
 * Seed importer.
 *   pnpm db:seed                 → storefronts, the four families + made-to-order wristwatch, attribute definitions,
 *                                   the system CUSTOM-WATCH item. Idempotent; contains NO products, prices or policies.
 *   pnpm db:seed -- --demo       → adds clearly labelled DEMO fixtures (titles start with "DEMO", is_demo = true,
 *                                   placeholder images we generate ourselves). Refused when NODE_ENV=production.
 *   pnpm db:seed -- --remove-demo → deletes demo fixtures that no order references (others are archived).
 *   pnpm db:seed -- --import file.json → imports real products from a reviewed JSON file (see docs/runbooks/catalogue-import.md).
 */
import {mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {FAMILIES, VariantUpsert, ProductDraft} from '@sc/contracts';
import {z} from 'zod';
import {env} from '../config/env.js';
import {prisma} from '../lib/db.js';
import {ulid} from '../lib/ids.js';
import {normalize} from '../services/catalogue.js';
import {solidPng} from './png.js';

const args = new Set(process.argv.slice(2));

async function base() {
  await prisma.storefront.upsert({where: {id: 'crystal'}, update: {}, create: {id: 'crystal', name: 'NumericcVaastu Crystal', baseUrl: 'https://www.numericcvaastucrystal.in', allowedOrigins: ['https://www.numericcvaastucrystal.in', 'https://numericcvaastucrystal.in']}});
  await prisma.storefront.upsert({where: {id: 'numericcvaastu'}, update: {}, create: {id: 'numericcvaastu', name: 'NumericcVaastu (consultations & courses)', baseUrl: 'https://www.numericcvaastu.com', allowedOrigins: ['https://www.numericcvaastu.com', 'https://www.numericcvaastu.in', 'https://www.numericcvaastu.org']}});
  let order = 0;
  for (const fam of FAMILIES) {
    const cat = await prisma.category.upsert({where: {slug: fam.slug}, update: {title: fam.title, kind: fam.family}, create: {id: ulid(), slug: fam.slug, title: fam.title, kind: fam.family, sortOrder: order++, storefrontId: 'crystal'}});
    for (const a of fam.attributes) {
      const code = a.code;
      const def = await prisma.attributeDefinition.upsert({where: {code}, update: {label: a.label, type: a.type, unit: a.unit ?? null, filterable: a.filterable, required: a.required, categoryId: cat.id}, create: {id: ulid(), code, label: a.label, type: a.type, unit: a.unit ?? null, filterable: a.filterable, required: a.required, searchable: a.type === 'TEXT', categoryId: cat.id}});
      for (const [i, o] of (a.options ?? []).entries()) {
        await prisma.attributeOption.upsert({where: {definitionId_value: {definitionId: def.id, value: normalize(o)}}, update: {label: o, sortOrder: i}, create: {id: ulid(), definitionId: def.id, value: normalize(o), label: o, sortOrder: i}});
      }
    }
  }
  // System item used for accepted made-to-order quotations (never listed, no stock).
  const watchCat = await prisma.category.findUniqueOrThrow({where: {slug: 'custom-wristwatch'}});
  const sys = await prisma.product.upsert({where: {slug: 'system-custom-wristwatch'}, update: {}, create: {id: ulid(), categoryId: watchCat.id, slug: 'system-custom-wristwatch', title: 'Made-to-order numerology wristwatch', productType: 'CUSTOM_REQUEST', status: 'DRAFT', body: 'System item used to bill accepted quotations. Not listed.', returnEligible: false}});
  await prisma.productVariant.upsert({where: {sku: 'CUSTOM-WATCH'}, update: {}, create: {id: ulid(), productId: sys.id, sku: 'CUSTOM-WATCH', title: 'As quoted', optionJson: {}, pricePaise: 0n, weightG: 1}});
  console.log('Base taxonomy ready: storefronts, 4 families + made-to-order wristwatch, attribute definitions, CUSTOM-WATCH system item.');
}


type DemoItem = {family: 'rudraksha' | 'gemstone' | 'crystal' | 'yantra'; slug: string; title: string; short: string; attrs: Record<string, string | number>; variants: {sku: string; title: string; price: number; stock: number; unique?: boolean; attrs?: Record<string, string | number>}[]};
const DEMO: DemoItem[] = [
  {family: 'rudraksha', slug: 'demo-five-mukhi-rudraksha-bead', title: 'DEMO — Five Mukhi Rudraksha bead', short: 'Demonstration listing used to test the store. Not a real product.', attrs: {mukhi_count: 5, rudraksha_origin: 'Nepal', bead_type: 'Single bead', bead_diameter_mm: 18, certification_status: 'None'}, variants: [{sku: 'DEMO-RUD-5M-18', title: '18 mm bead', price: 1_500_00, stock: 12}]},
  {family: 'rudraksha', slug: 'demo-rudraksha-mala', title: 'DEMO — Rudraksha mala, 108 + 1', short: 'Demonstration listing used to test the store. Not a real product.', attrs: {mukhi_count: 5, rudraksha_origin: 'Java (Indonesia)', bead_type: 'Mala', bead_diameter_mm: 8, certification_status: 'None'}, variants: [{sku: 'DEMO-RUD-MALA-8', title: '8 mm beads', price: 2_100_00, stock: 5}]},
  {family: 'gemstone', slug: 'demo-blue-sapphire-specimen', title: 'DEMO — Blue sapphire specimen', short: 'Demonstration one-of-a-kind listing used to test last-item checkout. Not a real stone.', attrs: {}, variants: [{sku: 'DEMO-GEM-BS-001', title: 'Specimen 001', price: 45_000_00, stock: 1, unique: true, attrs: {gemstone_mineral: 'Corundum', variety: 'Blue sapphire', carat_weight: 3.12, shape: 'Oval', treatment: 'Heated', gemstone_origin: 'Sri Lanka'}}]},
  {family: 'crystal', slug: 'demo-amethyst-bracelet', title: 'DEMO — Amethyst bead bracelet', short: 'Demonstration listing used to test the store. Not a real product.', attrs: {crystal_mineral: 'Amethyst', product_form: 'Bracelet', bead_size_mm: 8, natural_status: 'Natural'}, variants: [{sku: 'DEMO-CRY-AME-8-S', title: 'Small wrist', price: 1_200_00, stock: 20}, {sku: 'DEMO-CRY-AME-8-M', title: 'Medium wrist', price: 1_200_00, stock: 15}]},
  {family: 'crystal', slug: 'demo-clear-quartz-tower', title: 'DEMO — Clear quartz tower', short: 'Demonstration listing used to test the store. Not a real product.', attrs: {crystal_mineral: 'Clear quartz', product_form: 'Tower', natural_status: 'Natural'}, variants: [{sku: 'DEMO-CRY-QTZ-TWR', title: 'About 10 cm', price: 2_400_00, stock: 4}]},
  {family: 'yantra', slug: 'demo-shree-yantra-copper', title: 'DEMO — Shree Yantra, copper plate', short: 'Demonstration listing used to test the store. Not a real product.', attrs: {yantra_name: 'Shree Yantra', material: 'Copper', width_mm: 150, height_mm: 150}, variants: [{sku: 'DEMO-YAN-SHREE-150', title: '150 × 150 mm', price: 1_800_00, stock: 8}]},
];
const COLORS: Record<DemoItem['family'], [[number, number, number], [number, number, number]]> = {rudraksha: [[120, 72, 40], [150, 98, 60]], gemstone: [[30, 60, 140], [50, 85, 170]], crystal: [[110, 70, 150], [135, 95, 175]], yantra: [[170, 100, 50], [195, 125, 70]]};
const SLUGS = {rudraksha: 'rudraksha', gemstone: 'gemstones', crystal: 'crystals', yantra: 'yantras'} as const;

async function demo() {
  if (env().NODE_ENV === 'production') throw new Error('Refusing to load demo fixtures in production.');
  await prisma.siteSetting.upsert({where: {key: 'catalogue'}, update: {valueJson: {allowDemoPublish: true, lowStockThreshold: 2}}, create: {key: 'catalogue', valueJson: {allowDemoPublish: true, lowStockThreshold: 2}}});
  const dir = resolve(env().STORAGE_LOCAL_DIR);
  for (const item of DEMO) {
    if (await prisma.product.findUnique({where: {slug: item.slug}})) continue;
    const cat = await prisma.category.findUniqueOrThrow({where: {slug: SLUGS[item.family]}});
    const id = ulid();
    await prisma.product.create({data: {id, categoryId: cat.id, slug: item.slug, title: item.title, shortDescription: item.short, body: `${item.short} This entry exists only so the shop, checkout and back office can be tested end to end. It will be removed before launch and replaced with real inventory, photos and certificates.`, status: 'PUBLISHED', publishedAt: new Date(), isDemo: true, returnEligible: false, taxGroup: null}});
    const defs = await prisma.attributeDefinition.findMany();
    const writeAttr = async (variantId: string | null, attrs: Record<string, string | number>) => {
      for (const [c, v] of Object.entries(attrs)) {
        const def = defs.find((d) => d.code === c);
        if (!def) throw new Error(`Unknown attribute ${c}`);
        const num = def.type === 'INT' || def.type === 'DECIMAL';
        await prisma.productAttributeValue.create({data: {id: ulid(), productId: id, variantId, definitionId: def.id, valueText: num ? null : String(v), valueNumber: num ? String(v) : null, normalizedValue: normalize(v)}});
      }
    };
    await writeAttr(null, item.attrs);
    if (item.family === 'rudraksha') await prisma.rudrakshaSpec.create({data: {productId: id, mukhiCount: Number(item.attrs['mukhi_count']), origin: String(item.attrs['rudraksha_origin']), beadType: String(item.attrs['bead_type']), sizeMm: String(item.attrs['bead_diameter_mm'])}});
    if (item.family === 'crystal') await prisma.crystalSpec.create({data: {productId: id, mineral: String(item.attrs['crystal_mineral']), form: String(item.attrs['product_form']), beadSizeMm: item.attrs['bead_size_mm'] ? String(item.attrs['bead_size_mm']) : null, baseMaterial: String(item.attrs['natural_status'])}});
    if (item.family === 'yantra') await prisma.yantraSpec.create({data: {productId: id, yantraType: String(item.attrs['yantra_name']), material: String(item.attrs['material']), dimensionsJson: {widthMm: item.attrs['width_mm'], heightMm: item.attrs['height_mm']}}});
    for (const v of item.variants) {
      const vid = ulid();
      await prisma.productVariant.create({data: {id: vid, productId: id, sku: v.sku, title: v.title, optionJson: {size: v.title}, pricePaise: BigInt(v.price), weightG: 100, uniqueSpecimen: v.unique ?? false}});
      await prisma.inventoryItem.create({data: {variantId: vid, onHandQty: v.stock}});
      await prisma.inventoryMovement.create({data: {id: ulid(), variantId: vid, kind: 'RECEIPT', qtyDelta: v.stock, referenceType: 'demo-seed', note: 'DEMO fixture stock'}});
      if (v.attrs) {
        await writeAttr(vid, v.attrs);
        await prisma.gemstoneSpec.create({data: {variantId: vid, mineral: String(v.attrs['gemstone_mineral']), variety: String(v.attrs['variety']), caratDecimal: String(v.attrs['carat_weight']), cut: String(v.attrs['shape']), treatment: String(v.attrs['treatment']), origin: String(v.attrs['gemstone_origin'])}});
      }
    }
    const key = `products/${id}/${ulid()}.png`;
    await mkdir(join(dir, 'products', id), {recursive: true});
    const [c1, c2] = COLORS[item.family];
    await writeFile(join(dir, key), solidPng(800, 800, c1, c2));
    await prisma.productMedia.create({data: {id: ulid(), productId: id, objectKey: key, altText: `Demo placeholder image for ${item.title.replace('DEMO — ', '')} (not a product photo)`, width: 800, height: 800, authorized: true}});
  }
  console.log(`Demo fixtures ready (${DEMO.length} DEMO-labelled products). Remove them with: pnpm db:seed -- --remove-demo`);
}

async function removeDemo() {
  const products = await prisma.product.findMany({where: {isDemo: true}, include: {variants: {select: {id: true}}}});
  let removed = 0, archived = 0;
  for (const p of products) {
    const ids = p.variants.map((v) => v.id);
    const referenced = await prisma.orderLine.count({where: {variantId: {in: ids}}});
    if (referenced) { await prisma.product.update({where: {id: p.id}, data: {status: 'ARCHIVED'}}); archived++; continue; }
    await prisma.$transaction([
      prisma.cartItem.deleteMany({where: {variantId: {in: ids}}}),
      prisma.certificate.deleteMany({where: {productVariantId: {in: ids}}}),
      prisma.inventoryReservation.deleteMany({where: {variantId: {in: ids}}}),
      prisma.inventoryMovement.deleteMany({where: {variantId: {in: ids}}}),
      prisma.inventoryItem.deleteMany({where: {variantId: {in: ids}}}),
      prisma.productAttributeValue.deleteMany({where: {productId: p.id}}),
      prisma.productMedia.deleteMany({where: {productId: p.id}}),
      prisma.gemstoneSpec.deleteMany({where: {variantId: {in: ids}}}),
      prisma.productVariant.deleteMany({where: {productId: p.id}}),
      prisma.product.delete({where: {id: p.id}}),
    ]);
    // Generated placeholder images live in local storage only (never in a real bucket).
    if (env().STORAGE_DRIVER === 'local') await rm(join(resolve(env().STORAGE_LOCAL_DIR), 'products', p.id), {recursive: true, force: true});
    removed++;
  }
  console.log(`Demo fixtures removed: ${removed}; archived (referenced by orders): ${archived}.`);
}

/** Real catalogue import from a reviewed JSON file: products are created as DRAFT and must pass the publish gate. */
const ImportFile = z.object({products: z.array(ProductDraft.omit({categoryId: true, isDemo: true}).extend({category: z.string(), variants: z.array(VariantUpsert.omit({id: true}).extend({openingStock: z.number().int().min(0)})).min(1)}))});
async function importFile(path: string, dryRun: boolean) {
  const data = ImportFile.parse(JSON.parse(await readFile(path, 'utf8')));
  const problems: string[] = [];
  for (const p of data.products) {
    if (!(await prisma.category.findUnique({where: {slug: p.category}}))) problems.push(`${p.slug}: unknown category ${p.category}`);
    if (await prisma.product.findUnique({where: {slug: p.slug}})) problems.push(`${p.slug}: slug already exists`);
    for (const v of p.variants) if (await prisma.productVariant.findUnique({where: {sku: v.sku}})) problems.push(`${p.slug}: SKU ${v.sku} exists`);
  }
  console.log(`${data.products.length} products, ${data.products.reduce((s, p) => s + p.variants.length, 0)} variants; ${problems.length} problems.`);
  problems.forEach((p) => console.log(`  - ${p}`));
  if (dryRun || problems.length) return;
  for (const p of data.products) {
    const cat = await prisma.category.findUniqueOrThrow({where: {slug: p.category}});
    const id = ulid();
    await prisma.product.create({data: {id, categoryId: cat.id, slug: p.slug, title: p.title, productType: p.productType, shortDescription: p.shortDescription, body: p.body, seoTitle: p.seoTitle ?? null, seoDescription: p.seoDescription ?? null, taxGroup: p.taxGroup ?? null, returnEligible: p.returnEligible ?? null}});
    for (const v of p.variants) {
      const vid = ulid();
      await prisma.productVariant.create({data: {id: vid, productId: id, sku: v.sku, title: v.title, optionJson: v.options, pricePaise: BigInt(v.pricePaise), compareAtPaise: v.compareAtPaise ? BigInt(v.compareAtPaise) : null, weightG: v.weightGrams, uniqueSpecimen: v.uniqueSpecimen}});
      await prisma.inventoryItem.create({data: {variantId: vid, onHandQty: v.openingStock}});
      if (v.openingStock) await prisma.inventoryMovement.create({data: {id: ulid(), variantId: vid, kind: 'RECEIPT', qtyDelta: v.openingStock, referenceType: 'import', note: `Opening stock from ${path}`}});
    }
  }
  console.log('Imported as DRAFT. Add photos, attributes and certificates, then publish from the back office.');
}

async function main() {
  if (args.has('--remove-demo')) await removeDemo();
  else {
    await base();
    if (args.has('--demo')) await demo();
    const i = process.argv.indexOf('--import');
    if (i > 0 && process.argv[i + 1]) await importFile(process.argv[i + 1]!, args.has('--dry-run'));
  }
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
