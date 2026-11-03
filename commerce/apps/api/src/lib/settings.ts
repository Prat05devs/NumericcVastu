import {z} from 'zod';
import {AffiliateSettings, InternationalSettings, ShippingSettings, TaxSettings} from '@sc/contracts';
import {prisma, type Tx} from './db.js';
import {toPlain} from './http.js';

/**
 * Back-office configuration lives in site_settings (key → JSON). Nothing commercial is assumed: tax, shipping,
 * returns and invoice details stay "not configured" until a person enters and reviews them.
 */
export const ReturnsSettings = z.object({enabled: z.boolean(), windowDays: z.number().int().min(1).max(90), policyPageSlug: z.string().max(160), reviewedBy: z.string().trim().min(1).max(120)});
export const InvoiceSettings = z.object({sellerLegalName: z.string().trim().min(2).max(200), gstin: z.string().regex(/^[0-9]{2}[A-Z0-9]{13}$/).nullable(), address: z.string().trim().min(10).max(500), invoicePrefix: z.string().regex(/^[A-Z0-9-]{2,12}$/)});
export const ConsultationSettings = z.object({topics: z.array(z.object({id: z.enum(['NUMEROLOGY', 'VASTU', 'PRODUCT_GUIDANCE', 'OTHER']), label: z.string().max(80), description: z.string().max(300)})).max(10), note: z.string().max(500)});
export const CatalogueSettings = z.object({allowDemoPublish: z.boolean(), lowStockThreshold: z.number().int().min(0).max(1000)});
export const PaymentModeSetting = z.object({mode: z.enum(['mock', 'test', 'live']), changedBy: z.string().nullable(), changedAt: z.string().nullable()});
export const AiSettings = z.record(z.string(), z.object({model: z.string().max(120).nullable(), enabled: z.boolean()}));
export const NavigationSettings = z.object({highlights: z.array(z.object({label: z.string().max(60), href: z.string().max(200)})).max(8)});

export const SETTINGS = {
  tax: TaxSettings,
  shipping: ShippingSettings,
  returns: ReturnsSettings,
  invoice: InvoiceSettings,
  consultation: ConsultationSettings,
  catalogue: CatalogueSettings,
  'payments.mode': PaymentModeSetting,
  ai: AiSettings,
  navigation: NavigationSettings,
  affiliates: AffiliateSettings,
  international: InternationalSettings,
} as const;
export type SettingKey = keyof typeof SETTINGS;
export type SettingValue<K extends SettingKey> = z.infer<(typeof SETTINGS)[K]>;

const DEFAULTS: {[K in SettingKey]?: SettingValue<K>} = {
  catalogue: {allowDemoPublish: false, lowStockThreshold: 2},
  'payments.mode': {mode: 'mock', changedBy: null, changedAt: null},
  ai: {},
  navigation: {highlights: []},
};

export async function getSetting<K extends SettingKey>(key: K, db: Tx | typeof prisma = prisma): Promise<SettingValue<K> | null> {
  const row = await db.siteSetting.findUnique({where: {key}});
  if (!row) return (DEFAULTS[key] as SettingValue<K> | undefined) ?? null;
  const parsed = SETTINGS[key].safeParse(row.valueJson);
  return parsed.success ? (parsed.data as SettingValue<K>) : null;
}

export async function putSetting<K extends SettingKey>(key: K, value: SettingValue<K>, actorId: string | null, db: Tx | typeof prisma = prisma) {
  const valueJson = toPlain(SETTINGS[key].parse(value)) as object;
  await db.siteSetting.upsert({where: {key}, create: {key, valueJson, updatedBy: actorId}, update: {valueJson, updatedBy: actorId}});
}

/** Shape the pricing engine needs, with paise as bigint. */
export async function shippingMethods(db: Tx | typeof prisma = prisma) {
  const s = await getSetting('shipping', db);
  return {
    holdMinutes: s?.holdMinutes ?? 15,
    configured: Boolean(s && s.methods.some((m) => m.active)),
    methods: (s?.methods ?? []).filter((m) => m.active).map((m) => ({id: m.id, label: m.label, feePaise: BigInt(m.feePaise), freeAbovePaise: m.freeAbovePaise === null ? null : BigInt(m.freeAbovePaise), etaText: m.etaText ?? null})),
  };
}
