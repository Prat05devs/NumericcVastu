import DiscountFields from '../../../../components/DiscountFields.tsx';
import {toIstInput} from '../../../../lib/format.ts';
import type {CouponRow} from '../../../../lib/commerce.ts';
import {saveCoupon} from './actions.ts';

type Item = {id: string; name: string; kind: string; storefront: string};

export default function CouponForm({coupon, items, storefronts}: {coupon?: CouponRow; items: Item[]; storefronts: {id: string; name: string}[]}) {
  return <form action={saveCoupon} className="grid">
    {coupon && <input type="hidden" name="id" value={coupon.id}/>}
    <div className="card grid">
      <div className="grid two">
        <label>Code <small>What customers type. Letters and numbers, saved in capitals (e.g. DIWALI15, PRIYA10).</small>
          <input type="text" name="code" required defaultValue={coupon?.code} pattern="[A-Za-z0-9_\-]{3,32}" autoCapitalize="characters"/></label>
        <label>Internal note <small>Who or what it is for. Not shown to customers.</small>
          <input type="text" name="description" defaultValue={coupon?.description}/></label>
      </div>
      <DiscountFields discount={coupon?.discount} items={items}/>
      <fieldset><legend>Where and when</legend>
        <div className="checks">{storefronts.map((s) => <label key={s.id}><input type="checkbox" name="storefronts" value={s.id} defaultChecked={coupon?.storefronts.includes(s.id)}/>{s.name}</label>)}</div>
        <p className="help">No website ticked = valid on every website. Times are Indian Standard Time.</p>
        <div className="grid two">
          <label>Starts <small>Optional.</small><input type="datetime-local" name="startsAt" defaultValue={toIstInput(coupon?.starts_at)}/></label>
          <label>Ends <small>Optional.</small><input type="datetime-local" name="endsAt" defaultValue={toIstInput(coupon?.ends_at)}/></label>
          <label>Total uses <small>Optional limit across all customers.</small><input type="number" name="maxRedemptions" min="1" defaultValue={coupon?.max_redemptions ?? ''}/></label>
          <label>Uses per customer <small>Optional, by email.</small><input type="number" name="maxPerCustomer" min="1" defaultValue={coupon?.max_per_customer ?? ''}/></label>
        </div>
        <div className="checks">
          <label><input type="checkbox" name="combinable" defaultChecked={coupon?.combinable}/>Can be combined with a running sale (otherwise the customer gets the better of the two)</label>
          <label><input type="checkbox" name="active" defaultChecked={coupon ? coupon.active : true}/>Active</label>
        </div>
      </fieldset>
      <div className="row"><button className="btn" type="submit">{coupon ? 'Save coupon' : 'Create coupon'}</button></div>
    </div>
  </form>;
}
