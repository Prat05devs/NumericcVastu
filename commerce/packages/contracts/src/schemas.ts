import {z} from 'zod';
import {STAFF_ROLES} from './access.js';

/** Wire conventions: ids are ULIDs (26 chars), money is decimal paise strings, times are ISO-8601 UTC. */
export const Id = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, 'Invalid id');
export const PaiseString = z.string().regex(/^\d{1,15}$/, 'Amount in paise as a decimal string');
export const Slug = z.string().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const Sku = z.string().min(2).max(64).regex(/^[A-Z0-9][A-Z0-9-]*$/, 'Upper-case letters, digits and dashes');
export const IsoDate = z.string().datetime();
const trimmed = (max: number) => z.string().trim().min(1).max(max);

/**
 * PATCH schema from a create schema: every field optional and NO defaults. (Zod's .partial() keeps defaults, which would
 * silently reset fields the client did not send — e.g. wipe a collection's products or unpublish an article.)
 */
export function patchOf<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  const shape = Object.fromEntries(Object.entries(schema.shape).map(([k, v]) => [k, (v instanceof z.ZodDefault ? v.unwrap() : v) as z.ZodType]));
  return z.object(shape).partial() as unknown as z.ZodObject<{[K in keyof T]: z.ZodOptional<T[K] extends z.ZodDefault<infer I> ? I : T[K]>}>;
}

export const ERROR_CODES = [
  'VALIDATION_FAILED', 'UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'INSUFFICIENT_STOCK', 'PRICE_CHANGED',
  'IDEMPOTENCY_KEY_REUSED', 'IDEMPOTENCY_IN_PROGRESS', 'ILLEGAL_TRANSITION', 'RATE_LIMITED', 'MFA_REQUIRED', 'INVALID_OTP',
  'PAYMENT_PROVIDER_UNAVAILABLE', 'PAYMENT_NOT_CONFIGURED', 'LIVE_PAYMENTS_LOCKED', 'PUBLISH_BLOCKED', 'COUPON_INVALID',
  'STALE_VERSION', 'INTERNAL', 'SERVICE_UNAVAILABLE', 'CSRF',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
export const ErrorEnvelope = z.object({error: z.object({code: z.enum(ERROR_CODES), message: z.string(), details: z.unknown().optional()}), meta: z.object({requestId: z.string()})});
export const Meta = z.object({requestId: z.string(), serverTime: IsoDate.optional(), nextCursor: z.string().nullable().optional()});

// ---------- Auth
export const OtpRequest = z.object({email: z.string().trim().toLowerCase().email().max(254)});
export const OtpVerify = z.object({email: z.string().trim().toLowerCase().email().max(254), code: z.string().regex(/^\d{6}$/)});
export const StaffLogin = z.object({email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200), totp: z.string().regex(/^\d{6}$/).optional()});
export const ProfilePatch = z.object({name: trimmed(120).optional(), phone: z.string().regex(/^[6-9]\d{9}$/).optional()});
export const IndianAddress = z.object({
  label: z.string().trim().max(40).optional(),
  fullName: trimmed(120),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'A 10-digit Indian mobile number'),
  line1: trimmed(200), line2: z.string().trim().max(200).optional(), locality: z.string().trim().max(120).optional(),
  city: trimmed(80), state: trimmed(80), postalCode: z.string().regex(/^[1-9]\d{5}$/, 'A 6-digit PIN code'), country: z.literal('IN').default('IN'),
});
export type IndianAddress = z.infer<typeof IndianAddress>;

// ---------- Catalogue
export const ProductListQuery = z.object({
  category: Slug.optional(), collection: Slug.optional(), q: z.string().trim().max(100).optional(),
  sort: z.enum(['featured', 'newest', 'price_asc', 'price_desc']).default('featured'),
  minPrice: PaiseString.optional(), maxPrice: PaiseString.optional(), inStock: z.coerce.boolean().optional(),
  cursor: z.string().max(200).optional(), limit: z.coerce.number().int().min(1).max(50).default(24),
}).catchall(z.string().max(100)); // allowlisted attribute filters (attr_<code>) are validated against definitions in the API

export const MoneyOut = PaiseString;
export const VariantOut = z.object({id: Id, sku: z.string(), title: z.string(), options: z.record(z.string(), z.string()), pricePaise: MoneyOut, compareAtPaise: MoneyOut.nullable(), available: z.boolean(), uniqueSpecimen: z.boolean(), attributes: z.record(z.string(), z.unknown())});
export const ProductCard = z.object({id: Id, slug: z.string(), title: z.string(), category: z.string(), productType: z.enum(['PRODUCT', 'CUSTOM_REQUEST']), fromPricePaise: MoneyOut.nullable(), image: z.object({url: z.string(), alt: z.string()}).nullable(), available: z.boolean(), isDemo: z.boolean(), badges: z.array(z.string())});

// ---------- Cart & checkout
export const CartItemPut = z.object({qty: z.number().int().min(1).max(10)});
export const CheckoutPreview = z.object({cartId: Id, couponCode: z.string().trim().max(40).optional(), shippingMethodId: z.string().max(40).optional(), ref: z.string().max(120).optional(), postalCode: z.string().regex(/^[1-9]\d{5}$/).optional()});
export const CheckoutCreate = z.object({
  cartId: Id, email: z.string().trim().toLowerCase().email().max(254), shippingAddress: IndianAddress, billingAddress: IndianAddress.optional(),
  couponCode: z.string().trim().max(40).optional(), shippingMethodId: z.string().max(40), ref: z.string().max(120).optional(),
  acceptTerms: z.literal(true), marketingConsent: z.boolean().default(false),
  expectedTotalPaise: PaiseString.optional(),
});
export const PriceBreakdown = z.object({subtotalPaise: MoneyOut, discountPaise: MoneyOut, shippingPaise: MoneyOut, taxPaise: MoneyOut, totalPaise: MoneyOut, taxMode: z.string(), notices: z.array(z.string()), warnings: z.array(z.string())});

// ---------- Orders & returns
export const CancelOrder = z.object({reason: z.string().trim().max(500).optional()});
export const ReturnRequest = z.object({reason: trimmed(1000), lineIds: z.array(Id).min(1)});

// ---------- Custom requests (made-to-order wristwatch) & consultation
export const CustomRequestCreate = z.object({
  requestType: z.literal('WRISTWATCH'), name: trimmed(120), email: z.string().trim().toLowerCase().email(), phone: z.string().regex(/^[6-9]\d{9}$/),
  preferredStyle: trimmed(200), budgetBand: z.enum(['UNDER_10K', '10K_25K', '25K_50K', '50K_1L', 'ABOVE_1L', 'UNSURE']),
  requirements: trimmed(2000), dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  consentVersion: z.string().max(20), consent: z.literal(true),
});
export const ConsultationEnquiry = z.object({topic: z.enum(['NUMEROLOGY', 'VASTU', 'PRODUCT_GUIDANCE', 'OTHER']), name: trimmed(120), email: z.string().trim().toLowerCase().email(), phone: z.string().regex(/^[6-9]\d{9}$/).optional(), message: trimmed(2000), consentVersion: z.string().max(20), consent: z.literal(true)});

// ---------- Admin
export const ProductDraft = z.object({
  categoryId: Id, title: trimmed(200), slug: Slug, productType: z.enum(['PRODUCT', 'CUSTOM_REQUEST']).default('PRODUCT'),
  shortDescription: z.string().trim().max(500).default(''), body: z.string().max(20_000).default(''),
  seoTitle: z.string().trim().max(70).optional(), seoDescription: z.string().trim().max(170).optional(),
  taxGroup: z.string().max(40).nullable().optional(), shippingProfile: z.string().max(40).nullable().optional(), returnEligible: z.boolean().optional(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  isDemo: z.boolean().default(false),
});
export const ProductPatch = patchOf(ProductDraft).omit({isDemo: true, productType: true}).extend({version: z.number().int().min(0)});
export const VariantUpsert = z.object({
  id: Id.optional(), sku: Sku, title: trimmed(200), options: z.record(z.string(), z.string()).default({}), pricePaise: PaiseString, compareAtPaise: PaiseString.nullable().optional(),
  weightGrams: z.number().int().min(1).max(50_000), uniqueSpecimen: z.boolean().default(false), attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
});
export const InventoryAdjust = z.object({delta: z.number().int().min(-10_000).max(10_000).refine((v) => v !== 0), reason: z.enum(['RECEIPT', 'ADJUSTMENT', 'DAMAGE', 'CORRECTION', 'RETURN_RESTOCK']), note: z.string().max(500).optional(), expectedVersion: z.number().int().min(0)});
/** Ship an order. provider "manual": staff enter courier + tracking number. An integrated provider can book the
 * shipment itself (then trackingNo may be omitted and comes back from the courier). */
export const FulfillOrder = z.object({provider: z.string().regex(/^[a-z0-9-]{2,40}$/).default('manual'), courier: trimmed(80), service: z.string().max(80).optional(), trackingNo: trimmed(80).optional(), shippingCostPaise: PaiseString.optional(), expectedBy: IsoDate.optional()});
export const RefundCreate = z.object({amountPaise: PaiseString, reason: trimmed(500)});
export const QuoteCreate = z.object({items: z.array(z.object({description: trimmed(300), qty: z.number().int().min(1).max(100), unitPaise: PaiseString, taxPaise: PaiseString.default('0')})).min(1), validDays: z.number().int().min(1).max(60), terms: trimmed(4000)});
export const RequestStatusPatch = z.object({status: z.enum(['REVIEWING', 'DECLINED', 'CANCELLED', 'IN_PROGRESS', 'COMPLETED', 'REFUND_REVIEW']), note: z.string().max(1000).optional()});
export const CertificateCreate = z.object({variantId: Id, issuer: trimmed(160), reportNo: trimmed(80), reportType: trimmed(80), issuedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), objectKey: z.string().max(400).optional(), disclosure: z.record(z.string(), z.string()).default({}), evidenceNote: trimmed(500)});
export const CmsPagePatch = z.object({title: trimmed(200).optional(), bodyBlocks: z.array(z.object({type: z.enum(['heading', 'paragraph', 'list', 'faq', 'callout']), text: z.string().max(5000), items: z.array(z.string().max(1000)).optional()})).optional(), seoTitle: z.string().max(70).optional(), seoDescription: z.string().max(170).optional(), status: z.enum(['DRAFT', 'PUBLISHED']).optional(), legalApprovedBy: z.string().trim().min(2).max(120).optional(), version: z.number().int().min(0)});
export const DiscountRuleIn = z.object({type: z.enum(['NONE', 'PERCENT', 'FIXED']), percentBp: z.number().int().min(1).max(10_000).optional(), amountPaise: PaiseString.optional(), maxDiscountPaise: PaiseString.optional(), minOrderPaise: PaiseString.optional(), appliesTo: z.object({families: z.array(z.string()).default([]), productIds: z.array(Id).default([])}).default({families: [], productIds: []})});
export const CouponUpsert = z.object({code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/), description: z.string().max(255).default(''), rule: DiscountRuleIn, storefronts: z.array(z.string()).default([]), startsAt: IsoDate.nullable().optional(), endsAt: IsoDate.nullable().optional(), limitTotal: z.number().int().positive().nullable().optional(), limitPerCustomer: z.number().int().positive().nullable().optional(), combinable: z.boolean().default(false), active: z.boolean().default(true)});
export const CampaignUpsert = z.object({name: trimmed(190), slug: Slug, storefronts: z.array(z.string()).default([]), startsAt: IsoDate, endsAt: IsoDate, priority: z.number().int().default(0), rule: DiscountRuleIn, theme: z.object({badge: z.string().max(30).optional(), bannerText: z.string().max(140).optional(), bannerLink: z.string().max(200).optional(), decoration: z.string().max(30).optional(), colors: z.record(z.string(), z.string().regex(/^#[0-9a-fA-F]{6}$/)).optional(), showCountdown: z.boolean().optional()}).default({}), active: z.boolean().default(true)});
export const AffiliateUpsert = z.object({name: trimmed(190), email: z.string().email().nullable().optional(), phone: z.string().max(40).nullable().optional(), platform: z.string().max(80).nullable().optional(), handle: z.string().max(120).nullable().optional(), commission: z.object({type: z.enum(['NONE', 'PERCENT', 'FIXED']), percentBp: z.number().int().min(1).max(10_000).optional(), amountPaise: PaiseString.optional()}), notes: z.string().max(4000).default(''), active: z.boolean().default(true), attributionDays: z.number().int().min(1).max(90).default(30), canCreateLinks: z.boolean().default(true)});
export const AffiliateLinkCreate = z.object({storefront: z.string().max(40), targetPath: z.string().startsWith('/').max(255).refine((p) => !p.startsWith('//')), couponId: Id.nullable().optional(), label: z.string().max(120).default('')});
export const StaffCreate = z.object({email: z.string().trim().toLowerCase().email(), name: trimmed(120), role: z.enum(STAFF_ROLES), temporaryPassword: z.string().min(12).max(200)});
/** Provider credentials. Razorpay: key id/secret + webhook secret. PayPal: client id/secret + webhook id. Stored encrypted. */
export const PaymentKeysPatch = z.object({
  provider: z.enum(['razorpay', 'paypal']), environment: z.enum(['test', 'live']),
  keyId: z.string().trim().max(80).optional(), keySecret: z.string().trim().max(200).optional(), webhookSecret: z.string().trim().max(200).optional(),
  clientId: z.string().trim().max(200).optional(), clientSecret: z.string().trim().max(200).optional(), webhookId: z.string().trim().max(80).optional(),
});
export const PaymentIntentCreate = z.object({provider: z.enum(['razorpay', 'paypal']).optional()});
/** Charging overseas buyers (PayPal, USD). The rate is entered and reviewed by a person; never fetched or assumed. */
export const InternationalSettings = z.object({currency: z.literal('USD'), inrPerUnit: z.string().regex(/^\d{1,4}(\.\d{1,4})?$/, 'Rupees per 1 USD, e.g. 84.25'), reviewedBy: trimmed(120), reviewedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)});
export const DeliveryFeedbackCreate = z.object({rating: z.number().int().min(1).max(5), onTime: z.boolean().optional(), packagingOk: z.boolean().optional(), comment: z.string().trim().max(1000).optional()});
export const TrackLookup = z.object({orderCode: z.string().trim().toUpperCase().regex(/^NVC-[2-9A-HJ-NP-Z]{8}$/, 'Order number looks like NVC-XXXXXXXX'), email: z.string().trim().toLowerCase().email()});
export const PaymentModePatch = z.object({mode: z.enum(['mock', 'test', 'live']), confirmLive: z.boolean().optional()});
export const AiKeyPatch = z.object({provider: z.enum(['openai', 'anthropic', 'google', 'deepseek', 'moonshot']), apiKey: z.string().trim().max(400).optional(), model: z.string().trim().max(120).optional(), enabled: z.boolean().optional(), removeKey: z.boolean().optional()});
export const TaxSettings = z.object({mode: z.enum(['INCLUSIVE', 'EXCLUSIVE']), groups: z.record(z.string().regex(/^[A-Z0-9_]{2,40}$/), z.number().int().min(0).max(10_000)), shippingGroup: z.string().nullable(), reviewedBy: trimmed(120), reviewedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)});
export const ShippingSettings = z.object({methods: z.array(z.object({id: z.string().regex(/^[a-z0-9-]{2,40}$/), label: trimmed(80), feePaise: PaiseString, freeAbovePaise: PaiseString.nullable(), etaText: z.string().max(80).optional(), active: z.boolean().default(true)})).max(10), holdMinutes: z.number().int().min(5).max(120),
  /** Couriers staff can choose when shipping manually, with their public tracking page ({tracking} is replaced). */
  couriers: z.array(z.object({id: z.string().regex(/^[a-z0-9-]{2,40}$/), name: trimmed(80), trackingUrlTemplate: z.string().url().refine((u) => u.includes('{tracking}'), 'Must contain {tracking}').optional()})).max(20).default([])});

// ---------- Partner (affiliate / influencer) programme
export const AffiliateSettings = z.object({
  holdDays: z.number().int().min(0).max(120), // commissions stay PENDING this long after delivery (cover the return window)
  minPayoutPaise: PaiseString,
  tdsRateBp: z.number().int().min(0).max(10_000).nullable(), // null = not configured; set only after tax advice
  tdsThresholdPaise: PaiseString.nullable(),
  termsVersion: z.string().trim().min(1).max(20),
  termsPageSlug: z.string().max(160),
  reviewedBy: trimmed(120),
});
export const PartnerLinkCreate = z.object({targetPath: z.string().startsWith('/').max(255).refine((p) => !p.startsWith('//') && !p.includes('\\')), label: z.string().trim().max(120).default('')});
export const PartnerTermsAccept = z.object({termsVersion: z.string().max(20), accept: z.literal(true)});
export const PayoutDetails = z.discriminatedUnion('method', [
  z.object({method: z.literal('UPI'), accountName: trimmed(120), upiId: z.string().trim().regex(/^[a-zA-Z0-9._-]{2,64}@[a-zA-Z]{2,32}$/), pan: z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/).optional()}),
  z.object({method: z.literal('BANK'), accountName: trimmed(120), accountNumber: z.string().regex(/^\d{9,18}$/), ifsc: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/), pan: z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/).optional()}),
]);
export const CommissionDecision = z.object({action: z.enum(['approve', 'reject']), note: trimmed(500)});
export const PayoutCreate = z.object({affiliateId: Id});
export const PayoutMarkPaid = z.object({method: z.enum(['UPI', 'BANK', 'OTHER']), reference: trimmed(120)});
export const AffiliateStatusPatch = z.object({status: z.enum(['ACTIVE', 'SUSPENDED']), note: trimmed(500)});
