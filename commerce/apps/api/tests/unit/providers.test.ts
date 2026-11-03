import {createHmac} from 'node:crypto';
import {describe, expect, it} from 'vitest';
import {PROVIDERS, usdCharge} from '../../src/providers/payments/index.js';
import {SHIPPING_PROVIDERS} from '../../src/providers/shipping/index.js';

describe('PayPal adapter', () => {
  it('converts INR to USD at the reviewed rate, rounding up to the cent', () => {
    expect(usdCharge(842_500n, '84.25')).toEqual({amountMinor: 10_000n, currency: 'USD', exchangeRate: '84.25'}); // ₹8,425 = $100.00
    expect(usdCharge(842_501n, '84.25').amountMinor).toBe(10_001n); // never undercharges
    expect(usdCharge(100n, '83').amountMinor).toBe(2n); // ₹1 → $0.0120… → 2 cents
  });
  it('parses capture, approval and refund events', () => {
    const parse = (o: unknown) => PROVIDERS.paypal.parseWebhook(Buffer.from(JSON.stringify(o)), {});
    expect(parse({id: 'WH-1', event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: {id: 'CAP1', amount: {value: '17.07', currency_code: 'USD'}, supplementary_data: {related_ids: {order_id: 'ORD1'}}}}))
      .toMatchObject({kind: 'captured', eventId: 'WH-1', providerOrderId: 'ORD1', payment: {providerPaymentId: 'CAP1', amountMinor: 1707n, currency: 'USD'}});
    expect(parse({id: 'WH-2', event_type: 'CHECKOUT.ORDER.APPROVED', resource: {id: 'ORD1'}})).toMatchObject({kind: 'needs_capture', providerOrderId: 'ORD1'});
    expect(parse({id: 'WH-3', event_type: 'PAYMENT.CAPTURE.REFUNDED', resource: {id: 'RF1', amount: {value: '5.5', currency_code: 'USD'}, links: [{rel: 'up', href: 'https://api/v2/payments/captures/CAP1'}]}}))
      .toMatchObject({kind: 'refund_processed', providerRefundId: 'RF1', providerPaymentId: 'CAP1', amountMinor: 550n});
    expect(parse({id: 'WH-4', event_type: 'CUSTOMER.DISPUTE.CREATED', resource: {}})).toMatchObject({kind: 'ignored'});
  });
  it('rejects webhooks without PayPal transmission headers before any network call', async () => {
    expect(await PROVIDERS.paypal.verifyWebhook(Buffer.from('{}'), {})).toBeNull();
  });
});

describe('Razorpay adapter', () => {
  it('turns payment.authorized into a server-side capture request', () => {
    const e = PROVIDERS.razorpay.parseWebhook(Buffer.from(JSON.stringify({event: 'payment.authorized', payload: {payment: {entity: {id: 'pay_9', order_id: 'order_9', amount: 500, currency: 'INR'}}}})), {'x-razorpay-event-id': 'evt_9'});
    expect(e).toEqual({kind: 'needs_capture', eventId: 'evt_9', type: 'payment.authorized', providerOrderId: 'order_9', providerPaymentId: 'pay_9'});
  });
});

describe('shipping adapters', () => {
  const body = JSON.stringify([{eventId: 'e1', trackingNo: 'AWB1', courier: 'delhivery', status: 'OUT_FOR_DELIVERY', occurredAt: '2026-11-03T10:00:00Z', location: 'Noida'}]);
  it('generic webhook needs the HMAC of the exact raw body', async () => {
    process.env['SHIPPING_WEBHOOK_SECRET'] = 'test-shipping-webhook-secret';
    const sig = createHmac('sha256', 'test-shipping-webhook-secret').update(body).digest('hex');
    expect(await SHIPPING_PROVIDERS['generic']!.verifyWebhook(Buffer.from(body), {'x-signature': sig})).toBe(true);
    expect(await SHIPPING_PROVIDERS['generic']!.verifyWebhook(Buffer.from(body + ' '), {'x-signature': sig})).toBe(false);
    expect(SHIPPING_PROVIDERS['generic']!.parseWebhook(Buffer.from(body), {})[0]).toMatchObject({trackingNo: 'AWB1', status: 'OUT_FOR_DELIVERY', location: 'Noida'});
    expect(() => SHIPPING_PROVIDERS['generic']!.parseWebhook(Buffer.from('{"status":"TELEPORTED"}'), {})).toThrow();
  });
  it('manual shipments never accept webhooks', async () => {
    expect(await SHIPPING_PROVIDERS['manual']!.verifyWebhook(Buffer.from(body), {'x-signature': 'anything'})).toBe(false);
  });
});
