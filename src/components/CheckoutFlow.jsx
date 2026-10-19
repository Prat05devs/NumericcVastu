'use client';
import {useEffect, useMemo, useRef, useState} from 'react';
import Link from 'next/link';
import {ArrowLeft, ArrowRight, Check, CreditCard, Lock, Pencil, ShieldCheck} from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import {whatsappUrl} from '../lib/whatsapp';

const STEPS = ['Your details', 'Reading details', 'Review & pay'];
const today = () => new Date().toISOString().slice(0, 10);
const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const fmtDate = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'}) : '');
const show = (f, v) => (f.type === 'date' ? fmtDate(v) : v);

function Field({f, value, onChange}) {
  if (f.type === 'heading') return <h4 className="co-subhead">{f.label}</h4>;
  if (f.type === 'note') return <p className="co-note">{f.label}</p>;
  const id = `co-${f.name}`;
  const common = {id, name: f.name, required: f.required, value: value || '', onChange: (e) => onChange(f.name, e.target.value)};
  return <div className={f.half ? 'co-field is-half' : 'co-field'}>
    <label htmlFor={id}>{f.label}{!f.required && f.type !== 'textarea' && !f.hint?.startsWith('Optional') && <span> (optional)</span>}</label>
    {f.type === 'select'
      ? <select {...common}><option value="" disabled>Choose</option>{f.options.map((o) => <option key={o}>{o}</option>)}</select>
      : f.type === 'textarea'
        ? <textarea {...common} rows={3} maxLength={600} placeholder={f.placeholder}/>
        : <input {...common} type={f.type} placeholder={f.placeholder} maxLength={f.type === 'text' ? 120 : undefined}
          min={f.type === 'date' ? (f.future ? tomorrow() : '1900-01-01') : undefined} max={f.type === 'date' && !f.future ? (f.name === 'babyDob' ? undefined : today()) : undefined}/>}
    {f.hint && <small>{f.hint}</small>}
  </div>;
}

/**
 * Checkout: contact + session preferences, the reading details numerologists need, then review and payment.
 * Payment runs through Razorpay Standard Checkout: the server creates the order (price from the catalogue),
 * the visitor pays in Razorpay's window, and the server verifies the signature before confirming.
 */
export default function CheckoutFlow({offer, intake, sessionFields, payment, whatsapp, termsHref}) {
  const storeKey = `nv-checkout-${offer.id}`;
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({});
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState({state: 'idle', message: ''});
  const panel = useRef(null);
  const [ready, setReady] = useState(false);

  // Keep a draft in this browser tab so a refresh or a back-click loses nothing.
  useEffect(() => {
    try { const saved = JSON.parse(sessionStorage.getItem(storeKey) || 'null'); if (saved) setValues(saved); } catch {}
    setReady(true);
  }, [storeKey]);
  // Save only after the draft has been restored, so the empty first render never overwrites it.
  useEffect(() => { if (ready) try { sessionStorage.setItem(storeKey, JSON.stringify(values)); } catch {} }, [values, ready, storeKey]);
  // On step changes (not the first load), bring the new step into view and give it keyboard focus.
  const shownStep = useRef(0);
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    panel.current?.focus({preventScroll: true});
    window.scrollTo({top: 0, behavior: 'smooth'});
  }, [step]);

  const set = (name, v) => setValues((s) => ({...s, [name]: v}));
  const contactFields = [
    {name: 'name', label: 'Your name', type: 'text', required: true, half: true, placeholder: 'Full name'},
    {name: 'phone', label: 'Mobile / WhatsApp number', type: 'tel', required: true, half: true, placeholder: '+91 98xxxxxxxx'},
    {name: 'email', label: 'Email', type: 'email', required: true, half: true, placeholder: 'For your receipt'},
    {name: 'city', label: 'City', type: 'text', required: true, half: true, placeholder: 'e.g. Delhi'},
  ];
  const stepFields = [[...contactFields, ...(offer.kind === 'consultation' ? sessionFields : [])], intake.fields, []];
  const allFields = [...stepFields[0], ...stepFields[1]].filter((f) => f.type !== 'heading' && f.type !== 'note');
  const details = useMemo(() => Object.fromEntries(allFields.filter((f) => !contactFields.some((c) => c.name === f.name) && values[f.name]).map((f) => [f.name, show(f, values[f.name])])), [values]); // eslint-disable-line react-hooks/exhaustive-deps

  function next(event) {
    event.preventDefault();
    if (step === 0 && !/^\+?[0-9 ]{10,15}$/.test((values.phone || '').trim())) { setStatus({state: 'error', message: 'Please enter a valid mobile number, for example +91 98765 43210.'}); return; }
    setStatus({state: 'idle', message: ''});
    setStep((s) => s + 1);
  }

  const summaryText = (paymentId) => {
    const lines = ['Namaste Adarshh ji 🙏', '', paymentId ? `I have booked the *${offer.name}* (${offer.priceLabel}). Payment ID: ${paymentId}` : `I would like to book the *${offer.name}* (${offer.priceLabel}).`, ''];
    lines.push(`*Name:* ${values.name}`, `*Phone:* ${values.phone}`, `*Email:* ${values.email}`, `*City:* ${values.city}`, '');
    for (const f of allFields) if (!contactFields.some((c) => c.name === f.name) && values[f.name]) lines.push(`*${f.label.replace(/\?$/, '')}:* ${show(f, values[f.name])}`);
    lines.push('', '— Sent from numericcvaastu.com');
    return lines.join('\n');
  };

  async function pay() {
    if (!agreed) { setStatus({state: 'error', message: 'Please accept the terms to continue.'}); return; }
    setStatus({state: 'busy', message: 'Opening secure payment…'});
    try {
      if (!window.Razorpay) await new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.onload = resolve; s.onerror = () => reject(new Error('Could not load Razorpay. Check your connection and try again.')); document.body.appendChild(s); });
      const res = await fetch('/api/checkout/order', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({offerId: offer.id, customer: {name: values.name, email: values.email, phone: values.phone, city: values.city}, details})});
      const order = await res.json();
      if (!res.ok) throw new Error(order.error || 'Could not start the payment.');
      const rzp = new window.Razorpay({
        key: order.keyId, order_id: order.orderId, amount: order.amount, currency: order.currency,
        name: 'NumericcVaastu', description: offer.name, image: '/images/logo-nv.png',
        prefill: {name: values.name, email: values.email, contact: values.phone.replace(/\s/g, '')},
        notes: {offer: offer.name}, theme: {color: '#4a1f7a'},
        modal: {ondismiss: () => setStatus({state: 'idle', message: 'Payment window closed. Your details are saved; you can try again.'})},
        handler: async (r) => {
          setStatus({state: 'busy', message: 'Confirming your payment…'});
          const v = await fetch('/api/checkout/verify', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(r)}).then((x) => x.json()).catch(() => ({verified: false}));
          try { sessionStorage.setItem('nv-last-booking', JSON.stringify({offer: offer.name, kind: offer.kind, price: offer.priceLabel, paymentId: r.razorpay_payment_id, orderId: r.razorpay_order_id, verified: v.verified, message: summaryText(r.razorpay_payment_id)})); sessionStorage.removeItem(storeKey); } catch {}
          window.location.href = `/checkout/success?status=${v.verified ? 'paid' : 'check'}`;
        },
      });
      rzp.on('payment.failed', (e) => setStatus({state: 'error', message: `Payment failed: ${e.error?.description || 'please try again or use another method.'} No money was taken for a failed payment.`}));
      rzp.open();
      setStatus({state: 'idle', message: ''});
    } catch (e) {
      setStatus({state: 'error', message: e.message});
    }
  }

  return <div className="co">
    <ol className="co-steps" aria-label="Checkout progress">
      {STEPS.map((label, i) => <li key={label} className={i === step ? 'is-current' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>
        <button type="button" disabled={i >= step} onClick={() => setStep(i)}><span>{i < step ? <Check size={14}/> : i + 1}</span>{label}</button>
      </li>)}
    </ol>

    {step < 2 && <form className="co-panel" ref={panel} tabIndex={-1} onSubmit={next}>
      <h2>{step === 0 ? (offer.kind === 'consultation' ? 'Your contact details and session' : 'Your contact details') : intake.title}</h2>
      {step === 1 && <p className="co-lede">{offer.kind === 'consultation' ? 'Adarshh prepares your reading from these details before you meet. They are shared only with him and his team.' : 'This helps Adarshh place you in the right batch.'}</p>}
      <div className="co-grid">{stepFields[step].map((f) => <Field key={f.name} f={f} value={values[f.name]} onChange={set}/>)}</div>
      {status.message && <p className={status.state === 'error' ? 'co-msg is-error' : 'co-msg'} role="status">{status.message}</p>}
      <div className="co-actions">
        {step > 0 ? <button type="button" className="hv-link" onClick={() => setStep(step - 1)}><ArrowLeft size={16}/> Back</button> : <Link className="hv-link" href={offer.href}><ArrowLeft size={16}/> Back to {offer.kind}</Link>}
        <button type="submit" className="hv-button">Continue <ArrowRight size={17}/></button>
      </div>
    </form>}

    {step === 2 && <div className="co-panel" ref={panel} tabIndex={-1}>
      <h2>Review your booking</h2>
      <div className="co-review">
        {[0, 1].map((s) => <section key={s}>
          <div className="co-review__head"><h3>{STEPS[s]}</h3><button type="button" onClick={() => setStep(s)}><Pencil size={14}/> Edit</button></div>
          <dl>{stepFields[s].filter((f) => values[f.name] && f.type !== 'heading' && f.type !== 'note').map((f) => <div key={f.name}><dt>{f.label}</dt><dd>{show(f, values[f.name])}</dd></div>)}</dl>
        </section>)}
      </div>
      <label className="co-agree"><input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); if (e.target.checked) setStatus({state: 'idle', message: ''}); }}/> <span>I agree to the <Link href={termsHref.terms} target="_blank">terms</Link>, <Link href={termsHref.refund} target="_blank">refund policy</Link> and <Link href={termsHref.disclaimer} target="_blank">disclaimer</Link>, and understand that numerology offers guidance, not guaranteed outcomes.</span></label>
      {status.message && <p className={status.state === 'error' ? 'co-msg is-error' : 'co-msg'} role="status">{status.message}</p>}
      {payment.enabled
        ? <button type="button" className="hv-button hv-button--gold co-pay" onClick={pay} disabled={status.state === 'busy'}><Lock size={18}/> {status.state === 'busy' ? 'Please wait…' : `Pay ${offer.priceLabel} securely`}</button>
        : <div className="co-offline">
          <p><b>{payment.reason}</b> Send this booking to Adarshh on WhatsApp and the team will confirm your slot and share a payment link.</p>
          <a className="hv-button hv-button--whatsapp co-pay" href={agreed ? whatsappUrl(whatsapp, summaryText()) : undefined} onClick={(e) => { if (!agreed) { e.preventDefault(); setStatus({state: 'error', message: 'Please accept the terms to continue.'}); } }} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={20}/> Confirm booking on WhatsApp</a>
        </div>}
      {payment.mode === 'test' && payment.enabled && <p className="co-test">Test mode: use Razorpay test card 4111 1111 1111 1111 or UPI ID success@razorpay. No real money is charged.</p>}
      <ul className="co-trust">
        <li><ShieldCheck size={16}/> Payments processed by Razorpay</li>
        <li><CreditCard size={16}/> UPI, cards, net banking and wallets</li>
        <li><Lock size={16}/> We never see or store your card details</li>
      </ul>
      <div className="co-actions"><button type="button" className="hv-link" onClick={() => setStep(1)}><ArrowLeft size={16}/> Back</button></div>
    </div>}
  </div>;
}
