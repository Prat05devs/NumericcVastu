import {describe, expect, it} from 'vitest';
import {allocate, formatInr, paise, rupeesToPaise, taxFor, toWire} from '../src/money.js';
import {applyDiscount, commissionFor, price, type PricedLine} from '../src/pricing.js';
import {assertTransition, canTransition, nextShipmentStatus, ORDER_TRANSITIONS, RESERVATION_TRANSITIONS, TransitionError} from '../src/states.js';
import {can} from '../src/access.js';

const rudraksha: PricedLine = {variantId: 'V1', productId: 'P1', family: 'RUDRAKSHA', unitPricePaise: 129_900n, qty: 2, taxGroup: 'GST_SPIRITUAL'};
const emerald: PricedLine = {variantId: 'V2', productId: 'P2', family: 'GEMSTONE', unitPricePaise: 899_900n, qty: 1, taxGroup: 'GST_GEM'};

describe('money', () => {
  it('round-trips wire strings and rejects floats', () => {
    expect(toWire(paise('349900'))).toBe('349900');
    expect(() => paise('3499.00')).toThrow();
    expect(() => paise(12.5)).toThrow();
    expect(rupeesToPaise('1,499.5')).toBe(149_950n);
  });
  it('formats INR with Indian grouping', () => expect(formatInr(25_000_000n)).toBe('₹2,50,000'));
  it('allocates exactly with no lost paise', () => {
    const parts = allocate(1001n, [1n, 1n, 1n]);
    expect(parts.reduce((a, b) => a + b, 0n)).toBe(1001n);
    expect(allocate(500n, [0n, 300n])).toEqual([0n, 500n]);
  });
  it('splits inclusive and exclusive tax', () => {
    expect(taxFor(118_000n, 1800, 'INCLUSIVE')).toBe(18_000n);
    expect(taxFor(100_000n, 1800, 'EXCLUSIVE')).toBe(18_000n);
  });
});

describe('pricing', () => {
  it('rounds percentage discounts down to whole rupees and honours caps and targets', () => {
    const lines = [rudraksha, emerald];
    const subtotals = [259_800n, 899_900n];
    expect(applyDiscount(lines, subtotals, {type: 'PERCENT', percentBp: 1500}).total).toBe(173_900n); // 15% of ₹11,597 = ₹1,739.55
    expect(applyDiscount(lines, subtotals, {type: 'PERCENT', percentBp: 1500, maxDiscountPaise: 100_000n}).total).toBe(100_000n);
    expect(applyDiscount(lines, subtotals, {type: 'PERCENT', percentBp: 1000, appliesTo: {families: ['RUDRAKSHA']}}).perLine).toEqual([25_900n, 0n]);
    expect(applyDiscount(lines, subtotals, {type: 'FIXED', amountPaise: 50_000n, minOrderPaise: 2_000_000n}).reason).toBe('BELOW_MINIMUM');
  });
  it('lets the better of a sale and a non-combinable coupon win', () => {
    const sale = {id: 's', label: 'Diwali Sale', rule: {type: 'PERCENT' as const, percentBp: 1000}};
    const small = price({lines: [emerald], campaigns: [sale], coupon: {id: 'c', label: 'WELCOME5', rule: {type: 'PERCENT', percentBp: 500}}});
    expect(small.campaign?.label).toBe('Diwali Sale');
    expect(small.coupon).toBeNull();
    const big = price({lines: [emerald], campaigns: [sale], coupon: {id: 'c', label: 'VIP20', rule: {type: 'PERCENT', percentBp: 2000}}});
    expect(big.coupon?.label).toBe('VIP20');
    expect(big.campaign).toBeNull();
  });
  it('applies a combinable coupon after the sale', () => {
    const r = price({lines: [emerald], campaigns: [{id: 's', label: 'Sale', rule: {type: 'PERCENT', percentBp: 1000}}], coupon: {id: 'c', label: 'EXTRA5', combinable: true, rule: {type: 'PERCENT', percentBp: 500}}});
    expect(r.discountPaise).toBe(89_900n + 40_500n); // 10% of ₹8,999 → ₹899; then 5% of the remaining ₹8,100 = ₹405
  });
  it('orders discount → shipping → tax → total, and flags missing configuration', () => {
    const unconfigured = price({lines: [rudraksha]});
    expect(unconfigured.warnings).toEqual(['SHIPPING_NOT_SELECTED', 'TAX_NOT_CONFIGURED']);
    expect(unconfigured.totalPaise).toBe(259_800n);
    const shipping = {id: 'standard', label: 'Standard', feePaise: 9_900n, freeAbovePaise: 300_000n};
    const inclusive = price({lines: [rudraksha], shipping, tax: {mode: 'INCLUSIVE', groups: {GST_SPIRITUAL: 1200}, shippingGroup: null}});
    expect(inclusive.shippingPaise).toBe(9_900n);
    expect(inclusive.totalPaise).toBe(269_700n);
    expect(inclusive.taxPaise).toBe(27_835n); // 12% inside ₹2,598
    const exclusive = price({lines: [emerald], shipping, tax: {mode: 'EXCLUSIVE', groups: {GST_GEM: 300}, shippingGroup: null}});
    expect(exclusive.shippingPaise).toBe(0n); // free above ₹3,000
    expect(exclusive.totalPaise).toBe(899_900n + 26_997n);
  });
  it('pays commission on the amount paid', () => {
    expect(commissionFor({type: 'PERCENT', percentBp: 1000}, 255_000n)).toBe(25_500n);
    expect(commissionFor({type: 'FIXED', amountPaise: 50_000n}, 20_000n)).toBe(20_000n);
  });
});

describe('state machines and access', () => {
  it('allows only listed transitions', () => {
    expect(canTransition(ORDER_TRANSITIONS, 'AWAITING_PAYMENT', 'PAID')).toBe(true);
    expect(canTransition(ORDER_TRANSITIONS, 'DELIVERED', 'AWAITING_PAYMENT')).toBe(false);
    expect(() => assertTransition('reservation', RESERVATION_TRANSITIONS, 'RELEASED', 'CONSUMED')).toThrow(TransitionError);
  });
  it('never moves a delivered shipment backwards', () => {
    expect(nextShipmentStatus('DELIVERED', 'IN_TRANSIT')).toBe('DELIVERED');
    expect(nextShipmentStatus('SHIPPED', 'DELIVERED')).toBe('DELIVERED');
  });
  it('keeps refunds with finance and owner only', () => {
    expect(can('FINANCE', 'refunds.write')).toBe(true);
    expect(can('SUPPORT', 'refunds.write')).toBe(false);
    expect(can('CUSTOMER', 'orders.read')).toBe(false);
  });
});

describe('patch schemas', () => {
  it('do not inject defaults for fields the client did not send', async () => {
    const {ProductPatch, patchOf} = await import('../src/schemas.js');
    expect(ProductPatch.parse({version: 1, title: 'New title'})).toEqual({version: 1, title: 'New title'});
    const {z} = await import('zod');
    expect(patchOf(z.object({ids: z.array(z.string()).default([]), status: z.string().default('DRAFT')})).parse({})).toEqual({});
  });
});
