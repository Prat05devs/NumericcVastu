import type {Spec} from './kit';

/** Discount rule fields shared by coupons and campaigns (percent → basis points, rupees → paise on the wire). */
export const RULE_SPECS: Spec[] = [
  {key: 'rule.type', label: 'Discount type', type: 'select', options: [['PERCENT', 'Percentage'], ['FIXED', 'Fixed amount']]},
  {key: 'rule.percentBp', label: 'Percentage off', type: 'percent', hint: 'For percentage discounts. Rounded down to whole rupees.'},
  {key: 'rule.amountPaise', label: 'Amount off (₹)', type: 'money', hint: 'For fixed discounts.'},
  {key: 'rule.maxDiscountPaise', label: 'Maximum discount (₹, optional)', type: 'money'},
  {key: 'rule.minOrderPaise', label: 'Minimum order (₹, optional)', type: 'money', hint: 'Counts only the items the discount applies to.'},
  {key: 'rule.appliesTo.families', label: 'Only these families (comma separated: RUDRAKSHA, GEMSTONE, CRYSTAL, YANTRA)', type: 'text'},
];
/** Converts the comma list typed in the form into the array the API expects. */
export function normaliseRule(v: Record<string, unknown>) {
  const rule = {...(v['rule'] as Record<string, unknown>)};
  const fam = (rule['appliesTo'] as {families?: unknown} | undefined)?.families;
  rule['appliesTo'] = {families: typeof fam === 'string' ? fam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean) : Array.isArray(fam) ? fam : [], productIds: []};
  for (const k of ['percentBp', 'amountPaise', 'maxDiscountPaise', 'minOrderPaise']) if (rule[k] === null || rule[k] === undefined || rule[k] === '') delete rule[k];
  return rule;
}
