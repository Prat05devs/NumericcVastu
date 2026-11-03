/**
 * Payment provider contract (ADR-0006). Each provider is one module implementing ProviderModule; adding a provider
 * means adding a file and one registry entry in index.ts — checkout, webhooks, reconciliation and refunds are shared.
 * Rules every module follows: no provider call inside a database transaction; webhooks verified from raw bytes (or by
 * the provider's verification API) before parsing; amounts in minor units of the provider's currency.
 */
export type Environment = 'mock' | 'test' | 'live';
export type ProviderName = 'razorpay' | 'paypal' | 'mock';
export type Charge = {amountMinor: bigint; currency: string; exchangeRate: string | null};

export type ProviderPayment = {providerPaymentId: string; status: 'created' | 'authorized' | 'captured' | 'failed' | 'refunded'; amountMinor: bigint; currency: string; failureReason?: string | undefined};
export type ParsedEvent =
  | {kind: 'captured' | 'failed'; eventId: string; type: string; providerOrderId: string; payment: ProviderPayment}
  /** Buyer approved / payment authorised but not yet captured: the server captures it (never the browser). */
  | {kind: 'needs_capture'; eventId: string; type: string; providerOrderId: string; providerPaymentId?: string | undefined}
  | {kind: 'refund_processed' | 'refund_failed'; eventId: string; type: string; providerRefundId: string; providerPaymentId: string; amountMinor: bigint}
  | {kind: 'ignored'; eventId: string; type: string};

export interface PaymentProvider {
  readonly name: ProviderName;
  readonly environment: Environment;
  createOrder(input: {charge: Charge; receipt: string; orderId: string; publicCode: string}): Promise<{providerOrderId: string}>;
  /** What the browser needs to open the provider's checkout (public identifiers only). */
  checkoutParams(input: {providerOrderId: string; charge: Charge; email: string; publicCode: string}): Record<string, unknown>;
  fetchPayments(providerOrderId: string): Promise<ProviderPayment[]>;
  /** Capture an approved/authorised payment. Idempotent at the provider. Returns the payments afterwards. */
  capture(providerOrderId: string, providerPaymentId: string | undefined, charge: Charge): Promise<ProviderPayment[]>;
  refund(input: {providerPaymentId: string; amountMinor: bigint; currency: string; receipt: string}): Promise<{providerRefundId: string; status: 'processed' | 'pending'}>;
}

export type Headers = Record<string, string | undefined>;
export interface ProviderModule {
  readonly name: ProviderName;
  readonly label: string;
  /** Secret names (without the payments.<name>.<env>. prefix) this provider stores in the encrypted vault. */
  readonly secretFields: readonly string[];
  configured(environment: Exclude<Environment, 'mock'>): Promise<boolean>;
  create(environment: Environment): Promise<PaymentProvider>;
  /** How an INR order total is charged by this provider (currency conversion policy lives here). */
  chargeFor(totalPaise: bigint): Promise<Charge>;
  /** Returns the environment whose credentials verified the webhook, or null when it is not authentic. */
  verifyWebhook(raw: Buffer, headers: Headers): Promise<Environment | null>;
  parseWebhook(raw: Buffer, headers: Headers): ParsedEvent;
  keyStatus(): Promise<Record<string, unknown>>;
}

export const inrCharge = (totalPaise: bigint): Charge => ({amountMinor: totalPaise, currency: 'INR', exchangeRate: null});
