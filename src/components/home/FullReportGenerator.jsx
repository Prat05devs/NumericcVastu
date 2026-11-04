'use client';
import LocalizedContent from '../../i18n/LocalizedContent';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight, FileText, Lock, ShieldCheck} from 'lucide-react';
import Price from '../Price';
import {reportOffer} from '../../data/offers';
import {reportStyles} from '../../lib/reportStyles';
import {useCurrency} from '../../lib/useCurrency';

/**
 * The paid report (₹399 / $10). The visitor pays in Razorpay's window; the server verifies the payment and issues a
 * pass, and the PDF opens in a new tab (app/api/report/*, pages/api/report/pdf.js) where it can be read and
 * downloaded. The pass is kept in this browser so the report can be reopened, in either language, without paying again.
 */
const STORE = 'nv-report-passes';
const keyFor = (inputs) => [inputs.dob, inputs.gender, inputs.name.toLowerCase(), inputs.phone, inputs.partnerDob, inputs.relationshipStatus].join('|');
const savedPasses = () => { try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; } };
const savePass = (key, value) => { try { localStorage.setItem(STORE, JSON.stringify({...savedPasses(), [key]: value})); } catch {} };
const loadRazorpay = () => window.Razorpay ? Promise.resolve() : new Promise((resolve, reject) => {
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = resolve;
  script.onerror = () => reject(new Error('Could not load the payment window. Check your connection and try again.'));
  document.body.appendChild(script);
});
const INCLUDED = ['19 chapters in a PDF, in English and Hindi', 'Lo Shu and Vedic grids, name and phone numbers', 'Every missing number with its remedies', 'Your Maha Dasha, six years ahead and an action plan', 'A clickable contents page'];

export default function FullReportGenerator({chart, gender, readingHref}) {
  const currency = useCurrency();
  const name = chart.nameAnalysis?.name || '';
  const phone = chart.phoneAnalysis?.digits || '';
  const [partnerDob, setPartnerDob] = useState('');
  const [relationshipStatus, setRelationshipStatus] = useState('unspecified');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState(null);
  const [status, setStatus] = useState({state: 'idle', message: ''});
  const now = new Date();
  const maxDob = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const inputs = {dob: `${chart.year}-${String(chart.month).padStart(2, '0')}-${String(chart.day).padStart(2, '0')}`, gender: gender || '', name, phone, partnerDob, relationshipStatus};
  const key = keyFor(inputs);
  useEffect(() => { setPass(savedPasses()[key] || null); }, [key]);

  const open = (lang) => window.open(`/api/report/pdf?pass=${encodeURIComponent(pass.pass)}&lang=${lang}`, '_blank', 'noopener');

  async function pay(event) {
    event.preventDefault();
    if (!name || !phone) return;
    setStatus({state: 'busy', message: 'Opening secure payment…'});
    try {
      await loadRazorpay();
      const res = await fetch('/api/report/order', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({...inputs, email})});
      const order = await res.json();
      if (!res.ok) throw new Error(order.error || 'Could not start the payment.');
      const rzp = new window.Razorpay({
        key: order.keyId, order_id: order.orderId, amount: order.amount, currency: order.currency,
        name: 'NumericcVaastu', description: reportOffer.name, image: '/images/logo-nv.png',
        prefill: {name, email, contact: phone}, theme: {color: '#4a1f7a'},
        modal: {ondismiss: () => setStatus({state: 'idle', message: 'Payment window closed. You can try again whenever you are ready.'})},
        handler: async (payment) => {
          setStatus({state: 'busy', message: 'Confirming your payment…'});
          const check = await fetch('/api/report/access', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({...payment, binding: order.binding, currency: order.currency, inputs})}).then((r) => r.json()).catch(() => ({}));
          if (!check.pass) { setStatus({state: 'error', message: check.error || `We could not confirm the payment. Contact us with payment ID ${payment.razorpay_payment_id} and we will send your report.`}); return; }
          const value = {pass: check.pass, paymentId: check.paymentId};
          savePass(key, value); setPass(value);
          setStatus({state: 'done', message: 'Payment received. Your report is ready: open it below in English or Hindi.'});
        },
      });
      rzp.on('payment.failed', (e) => setStatus({state: 'error', message: `Payment failed: ${e.error?.description || 'please try again or use another method.'} No money is taken for a failed payment.`}));
      rzp.open();
      setStatus({state: 'idle', message: ''});
    } catch (error) {
      setStatus({state: 'error', message: error.message});
    }
  }

  return <LocalizedContent><section className="fr-generator" id="full-report" data-report-product="combined-numerology-report" aria-labelledby="r-full">
    <style>{reportStyles}</style>
    <span className="hv-eyebrow">Complete numerology report · PDF</span>
    <h3 id="r-full">Your complete report, <em>in one PDF.</em></h3>
    <p>Both methods in one personal report: Lo Shu and Vedic readings, name and phone analysis, strengths, career and relationship themes, your Maha Dasha, six years ahead, remedies for every missing number and a 7, 30 and 90-day action plan.</p>
    <ul className="fr-included">{INCLUDED.map((item) => <li key={item}><FileText size={16} aria-hidden="true"/>{item}</li>)}</ul>
    {pass ? <div className="fr-ready" role="status">
      <p><b>Your report is ready.</b> It opens in a new tab, where you can read it and download the PDF.</p>
      <div className="fr-toolbar"><button className="hv-button hv-button--gold" type="button" onClick={() => open('en')}>Open my report (English PDF) <ArrowUpRight size={18}/></button><button className="hv-button" type="button" onClick={() => open('hi')}><span lang="hi" translate="no">हिंदी PDF खोलें</span> <ArrowUpRight size={18}/></button></div>
      <p className="fr-status">Payment ID: <span translate="no">{pass.paymentId}</span>. Keep it for your records; this browser remembers your report.</p>
    </div> : <form onSubmit={pay}>
      {name && phone ? <p>Your report uses the name and phone number from your calculation above.</p> : <p>Enter your name and phone number in the calculator above, then choose Show my numbers.</p>}
      <label htmlFor="nv-relationship-status">Your relationship context <span>(optional)</span></label>
      <select id="nv-relationship-status" value={relationshipStatus} onChange={(e) => setRelationshipStatus(e.target.value)} aria-describedby="nv-relationship-hint"><option value="unspecified">Show both possibilities</option><option value="single">Single · open to a connection</option><option value="developing">Getting to know someone</option><option value="committed">In a committed relationship</option></select>
      <small id="nv-relationship-hint">Chooses the focus of your love-life chapter.</small>
      <label htmlFor="nv-partner-dob">Second person’s date of birth <span>(optional)</span></label>
      <input id="nv-partner-dob" type="date" min="1900-01-01" max={maxDob} value={partnerDob} onChange={(e) => setPartnerDob(e.target.value)} aria-describedby="nv-partner-hint"/>
      <small id="nv-partner-hint">Add a partner’s date for a two-person number comparison.</small>
      <label htmlFor="nv-report-email">Email for your receipt <span>(optional)</span></label>
      <input id="nv-report-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}/>
      <p className="fr-price"><b><Price offer={reportOffer}/></b> · one-time payment</p>
      <button className="hv-button hv-button--gold" type="submit" disabled={!name || !phone || status.state === 'busy'}><Lock size={18}/> {status.state === 'busy' ? 'Please wait…' : `Pay ${currency === 'USD' ? '$10' : '₹399'} and get my report`}</button>
      <p className="fr-status"><ShieldCheck size={16} aria-hidden="true"/> Secure payment by Razorpay. Your report opens straight after payment.</p>
    </form>}
    {status.message && <p className={status.state === 'error' ? 'fr-error' : 'fr-status'} role={status.state === 'error' ? 'alert' : 'status'}>{status.message}</p>}
    <Link className="hv-link" href={readingHref}>Prefer a personal reading? Book a session with Adarshh <ArrowUpRight size={16}/></Link>
  </section></LocalizedContent>;
}
