'use client';
import LocalizedContent from '../i18n/LocalizedContent';
import {useState} from 'react';
import {ArrowUpRight} from 'lucide-react';

const STORE = 'nv-report-passes';
const remember = (value) => { try { const all = JSON.parse(localStorage.getItem(STORE) || '{}'); localStorage.setItem(STORE, JSON.stringify({...all, [`recovered|${value.paymentId}`]: value})); } catch {} };
export const openReport = (pass, lang) => window.open(`/my-report/open?pass=${encodeURIComponent(pass)}&lang=${lang}`, '_blank', 'noopener');

/** "Already paid? Get your report": payment ID + phone number → the report, on any device. */
export default function ReportRecovery({compact = false}) {
  const [paymentId, setPaymentId] = useState('');
  const [phone, setPhone] = useState('');
  const [found, setFound] = useState(null);
  const [status, setStatus] = useState({state: 'idle', message: ''});
  async function submit(event) {
    event.preventDefault();
    setStatus({state: 'busy', message: 'Checking your payment…'});
    const res = await fetch('/api/report/recover', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({paymentId: paymentId.trim(), phone})}).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok || !data.pass) { setStatus({state: 'error', message: data.error || 'Something went wrong. Please try again.'}); return; }
    const value = {pass: data.pass, paymentId: data.paymentId};
    remember(value); setFound({...value, name: data.name});
    setStatus({state: 'done', message: ''});
  }
  return <LocalizedContent><div className={compact ? 'fr-recover is-compact' : 'fr-recover'}>
    {found ? <div className="fr-ready" role="status">
      <p><b>Report found for</b> <span translate="no">{found.name}</span>. It opens in a new tab, where you can read it and download the PDF.</p>
      <div className="fr-toolbar"><button className="hv-button hv-button--gold" type="button" onClick={() => openReport(found.pass, 'en')}>Open my report (English PDF) <ArrowUpRight size={18}/></button><button className="hv-button" type="button" onClick={() => openReport(found.pass, 'hi')}><span lang="hi" translate="no">हिंदी PDF खोलें</span> <ArrowUpRight size={18}/></button></div>
    </div> : <form onSubmit={submit}>
      <label htmlFor="nv-recover-payment">Payment ID</label>
      <input id="nv-recover-payment" value={paymentId} onChange={(e) => setPaymentId(e.target.value)} placeholder="pay_…" autoComplete="off" required aria-describedby="nv-recover-hint"/>
      <small id="nv-recover-hint">Shown after payment, and in Razorpay’s SMS or email to you. It starts with pay_.</small>
      <label htmlFor="nv-recover-phone">Your WhatsApp number, or the phone number in the report</label>
      <input id="nv-recover-phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required/>
      <button className="hv-button hv-button--gold" type="submit" disabled={status.state === 'busy'}>{status.state === 'busy' ? 'Please wait…' : 'Get my report'}</button>
    </form>}
    {status.message && <p className={status.state === 'error' ? 'fr-error' : 'fr-status'} role={status.state === 'error' ? 'alert' : 'status'}>{status.message}</p>}
  </div></LocalizedContent>;
}
