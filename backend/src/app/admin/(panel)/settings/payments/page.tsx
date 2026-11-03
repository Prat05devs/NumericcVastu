import {can, requireAdmin} from '../../../../../lib/auth.ts';
import {paypalSettings, razorpaySettings, secretSummaries} from '../../../../../lib/settings.ts';
import Notice from '../../../../../components/Notice.tsx';
import SecretField from '../../../../../components/SecretField.tsx';
import {savePaypal, saveRazorpay, switchMode, testConnection} from './actions.ts';

function ModeSwitch({provider, current, test}: {provider: 'razorpay' | 'paypal'; current: string; test: string}) {
  const live = current === 'live';
  return <div className="grid two" style={{alignItems: 'start'}}>
    <div><p>Current mode: <span className={`chip ${live ? 'live' : 'warn'}`}>{live ? 'LIVE: real payments' : `${test === 'sandbox' ? 'Sandbox' : 'Test'}: no real money`}</span></p></div>
    <form action={switchMode} className="grid">
      <input type="hidden" name="provider" value={provider}/>
      {live ? <><input type="hidden" name="mode" value={test}/><button className="btn ghost" type="submit">Switch to {test} mode</button></>
        : <><input type="hidden" name="mode" value="live"/>
          <label className="row" style={{fontWeight: 500}}><input type="checkbox" name="confirm"/>I understand customers will be charged real money.</label>
          <button className="btn danger" type="submit">Switch to live</button></>}
    </form>
  </div>;
}

function TestButton({provider, mode, label}: {provider: string; mode: string; label: string}) {
  return <form action={testConnection}><input type="hidden" name="provider" value={provider}/><input type="hidden" name="mode" value={mode}/><button className="btn small ghost" type="submit">{label}</button></form>;
}

export default async function Payments({searchParams}: {searchParams: Promise<{ok?: string; error?: string}>}) {
  await requireAdmin(can.settings);
  const [razorpay, paypal, rzSecrets, ppSecrets] = await Promise.all([razorpaySettings(), paypalSettings(), secretSummaries('razorpay.'), secretSummaries('paypal.')]);
  return <>
    <div className="topbar"><h1>Payments</h1></div>
    <Notice params={await searchParams}/>
    <p className="help" style={{marginBottom: 16}}>Keys are encrypted before they are stored and never shown again; only their last four characters appear. Leave a secret empty to keep the saved one. Every change is recorded in the audit log.</p>

    <div className="card">
      <h2>Razorpay <small className="help">India: UPI, cards, net banking</small></h2>
      <ModeSwitch provider="razorpay" current={razorpay.mode} test="test"/>
      <form action={saveRazorpay} className="grid" style={{marginTop: 16}}>
        <div className="grid two">
          <fieldset><legend>Test keys</legend>
            <label>Key id<input type="text" name="testKeyId" placeholder="rzp_test_…" defaultValue={razorpay.test.keyId}/></label>
            <SecretField name="testKeySecret" label="Key secret" summary={rzSecrets['razorpay.test.keySecret']}/>
            <SecretField name="testWebhookSecret" label="Webhook secret" summary={rzSecrets['razorpay.test.webhookSecret']}/>
          </fieldset>
          <fieldset><legend>Live keys</legend>
            <label>Key id<input type="text" name="liveKeyId" placeholder="rzp_live_…" defaultValue={razorpay.live.keyId}/></label>
            <SecretField name="liveKeySecret" label="Key secret" summary={rzSecrets['razorpay.live.keySecret']}/>
            <SecretField name="liveWebhookSecret" label="Webhook secret" summary={rzSecrets['razorpay.live.webhookSecret']}/>
          </fieldset>
        </div>
        <label className="row" style={{fontWeight: 500}}><input type="checkbox" name="international" defaultChecked={razorpay.international}/>International cards are enabled on this Razorpay account (charge USD through Razorpay too)</label>
        <div className="row"><button className="btn" type="submit">Save Razorpay keys</button></div>
      </form>
      <div className="row" style={{marginTop: 12}}><TestButton provider="razorpay" mode="test" label="Test the test keys"/><TestButton provider="razorpay" mode="live" label="Test the live keys"/></div>
    </div>

    <div className="card">
      <h2>PayPal <small className="help">Visitors outside India</small></h2>
      <ModeSwitch provider="paypal" current={paypal.mode} test="sandbox"/>
      <form action={savePaypal} className="grid" style={{marginTop: 16}}>
        <div className="grid two">
          <fieldset><legend>Sandbox</legend>
            <label>Client id<input type="text" name="sandboxClientId" defaultValue={paypal.sandbox.clientId}/></label>
            <SecretField name="sandboxClientSecret" label="Client secret" summary={ppSecrets['paypal.sandbox.clientSecret']}/>
          </fieldset>
          <fieldset><legend>Live</legend>
            <label>Client id<input type="text" name="liveClientId" defaultValue={paypal.live.clientId}/></label>
            <SecretField name="liveClientSecret" label="Client secret" summary={ppSecrets['paypal.live.clientSecret']}/>
          </fieldset>
        </div>
        <div className="row"><button className="btn" type="submit">Save PayPal credentials</button></div>
      </form>
      <div className="row" style={{marginTop: 12}}><TestButton provider="paypal" mode="sandbox" label="Test sandbox"/><TestButton provider="paypal" mode="live" label="Test live"/></div>
    </div>
  </>;
}
