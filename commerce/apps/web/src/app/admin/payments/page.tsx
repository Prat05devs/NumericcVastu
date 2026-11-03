'use client';
import {useState} from 'react';
import {useResource, Loading, SpecForm} from '@/components/admin/kit';
import {call} from '@/lib/client';

type S = {payments: {mode: string; liveUnlockedByServer: boolean; webhookUrls: {razorpay: string; paypal: string}; keys: {razorpay: Record<'test' | 'live', {keyId: string | null; keySecret: boolean; webhookSecret: boolean}>; paypal: Record<'test' | 'live', {clientId: string | null; clientSecret: boolean; webhookId: boolean}>}}; values: {international: unknown}};
const tick = (b: boolean | string | null) => (b ? '✓' : '✗');

export default function Payments() {
  const {data, error, loading, reload} = useResource<S>('/admin/settings');
  const [msg, setMsg] = useState('');
  if (!data) return <Loading error={error} loading={loading} />;
  const p = data.payments;
  async function mode(m: string) {
    if (m === 'live' && !confirm('Switch to LIVE? Customers will be charged real money.')) return;
    const r = await call('PATCH', '/admin/settings/payment-mode', {mode: m, ...(m === 'live' && {confirmLive: true})});
    setMsg(r.ok ? `Mode is now ${m}.` : r.error.message); reload();
  }
  return (
    <div className="stack">
      <h1>Payments setup</h1>
      <div className="card stack">
        <h2>Mode: <span className="badge">{p.mode}</span></h2>
        <p className="small">Mock = simulator for development (no money). Test = Razorpay test keys / PayPal sandbox (no real money). Live = real payments — needs live credentials, reviewed tax settings, and the go-live approval flag on the server{p.liveUnlockedByServer ? ' (unlocked)' : ' (currently locked)'}.</p>
        <div className="row">{['mock', 'test', 'live'].map((m) => <button key={m} className={`btn small ${p.mode === m ? '' : 'ghost'}`} onClick={() => mode(m)} disabled={p.mode === m}>{m}</button>)}</div>
        {msg && <p className="small" role="status">{msg}</p>}
      </div>

      <div className="card stack">
        <h2>Razorpay (India: UPI, cards, netbanking, wallets)</h2>
        <ol className="small">
          <li>Sign in at dashboard.razorpay.com. Use <strong>Test mode</strong> first; switch to Live only after Razorpay approves your KYC.</li>
          <li>Account &amp; Settings → API Keys → Generate key. Copy the <strong>Key Id</strong> (starts rzp_test_ or rzp_live_) and <strong>Key Secret</strong> into the form below.</li>
          <li>Account &amp; Settings → Webhooks → Add new webhook. URL: <code>{p.webhookUrls.razorpay}</code>. Create a long random secret and paste the same secret below. Tick events: <code>payment.authorized, payment.captured, payment.failed, order.paid, refund.processed, refund.failed</code>.</li>
          <li>Payment capture: “Automatic” is recommended. If you keep it manual, the system captures authorised payments itself.</li>
          <li>Test with Razorpay’s test cards/UPI in Test mode, then repeat the setup in Live mode with live keys and a separate live webhook secret.</li>
        </ol>
        <p className="small">Test: key {p.keys.razorpay.test.keyId ?? '—'} · secret {tick(p.keys.razorpay.test.keySecret)} · webhook {tick(p.keys.razorpay.test.webhookSecret)} &nbsp;|&nbsp; Live: key {p.keys.razorpay.live.keyId ?? '—'} · secret {tick(p.keys.razorpay.live.keySecret)} · webhook {tick(p.keys.razorpay.live.webhookSecret)}</p>
        <SpecForm idPrefix="rzp" initial={{environment: 'test'}} submitLabel="Save Razorpay credentials" specs={[{key: 'environment', label: 'Environment', type: 'select', options: [['test', 'Test'], ['live', 'Live']]}, {key: 'keyId', label: 'Key Id', type: 'text'}, {key: 'keySecret', label: 'Key Secret (leave blank to keep)', type: 'text'}, {key: 'webhookSecret', label: 'Webhook secret (leave blank to keep)', type: 'text'}]}
          onSubmit={async (v) => { const r = await call('PATCH', '/admin/settings/payment-keys', {provider: 'razorpay', environment: v['environment'], ...Object.fromEntries(['keyId', 'keySecret', 'webhookSecret'].filter((k) => v[k]).map((k) => [k, v[k]]))}); if (r.ok) reload(); return r; }} />
      </div>

      <div className="card stack">
        <h2>PayPal (overseas customers, USD)</h2>
        <div className="alert info small">PayPal does not process domestic Indian payments, so it is offered to customers abroad and charges in USD at the rate you set in Settings → International{data.values.international ? '' : ' (not set yet — PayPal stays hidden until it is)'}. Your PayPal business account must be approved for receiving international payments.</div>
        <ol className="small">
          <li>Go to developer.paypal.com → Apps &amp; Credentials. Start in <strong>Sandbox</strong>; create a REST app and copy its <strong>Client ID</strong> and <strong>Secret</strong> below (environment “test”).</li>
          <li>Inside the app → Webhooks → Add webhook. URL: <code>{p.webhookUrls.paypal}</code>. Events: <code>CHECKOUT.ORDER.APPROVED, PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.DENIED, PAYMENT.CAPTURE.PENDING, PAYMENT.CAPTURE.REFUNDED</code>. Copy the <strong>Webhook ID</strong> below — PayPal signatures are verified with it.</li>
          <li>Test with a sandbox buyer account. For Live, switch the toggle to Live in the developer dashboard, create a live app and webhook, and save them with environment “live”.</li>
          <li>How payment is confirmed: the buyer approves in PayPal’s window, then our server captures the payment directly with PayPal and the webhook confirms it. The browser is never trusted.</li>
        </ol>
        <p className="small">Sandbox: client {p.keys.paypal.test.clientId ?? '—'} · secret {tick(p.keys.paypal.test.clientSecret)} · webhook {tick(p.keys.paypal.test.webhookId)} &nbsp;|&nbsp; Live: client {p.keys.paypal.live.clientId ?? '—'} · secret {tick(p.keys.paypal.live.clientSecret)} · webhook {tick(p.keys.paypal.live.webhookId)}</p>
        <SpecForm idPrefix="pp" initial={{environment: 'test'}} submitLabel="Save PayPal credentials" specs={[{key: 'environment', label: 'Environment', type: 'select', options: [['test', 'Sandbox'], ['live', 'Live']]}, {key: 'clientId', label: 'Client ID', type: 'text'}, {key: 'clientSecret', label: 'Secret (leave blank to keep)', type: 'text'}, {key: 'webhookId', label: 'Webhook ID', type: 'text'}]}
          onSubmit={async (v) => { const r = await call('PATCH', '/admin/settings/payment-keys', {provider: 'paypal', environment: v['environment'], ...Object.fromEntries(['clientId', 'clientSecret', 'webhookId'].filter((k) => v[k]).map((k) => [k, v[k]]))}); if (r.ok) reload(); return r; }} />
      </div>
    </div>
  );
}
