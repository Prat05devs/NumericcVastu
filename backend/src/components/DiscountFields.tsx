import type {Discount} from '../lib/pricing.ts';
import {KINDS, toMajor} from '../lib/format.ts';

type Item = {id: string; name: string; kind: string; storefront: string};

/** The discount part of the coupon and sale forms; lib/format.ts parseDiscount reads it back. */
export default function DiscountFields({discount, items, allowNone = false}: {discount?: Discount; items: Item[]; allowNone?: boolean}) {
  const d: Discount = discount ?? {type: allowNone ? 'none' : 'percent'};
  const kinds = d.appliesTo?.kinds ?? [];
  const chosen = d.appliesTo?.items ?? [];
  return <fieldset>
    <legend>Discount</legend>
    <div className="grid three">
      <label>Type
        <select name="discountType" defaultValue={d.type}>
          {allowNone && <option value="none">No discount (decoration only)</option>}
          <option value="percent">Percentage off</option>
          <option value="fixed">Fixed amount off</option>
        </select>
      </label>
      <label>Percentage off <small>For a percentage discount, 1–100.</small>
        <input type="number" name="percentOff" min="1" max="100" step="0.01" defaultValue={d.percentOff ?? ''}/>
      </label>
      <div/>
      <label>Amount off in ₹ <small>For a fixed discount, visitors in India.</small><input type="text" inputMode="decimal" name="amountOffInr" defaultValue={toMajor(d.amountOff?.INR)}/></label>
      <label>Amount off in $ <small>For a fixed discount, visitors abroad.</small><input type="text" inputMode="decimal" name="amountOffUsd" defaultValue={toMajor(d.amountOff?.USD)}/></label>
      <div/>
      <label>Maximum discount ₹ <small>Optional cap for a percentage.</small><input type="text" inputMode="decimal" name="maxDiscountInr" defaultValue={toMajor(d.maxDiscount?.INR)}/></label>
      <label>Maximum discount $ <small>Optional.</small><input type="text" inputMode="decimal" name="maxDiscountUsd" defaultValue={toMajor(d.maxDiscount?.USD)}/></label>
      <div/>
      <label>Minimum order ₹ <small>Optional. Counts only the items the discount applies to.</small><input type="text" inputMode="decimal" name="minOrderInr" defaultValue={toMajor(d.minOrder?.INR)}/></label>
      <label>Minimum order $ <small>Optional.</small><input type="text" inputMode="decimal" name="minOrderUsd" defaultValue={toMajor(d.minOrder?.USD)}/></label>
    </div>
    <div>
      <p className="help">Applies to <b>these kinds</b> (none ticked = all kinds):</p>
      <div className="checks">{KINDS.map(([kind, label]) => <label key={kind}><input type="checkbox" name="kinds" value={kind} defaultChecked={kinds.includes(kind)}/>{label}</label>)}</div>
    </div>
    <label>Only these items <small>Optional. Hold Ctrl/Cmd to choose several; leave empty for every item of the kinds above.</small>
      <select name="items" multiple size={Math.min(10, items.length || 3)} defaultValue={chosen}>
        {items.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.kind}, {item.storefront})</option>)}
      </select>
    </label>
  </fieldset>;
}
