import {AppError} from '../../lib/errors.js';
import {getSetting} from '../../lib/settings.js';
import type {Charge, Environment, Headers, ParsedEvent, PaymentProvider, ProviderModule, ProviderPayment} from './types.js';
import {mask, readSecrets} from './vault.js';

/**
 * PayPal (overseas buyers, USD) — Orders v2 API with server-side capture.
 * Note: PayPal no longer processes domestic Indian (INR) payments, so INR order totals are charged in USD using the
 * exchange rate entered and reviewed in Settings → International. The rate used is stored on every payment.
 *
 * Setup at developer.paypal.com (Sandbox first, then Live after the business account is approved):
 *  1. Apps & Credentials → create a REST app → copy Client ID and Secret → back office: Settings → Payments → PayPal.
 *  2. In the app → Webhooks → add https://<api-domain>/api/v1/webhooks/payments/paypal with events
 *     CHECKOUT.ORDER.APPROVED, PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.DENIED, PAYMENT.CAPTURE.PENDING,
 *     PAYMENT.CAPTURE.REFUNDED → copy the Webhook ID into the back office (PayPal verifies signatures with it).
 *  3. Flow: we create the PayPal order → buyer approves in PayPal's popup → the browser tells us "approved" → the
 *     API captures server-to-server (never trusting the browser) → the PAYMENT.CAPTURE.COMPLETED webhook confirms.
 */
const FIELDS = ['client_id', 'client_secret', 'webhook_id'] as const;
const base = (environment: 'test' | 'live') => process.env['PAYPAL_API_BASE'] ?? (environment === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');
const keys = async (environment: 'test' | 'live') => {
  const s = await readSecrets('paypal', environment, FIELDS);
  return {clientId: s['client_id'] ?? null, clientSecret: s['client_secret'] ?? null, webhookId: s['webhook_id'] ?? null};
};
const tokens = new Map<string, {token: string; until: number}>();
const toValue = (minor: bigint) => `${minor / 100n}.${(minor % 100n).toString().padStart(2, '0')}`;
const toMinor = (value: string) => { const [a = '0', b = ''] = value.split('.'); return BigInt(a) * 100n + BigInt((b + '00').slice(0, 2)); };

class PayPalApi {
  constructor(readonly environment: 'test' | 'live', readonly clientId: string, private readonly secret: string) {}
  private async token(): Promise<string> {
    const cached = tokens.get(this.clientId);
    if (cached && cached.until > Date.now()) return cached.token;
    const res = await fetch(`${base(this.environment)}/v1/oauth2/token`, {method: 'POST', signal: AbortSignal.timeout(10_000), headers: {Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded'}, body: 'grant_type=client_credentials'}).catch(() => null);
    if (!res || res.status >= 500) throw new AppError('PAYMENT_PROVIDER_UNAVAILABLE', 503, 'PayPal is unavailable. Your order is saved; please try again.');
    if (!res.ok) throw new AppError('PAYMENT_NOT_CONFIGURED', 409, 'PayPal rejected the configured credentials.');
    const json = (await res.json()) as {access_token: string; expires_in: number};
    tokens.set(this.clientId, {token: json.access_token, until: Date.now() + (json.expires_in - 60) * 1000});
    return json.access_token;
  }
  async call<T>(method: string, path: string, body?: unknown, requestId?: string): Promise<T> {
    const res = await fetch(`${base(this.environment)}${path}`, {
      method, signal: AbortSignal.timeout(15_000),
      headers: {Authorization: `Bearer ${await this.token()}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(requestId && {'PayPal-Request-Id': requestId})},
      ...(body !== undefined && {body: JSON.stringify(body)}),
    }).catch(() => null);
    if (!res || res.status >= 500) throw new AppError('PAYMENT_PROVIDER_UNAVAILABLE', 503, 'PayPal is unavailable. Your order is saved; please try again.');
    const json = (await res.json().catch(() => ({}))) as T & {name?: string; message?: string; details?: {issue?: string}[]};
    if (!res.ok) {
      const issue = json.details?.[0]?.issue ?? json.name ?? String(res.status);
      throw new AppError('CONFLICT', 409, `PayPal rejected the request: ${issue}`, {issue});
    }
    return json;
  }
}

type PpOrder = {id: string; status: string; purchase_units?: {payments?: {captures?: {id: string; status: string; amount: {value: string; currency_code: string}}[]}}[]};
const CAPTURE_STATUS: Record<string, ProviderPayment['status']> = {COMPLETED: 'captured', PENDING: 'created', DECLINED: 'failed', FAILED: 'failed', REFUNDED: 'refunded', PARTIALLY_REFUNDED: 'captured'};
function paymentsOf(o: PpOrder, charge?: Charge): ProviderPayment[] {
  const captures = (o.purchase_units ?? []).flatMap((u) => u.payments?.captures ?? []);
  if (captures.length) return captures.map((c) => ({providerPaymentId: c.id, status: CAPTURE_STATUS[c.status] ?? 'created', amountMinor: toMinor(c.amount.value), currency: c.amount.currency_code}));
  // Approved by the buyer but not captured yet → "authorized" so reconciliation captures it.
  if (o.status === 'APPROVED') return [{providerPaymentId: `approval:${o.id}`, status: 'authorized', amountMinor: charge?.amountMinor ?? 0n, currency: charge?.currency ?? 'USD'}];
  return [];
}

export class PayPalProvider implements PaymentProvider {
  readonly name = 'paypal' as const;
  constructor(private readonly api: PayPalApi) {}
  get environment() { return this.api.environment; }
  async createOrder(input: {charge: Charge; receipt: string; orderId: string; publicCode: string}) {
    const o = await this.api.call<{id: string}>('POST', '/v2/checkout/orders', {
      intent: 'CAPTURE',
      purchase_units: [{reference_id: input.orderId, custom_id: input.orderId, invoice_id: `${input.publicCode}-${input.receipt.slice(-6)}`, description: `Order ${input.publicCode}`, amount: {currency_code: input.charge.currency, value: toValue(input.charge.amountMinor)}}],
      payment_source: {paypal: {experience_context: {shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW', brand_name: 'NumericcVaastu'}}},
    }, `create-${input.receipt}`);
    return {providerOrderId: o.id};
  }
  checkoutParams(input: {providerOrderId: string; charge: Charge}) {
    return {provider: 'paypal', clientId: this.api.clientId, orderId: input.providerOrderId, amount: toValue(input.charge.amountMinor), currency: input.charge.currency, exchangeRate: input.charge.exchangeRate};
  }
  async fetchPayments(providerOrderId: string) {
    return paymentsOf(await this.api.call<PpOrder>('GET', `/v2/checkout/orders/${encodeURIComponent(providerOrderId)}`));
  }
  async capture(providerOrderId: string, _id: string | undefined, charge: Charge) {
    try {
      return paymentsOf(await this.api.call<PpOrder>('POST', `/v2/checkout/orders/${encodeURIComponent(providerOrderId)}/capture`, {}, `capture-${providerOrderId}`), charge);
    } catch (e) {
      if (e instanceof AppError && (e.details as {issue?: string})?.issue === 'ORDER_ALREADY_CAPTURED') return this.fetchPayments(providerOrderId);
      throw e;
    }
  }
  async refund(input: {providerPaymentId: string; amountMinor: bigint; currency: string; receipt: string}) {
    const r = await this.api.call<{id: string; status: string}>('POST', `/v2/payments/captures/${encodeURIComponent(input.providerPaymentId)}/refund`, {amount: {value: toValue(input.amountMinor), currency_code: input.currency}, note_to_payer: 'Refund from NumericcVaastu'}, `refund-${input.receipt}`);
    return {providerRefundId: r.id, status: r.status === 'COMPLETED' ? ('processed' as const) : ('pending' as const)};
  }
}

/** USD charge for an INR total at the reviewed rate, rounded up to the cent (never undercharges by rounding). */
export function usdCharge(totalPaise: bigint, inrPerUnit: string): Charge {
  const [i = '0', f = ''] = inrPerUnit.split('.');
  const rate10k = BigInt(i) * 10_000n + BigInt((f + '0000').slice(0, 4)); // paise per cent × 100
  const cents = (totalPaise * 10_000n + rate10k - 1n) / rate10k;
  return {amountMinor: cents, currency: 'USD', exchangeRate: inrPerUnit};
}

export const paypal: ProviderModule = {
  name: 'paypal', label: 'PayPal (international cards, USD)', secretFields: FIELDS,
  async configured(environment) { const k = await keys(environment); return Boolean(k.clientId && k.clientSecret && k.webhookId && (await getSetting('international'))); },
  async create(environment: Environment) {
    if (environment === 'mock') throw new Error('mock handled by registry');
    const k = await keys(environment);
    if (!k.clientId || !k.clientSecret) throw new AppError('PAYMENT_NOT_CONFIGURED', 503, 'PayPal is not set up yet.');
    return new PayPalProvider(new PayPalApi(environment, k.clientId, k.clientSecret));
  },
  async chargeFor(totalPaise) {
    const intl = await getSetting('international');
    if (!intl) throw new AppError('PAYMENT_NOT_CONFIGURED', 503, 'International payments are not set up yet (exchange rate not reviewed).');
    return usdCharge(totalPaise, intl.inrPerUnit);
  },
  /** PayPal webhooks are verified by PayPal's verify-webhook-signature API using our Webhook ID. */
  async verifyWebhook(raw, headers: Headers) {
    const needed = ['paypal-auth-algo', 'paypal-cert-url', 'paypal-transmission-id', 'paypal-transmission-sig', 'paypal-transmission-time'];
    if (needed.some((h) => !headers[h])) return null;
    let event: unknown;
    try { event = JSON.parse(raw.toString('utf8')); } catch { return null; }
    for (const environment of ['test', 'live'] as const) {
      const k = await keys(environment);
      if (!k.clientId || !k.clientSecret || !k.webhookId) continue;
      const api = new PayPalApi(environment, k.clientId, k.clientSecret);
      const r = await api.call<{verification_status: string}>('POST', '/v1/notifications/verify-webhook-signature', {
        auth_algo: headers['paypal-auth-algo'], cert_url: headers['paypal-cert-url'], transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'], transmission_time: headers['paypal-transmission-time'], webhook_id: k.webhookId, webhook_event: event,
      }).catch(() => null);
      if (r?.verification_status === 'SUCCESS') return environment;
    }
    return null;
  },
  parseWebhook(raw): ParsedEvent {
    const body = JSON.parse(raw.toString('utf8')) as {id?: string; event_type?: string; resource?: Record<string, unknown> & {amount?: {value: string; currency_code: string}; supplementary_data?: {related_ids?: {order_id?: string}}; links?: {rel: string; href: string}[]}};
    const type = String(body.event_type ?? 'unknown');
    const eventId = String(body.id ?? `${type}:${String(body.resource?.['id'] ?? '')}`);
    const r = body.resource ?? {};
    const orderId = r.supplementary_data?.related_ids?.order_id ?? '';
    if (type === 'CHECKOUT.ORDER.APPROVED') return {kind: 'needs_capture', eventId, type, providerOrderId: String(r['id'])};
    if ((type === 'PAYMENT.CAPTURE.COMPLETED' || type === 'PAYMENT.CAPTURE.DENIED' || type === 'PAYMENT.CAPTURE.DECLINED') && r.amount) {
      const ok = type === 'PAYMENT.CAPTURE.COMPLETED';
      return {kind: ok ? 'captured' : 'failed', eventId, type, providerOrderId: orderId, payment: {providerPaymentId: String(r['id']), status: ok ? 'captured' : 'failed', amountMinor: toMinor(r.amount.value), currency: r.amount.currency_code, failureReason: ok ? undefined : 'Declined by PayPal'}};
    }
    if (type === 'PAYMENT.CAPTURE.REFUNDED' && r.amount) {
      const up = r.links?.find((l) => l.rel === 'up')?.href ?? '';
      return {kind: 'refund_processed', eventId, type, providerRefundId: String(r['id']), providerPaymentId: up.split('/').pop() ?? '', amountMinor: toMinor(r.amount.value)};
    }
    return {kind: 'ignored', eventId, type};
  },
  async keyStatus() {
    const out: Record<string, unknown> = {};
    for (const environment of ['test', 'live'] as const) { const k = await keys(environment); out[environment] = {clientId: mask(k.clientId), clientSecret: Boolean(k.clientSecret), webhookId: Boolean(k.webhookId)}; }
    return out;
  },
};
