import {toMajor} from '../../../../lib/format.ts';
import type {Commission} from '../../../../lib/commerce.ts';
import {saveAffiliate} from './actions.ts';

export type AffiliateRow = {id: string; name: string; email: string | null; phone: string | null; platform: string | null; handle: string | null; commission: Commission; notes: string; active: boolean};

export default function AffiliateForm({affiliate}: {affiliate?: AffiliateRow}) {
  const c = affiliate?.commission ?? {type: 'none'};
  return <form action={saveAffiliate} className="card grid">
    {affiliate && <input type="hidden" name="id" value={affiliate.id}/>}
    <div className="grid three">
      <label>Name<input type="text" name="name" required defaultValue={affiliate?.name}/></label>
      <label>Platform <small>Instagram, YouTube, podcast…</small><input type="text" name="platform" defaultValue={affiliate?.platform ?? ''}/></label>
      <label>Handle or channel<input type="text" name="handle" defaultValue={affiliate?.handle ?? ''}/></label>
      <label>Email<input type="email" name="email" defaultValue={affiliate?.email ?? ''}/></label>
      <label>Phone / WhatsApp<input type="text" name="phone" defaultValue={affiliate?.phone ?? ''}/></label>
    </div>
    <fieldset><legend>Commission per paid order</legend>
      <div className="grid four">
        <label>Type<select name="commissionType" defaultValue={c.type}><option value="none">None</option><option value="percent">Percentage of amount paid</option><option value="fixed">Fixed per order</option></select></label>
        <label>Percentage<input type="number" name="commissionPercent" min="1" max="100" step="0.01" defaultValue={c.percent ?? ''}/></label>
        <label>Fixed ₹<input type="text" inputMode="decimal" name="commissionInr" defaultValue={toMajor(c.amount?.INR)}/></label>
        <label>Fixed $<input type="text" inputMode="decimal" name="commissionUsd" defaultValue={toMajor(c.amount?.USD)}/></label>
      </div>
    </fieldset>
    <label>Notes <small>Agreement, payout details, contact person.</small><textarea name="notes" defaultValue={affiliate?.notes}/></label>
    <div className="row"><label className="row" style={{fontWeight: 500}}><input type="checkbox" name="active" defaultChecked={affiliate ? affiliate.active : true}/>Active (switching off stops all their links)</label></div>
    <div className="row"><button className="btn" type="submit">{affiliate ? 'Save affiliate' : 'Create affiliate'}</button></div>
  </form>;
}
