import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyDiscount, quote, type CartLine, type PricedItem} from '../src/lib/pricing.ts';

const launchpad: PricedItem = {id: 'course-launchpad', kind: 'course', name: 'Launchpad', priceInr: 2999900, priceUsd: 69000};
const career: PricedItem = {id: 'consult-career', kind: 'consultation', name: 'Career', priceInr: 510000, priceUsd: 12000};
const cart: CartLine[] = [{item: launchpad, quantity: 1}, {item: career, quantity: 1}];
const subtotals = [2999900, 510000];

test('percentage discounts round down to whole rupees and respect the cap', () => {
  const result = applyDiscount(cart, subtotals, {type: 'percent', percentOff: 15}, 'INR');
  assert.equal(result.total, 526400); // 15% of ₹35,099 = ₹5,264.85 → ₹5,264
  assert.equal(result.perLine.reduce((a, b) => a + b, 0), result.total);
  assert.equal(applyDiscount(cart, subtotals, {type: 'percent', percentOff: 15, maxDiscount: {INR: 300000}}, 'INR').total, 300000);
});

test('discounts only touch the kinds or items they target, and honour minimum orders', () => {
  const courses = applyDiscount(cart, subtotals, {type: 'percent', percentOff: 10, appliesTo: {kinds: ['course']}}, 'INR');
  assert.deepEqual(courses.perLine, [299900, 0]);
  const minimum = applyDiscount(cart, subtotals, {type: 'percent', percentOff: 10, appliesTo: {kinds: ['consultation']}, minOrder: {INR: 1000000}}, 'INR');
  assert.equal(minimum.total, 0);
  assert.equal(minimum.reason, 'below-minimum');
});

test('fixed discounts need an amount in the cart currency and never exceed the order', () => {
  assert.equal(applyDiscount(cart, [12000, 12000], {type: 'fixed', amountOff: {INR: 100000}}, 'USD').reason, 'no-amount-in-currency');
  assert.equal(applyDiscount([{item: career, quantity: 1}], [510000], {type: 'fixed', amountOff: {INR: 900000}}, 'INR').total, 510000);
});

test('a non-combinable coupon competes with the sale; the better saving wins', () => {
  const sale = {id: 'sale', label: 'Diwali Sale', discount: {type: 'percent' as const, percentOff: 10}};
  const small = quote(cart, 'INR', [sale], {id: 'c', label: 'WELCOME5', discount: {type: 'percent', percentOff: 5}});
  assert.equal(small.campaign?.label, 'Diwali Sale');
  assert.equal(small.coupon, null);
  const big = quote(cart, 'INR', [sale], {id: 'c', label: 'VIP20', discount: {type: 'percent', percentOff: 20}});
  assert.equal(big.coupon?.label, 'VIP20');
  assert.equal(big.campaign, null);
  assert.equal(big.total, big.subtotal - big.discount);
});

test('a combinable coupon applies after the sale', () => {
  const result = quote([{item: launchpad, quantity: 1}], 'INR', [{id: 's', label: 'Sale', discount: {type: 'percent', percentOff: 10}}], {id: 'c', label: 'EXTRA5', discount: {type: 'percent', percentOff: 5}, combinable: true});
  assert.equal(result.campaign?.amount, 299900);
  assert.equal(result.coupon?.amount, 135000); // the sale takes ₹2,999 off ₹29,999; 5% of the remaining ₹27,000 = ₹1,350
  assert.equal(result.total, 2999900 - 299900 - 135000);
});

test('of two overlapping sales, the one that saves this cart the most applies', () => {
  const result = quote(cart, 'USD', [
    {id: 'a', label: 'Courses 10%', discount: {type: 'percent', percentOff: 10, appliesTo: {kinds: ['course']}}},
    {id: 'b', label: 'Everything 15%', discount: {type: 'percent', percentOff: 15}},
  ]);
  assert.equal(result.campaign?.label, 'Everything 15%');
  assert.equal(result.discount, 12100); // 15% of $810 = $121.50, rounded down to whole dollars
});
