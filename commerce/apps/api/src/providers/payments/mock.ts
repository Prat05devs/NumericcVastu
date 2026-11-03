import {env} from '../../config/env.js';
import {prisma} from '../../lib/db.js';
import {AppError} from '../../lib/errors.js';
import {hmacHex} from '../../lib/crypto.js';
import {ulid} from '../../lib/ids.js';
import {inrCharge, type Charge, type PaymentProvider, type ProviderModule, type ProviderPayment} from './types.js';
import {parseRazorpayEvent, verifyRazorpaySignature} from './razorpay.js';

/**
 * Simulated provider for development and tests: the whole flow runs without credentials. Its "provider-side" state
 * lives in site_settings (mockpay:*). Refused in production; it never moves money.
 */
export class MockProvider implements PaymentProvider {
  readonly name = 'mock' as const;
  readonly environment = 'mock' as const;
  async createOrder(input: {charge: Charge}) {
    const providerOrderId = `mock_order_${ulid()}`;
    await prisma.siteSetting.create({data: {key: `mockpay:${providerOrderId}`, valueJson: {amountPaise: input.charge.amountMinor.toString(), payments: []}}});
    return {providerOrderId};
  }
  checkoutParams(input: {providerOrderId: string; charge: Charge}) {
    return {provider: 'mock', orderId: input.providerOrderId, amount: input.charge.amountMinor.toString(), currency: 'INR', simulator: env().DEV_TOOLS || env().NODE_ENV === 'test' ? '/api/v1/dev/mock-pay' : null};
  }
  async fetchPayments(providerOrderId: string): Promise<ProviderPayment[]> {
    const row = await prisma.siteSetting.findUnique({where: {key: `mockpay:${providerOrderId}`}});
    const payments = ((row?.valueJson as {payments?: {id: string; status: string; amountPaise: string}[]})?.payments) ?? [];
    return payments.map((p) => ({providerPaymentId: p.id, status: p.status as ProviderPayment['status'], amountMinor: BigInt(p.amountPaise), currency: 'INR'}));
  }
  async capture(providerOrderId: string) { return this.fetchPayments(providerOrderId); }
  async refund(input: {receipt: string}) {
    if (process.env['MOCK_REFUND_FAIL'] === '1') throw new AppError('PAYMENT_PROVIDER_UNAVAILABLE', 503, 'Mock provider refund failure (fault injection).');
    return {providerRefundId: `mock_rfnd_${input.receipt}`, status: 'processed' as const};
  }
}

/** Records a simulated charge and returns a webhook body signed exactly like the real provider would sign it. */
export async function mockCharge(providerOrderId: string, outcome: 'success' | 'failure', amountPaise?: bigint) {
  const key = `mockpay:${providerOrderId}`;
  const row = await prisma.siteSetting.findUnique({where: {key}});
  if (!row) throw new AppError('NOT_FOUND', 404, 'Mock provider order not found.');
  const state = row.valueJson as {amountPaise: string; payments: {id: string; status: string; amountPaise: string}[]};
  const payment = {id: `mock_pay_${ulid()}`, status: outcome === 'success' ? 'captured' : 'failed', amountPaise: (amountPaise ?? BigInt(state.amountPaise)).toString()};
  state.payments.push(payment);
  await prisma.siteSetting.update({where: {key}, data: {valueJson: state}});
  const body = Buffer.from(JSON.stringify({
    event: outcome === 'success' ? 'payment.captured' : 'payment.failed', created_at: Math.floor(Date.now() / 1000),
    payload: {payment: {entity: {id: payment.id, order_id: providerOrderId, amount: Number(payment.amountPaise), currency: 'INR', status: payment.status, ...(outcome === 'failure' && {error_description: 'Simulated decline'})}}},
  }));
  return {body, signature: hmacHex(env().MOCK_PAYMENT_WEBHOOK_SECRET, body), eventId: `mock_evt_${ulid()}`, payment};
}

export const mock: ProviderModule = {
  name: 'mock', label: 'Payment simulator (development only)', secretFields: [],
  async configured() { return env().NODE_ENV !== 'production'; },
  async create() {
    if (env().NODE_ENV === 'production') throw new AppError('PAYMENT_NOT_CONFIGURED', 503, 'Online payment is not set up yet. Please contact us to complete your order.');
    return new MockProvider();
  },
  async chargeFor(totalPaise) { return inrCharge(totalPaise); },
  async verifyWebhook(raw, headers) {
    if (env().NODE_ENV === 'production') return null;
    return verifyRazorpaySignature(raw, headers['x-razorpay-signature'], env().MOCK_PAYMENT_WEBHOOK_SECRET) ? 'mock' : null;
  },
  parseWebhook: (raw, headers) => parseRazorpayEvent(raw, headers['x-razorpay-event-id']),
  async keyStatus() { return {}; },
};
