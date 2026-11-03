import {env} from '../../config/env.js';
import {AppError} from '../../lib/errors.js';
import {getSetting} from '../../lib/settings.js';
import {mock} from './mock.js';
import {paypal} from './paypal.js';
import {razorpay} from './razorpay.js';
import type {Environment, PaymentProvider, ProviderModule, ProviderName} from './types.js';

export * from './types.js';
export {mockCharge} from './mock.js';
export {verifyRazorpaySignature, parseRazorpayEvent} from './razorpay.js';
export {usdCharge} from './paypal.js';
export {secretName} from './vault.js';

/** The registry: to add a provider, implement ProviderModule in its own file and list it here. */
export const PROVIDERS: Record<ProviderName, ProviderModule> = {razorpay, paypal, mock};
export const CUSTOMER_PROVIDERS = ['razorpay', 'paypal'] as const;
export type CustomerProvider = (typeof CUSTOMER_PROVIDERS)[number];

export async function paymentMode(): Promise<Environment> {
  return (await getSetting('payments.mode'))?.mode ?? 'mock';
}

function assertModeAllowed(mode: Environment) {
  if (mode === 'live' && !env().ALLOW_LIVE_PAYMENTS) throw new AppError('LIVE_PAYMENTS_LOCKED', 503, 'Online payment is temporarily unavailable.');
}

/** Payment methods the customer can choose right now (mock mode simulates every method). */
export async function paymentOptions() {
  const mode = await paymentMode();
  if (mode === 'mock') return env().NODE_ENV === 'production' ? [] : [{provider: 'razorpay' as const, label: `${razorpay.label} — simulated`, currency: 'INR'}];
  if (mode === 'live' && !env().ALLOW_LIVE_PAYMENTS) return [];
  const out: {provider: CustomerProvider; label: string; currency: string}[] = [];
  for (const name of CUSTOMER_PROVIDERS) if (await PROVIDERS[name].configured(mode)) out.push({provider: name, label: PROVIDERS[name].label, currency: name === 'paypal' ? 'USD' : 'INR'});
  return out;
}

/** Module + client for a new payment under the current mode. */
export async function activeProvider(requested?: CustomerProvider): Promise<{module: ProviderModule; provider: PaymentProvider}> {
  const mode = await paymentMode();
  assertModeAllowed(mode);
  if (mode === 'mock') return {module: mock, provider: await mock.create('mock')};
  const name = requested ?? 'razorpay';
  const module = PROVIDERS[name];
  if (!(await module.configured(mode))) throw new AppError('PAYMENT_NOT_CONFIGURED', 503, `${name === 'paypal' ? 'PayPal' : 'Online payment'} is not set up yet. Please choose another method or contact us.`);
  return {module, provider: await module.create(mode)};
}

/** Client for an existing payment row (reconciliation and refunds use the environment it was made in). */
export async function providerFor(name: string, environment: string): Promise<PaymentProvider> {
  const module = PROVIDERS[name as ProviderName];
  if (!module) throw new AppError('NOT_FOUND', 404, 'Unknown payment provider.');
  assertModeAllowed(environment as Environment);
  return module.create(environment as Environment);
}

export async function keyStatus() {
  return {razorpay: await razorpay.keyStatus(), paypal: await paypal.keyStatus()};
}
