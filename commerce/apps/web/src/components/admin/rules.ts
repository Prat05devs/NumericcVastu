import type {Spec} from './kit';

/** Discount rule fields shared by coupons and campaigns (percent → basis points, rupees → paise on the wire). */
export const RULE_SPECS: Spec[] = [
  {key: 'rule.type', label: 'Discount type', hint: 'Percentage = % off (jaise 10%). Fixed amount = seedha ₹ off (jaise ₹300).', type: 'select', options: [['PERCENT', 'Percentage'], ['FIXED', 'Fixed amount']]},
  {key: 'rule.percentBp', label: 'Percentage off', type: 'percent', hint: 'Sirf number likho, jaise 10. Paise round down hote hain.'},
  {key: 'rule.amountPaise', label: 'Amount off (₹)', type: 'money', hint: 'Sirf “Fixed amount” ke liye. Percentage wale mein khaali chhodo.'},
  {key: 'rule.maxDiscountPaise', label: 'Maximum discount (₹, optional)', hint: 'Optional. Jaise 2000 likha toh mehnga gemstone ho tab bhi ₹2,000 se zyada discount nahi.', type: 'money'},
  {key: 'rule.minOrderPaise', label: 'Minimum order (₹, optional)', type: 'money', hint: 'Optional. Itne ₹ ka saaman cart mein ho tab hi discount lagega.'},
  {key: 'rule.appliesTo.families', label: 'Only these (comma separated, blank = all). Shop: RUDRAKSHA, GEMSTONE, CRYSTAL, YANTRA. Website: COURSE, CONSULTATION, REPORT', hint: 'Khaali = sab par lagega. Sirf kuch par chahiye toh likho, jaise RUDRAKSHA, CRYSTAL.', type: 'text'},
];
/** Converts the comma list typed in the form into the array the API expects. */
export function normaliseRule(v: Record<string, unknown>) {
  const rule = {...(v['rule'] as Record<string, unknown>)};
  const fam = (rule['appliesTo'] as {families?: unknown} | undefined)?.families;
  rule['appliesTo'] = {families: typeof fam === 'string' ? fam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) : Array.isArray(fam) ? fam : [], productIds: []};
  for (const k of ['percentBp', 'amountPaise', 'maxDiscountPaise', 'minOrderPaise']) if (rule[k] === null || rule[k] === undefined || rule[k] === '') delete rule[k];
  return rule;
}
