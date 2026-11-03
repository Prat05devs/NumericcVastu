import {env} from '../../config/env.js';
import {AppError} from '../../lib/errors.js';
import {hmacHex, safeEqual} from '../../lib/crypto.js';
import {inrCharge, type Charge, type Environment, type Headers, type ParsedEvent, type PaymentProvider, type ProviderModule, type ProviderPayment} from './types.js';
import {mask, readSecrets} from './vault.js';

/**
 * Razorpay (India; INR). Setup in the Razorpay dashboard, per environment (test, then live after KYC):
 *  1. Settings → API keys → generate key id + key secret → back office: Settings → Payments.
 *  2. Settings → Webhooks → URL https://<api-domain>/api/v1/webhooks/payments/razorpay, a strong secret, events:
 *     payment.authorized, payment.captured, payment.failed, order.paid, refund.processed, refund.failed.
 *  3. Payment capture: automatic is recommended; if manual, the API captures authorised payments itself.
 */
const FIELDS = ['key_id', 'key_secret', 'webhook_secret'] as const;
const STATUS: Record<string, ProviderPayment['status']> = {created: 'created', authorized: 'authorized', captured: 'captured', failed: 'failed', refunded: 'refunded'};

async function keys(environment: 'test' | 'live') {
  const s = await readSecrets('razorpay', environment, FIELDS);
  const e = env();
  const envMatches = e.RAZORPAY_KEY_ID?.startsWith(`rzp_${environment}_`);
  return {
    keyId: s['key_id'] ?? (envMatches ? e.RAZORPAY_KEY_ID! : null),
    keySecret: s['key_secret'] ?? (envMatches ? e.RAZORPAY_KEY_SECRET ?? null : null),
    webhookSecret: s['webhook_secret'] ?? (envMatches ? e.RAZORPAY_WEBHOOK_SECRET ?? null : null),
  };
}

export class RazorpayProvider implements PaymentProvider {
  readonly name = 'razorpay' as const;
  constructor(readonly environment: 'test' | 'live', private readonly keyId: string, private readonly keySecret: string, private readonly baseUrl = process.env['RAZORPAY_API_BASE'] ?? 'https://api.razorpay.com/v1') {}

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method, signal: AbortSignal.timeout(10_000),
      headers: {Authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`, 'Content-Type': 'application/json'},
      ...(body !== undefined && {body: JSON.stringify(body)}),
    }).catch(() => null);
    if (!res || res.status >= 500) throw new AppError('PAYMENT_PROVIDER_UNAVAILABLE', 503, 'The payment provider is unavailable. Your order is saved; please try again.');
    const json = (await res.json().catch(() => ({}))) as T & {error?: {description?: string}};
    if (!res.ok) throw new AppError('CONFLICT', 409, `Payment provider rejected the request: ${json.error?.description ?? res.status}`);
    return json;
  }
  async createOrder(input: {charge: Charge; receipt: string; orderId: string}) {
    const o = await this.call<{id: string}>('POST', '/orders', {amount: Number(input.charge.amountMinor), currency: input.charge.currency, receipt: input.receipt, notes: {order_id: input.orderId}});
    return {providerOrderId: o.id};
  }
  checkoutParams(input: {providerOrderId: string; charge: Charge; email: string; publicCode: string}) {
    return {provider: 'razorpay', keyId: this.keyId, orderId: input.providerOrderId, amount: input.charge.amountMinor.toString(), currency: input.charge.currency, description: `Order ${input.publicCode}`, prefill: {email: input.email}};
  }
  async fetchPayments(providerOrderId: string) {
    const list = await this.call<{items: {id: string; status: string; amount: number; currency: string; error_description?: string}[]}>('GET', `/orders/${encodeURIComponent(providerOrderId)}/payments`);
    return list.items.map((p) => ({providerPaymentId: p.id, status: STATUS[p.status] ?? 'created', amountMinor: BigInt(p.amount), currency: p.currency, failureReason: p.error_description}));
  }
  async capture(providerOrderId: string, providerPaymentId: string | undefined, charge: Charge) {
    const targets = providerPaymentId ? [providerPaymentId] : (await this.fetchPayments(providerOrderId)).filter((p) => p.status === 'authorized').map((p) => p.providerPaymentId);
    for (const id of targets) {
      await this.call('POST', `/payments/${encodeURIComponent(id)}/capture`, {amount: Number(charge.amountMinor), currency: charge.currency}).catch((e: AppError) => {
        if (!/already been captured/i.test(e.message)) throw e;
      });
    }
    return this.fetchPayments(providerOrderId);
  }
  async refund(input: {providerPaymentId: string; amountMinor: bigint; receipt: string}) {
    const r = await this.call<{id: string; status: string}>('POST', `/payments/${encodeURIComponent(input.providerPaymentId)}/refund`, {amount: Number(input.amountMinor), receipt: input.receipt, notes: {refund_id: input.receipt}});
    return {providerRefundId: r.id, status: r.status === 'processed' ? ('processed' as const) : ('pending' as const)};
  }
}

/** Razorpay signs the raw request body with the webhook secret: HMAC-SHA256, hex, in X-Razorpay-Signature. */
export function verifyRazorpaySignature(raw: Buffer, signature: string | undefined, secret: string): boolean {
  return Boolean(signature) && safeEqual(hmacHex(secret, raw), signature!);
}

export function parseRazorpayEvent(raw: Buffer, eventIdHeader: string | undefined): ParsedEvent {
  const body = JSON.parse(raw.toString('utf8')) as {event?: string; created_at?: number; payload?: {payment?: {entity?: Record<string, unknown>}; refund?: {entity?: Record<string, unknown>}}};
  const type = String(body.event ?? 'unknown');
  const payment = body.payload?.payment?.entity;
  const refund = body.payload?.refund?.entity;
  const eventId = eventIdHeader ?? `${type}:${String(payment?.['id'] ?? refund?.['id'] ?? '')}:${body.created_at ?? ''}`;
  if (type === 'payment.authorized' && payment) return {kind: 'needs_capture', eventId, type, providerOrderId: String(payment['order_id'] ?? ''), providerPaymentId: String(payment['id'])};
  if ((type === 'payment.captured' || type === 'order.paid' || type === 'payment.failed') && payment) {
    return {
      kind: type === 'payment.failed' ? 'failed' : 'captured', eventId, type, providerOrderId: String(payment['order_id'] ?? ''),
      payment: {providerPaymentId: String(payment['id']), status: type === 'payment.failed' ? 'failed' : 'captured', amountMinor: BigInt(Number(payment['amount'] ?? 0)), currency: String(payment['currency'] ?? ''), failureReason: payment['error_description'] as string | undefined},
    };
  }
  if ((type === 'refund.processed' || type === 'refund.failed') && refund) {
    return {kind: type === 'refund.processed' ? 'refund_processed' : 'refund_failed', eventId, type, providerRefundId: String(refund['id']), providerPaymentId: String(refund['payment_id']), amountMinor: BigInt(Number(refund['amount'] ?? 0))};
  }
  return {kind: 'ignored', eventId, type};
}

export const razorpay: ProviderModule = {
  name: 'razorpay', label: 'UPI, cards, netbanking & wallets (Razorpay)', secretFields: FIELDS,
  async configured(environment) { const k = await keys(environment); return Boolean(k.keyId && k.keySecret && k.webhookSecret); },
  async create(environment: Environment) {
    if (environment === 'mock') throw new Error('mock handled by registry');
    const k = await keys(environment);
    if (!k.keyId || !k.keySecret) throw new AppError('PAYMENT_NOT_CONFIGURED', 503, 'Online payment is not set up yet. Please contact us to complete your order.');
    return new RazorpayProvider(environment, k.keyId, k.keySecret);
  },
  async chargeFor(totalPaise) { return inrCharge(totalPaise); },
  async verifyWebhook(raw, headers: Headers) {
    for (const environment of ['test', 'live'] as const) {
      const {webhookSecret} = await keys(environment);
      if (webhookSecret && verifyRazorpaySignature(raw, headers['x-razorpay-signature'], webhookSecret)) return environment;
    }
    return null;
  },
  parseWebhook: (raw, headers) => parseRazorpayEvent(raw, headers['x-razorpay-event-id']),
  async keyStatus() {
    const out: Record<string, unknown> = {};
    for (const environment of ['test', 'live'] as const) { const k = await keys(environment); out[environment] = {keyId: mask(k.keyId), keySecret: Boolean(k.keySecret), webhookSecret: Boolean(k.webhookSecret)}; }
    return out;
  },
};
