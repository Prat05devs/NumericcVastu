'use client';
import {useEffect, useMemo, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight, Check, Copy, Pencil} from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import {buildMessage, whatsappUrl} from '../lib/whatsapp';
import {useCurrency} from '../lib/useCurrency';

const TIMES = ['Morning', 'Afternoon', 'Evening', 'Any time'];
const LANGUAGES = ['Hindi', 'English', 'Either'];
const LEVELS = ['Complete beginner', 'I know the basics', 'Already practising'];
const COURSE_GOALS = ['Understand numerology for myself', 'Start consulting professionally', 'Add numerology to my current practice', 'Build a personal brand as a numerologist'];
const KINDS = [['consultation', 'Book a consultation'], ['course', 'Join a course'], ['question', 'Just a question']];
const STEPS = ['What you need', 'About you', 'Send'];

function Chips({options, value, onChange, multi = false, label}) {
  const on = (o) => (multi ? value.includes(o) : value === o);
  const toggle = (o) => onChange(multi ? (on(o) ? value.filter((v) => v !== o) : [...value, o]) : on(o) ? '' : o);
  return <div className="eq-chips" role="group" aria-label={label}>
    {options.map((o) => <button key={o} type="button" aria-pressed={on(o)} className={on(o) ? 'is-on' : ''} onClick={() => toggle(o)}>{multi && on(o) && <Check size={14}/>}{o}</button>)}
  </div>;
}

/**
 * Three-step enquiry that ends in WhatsApp: the visitor picks a session or course, adds a few details,
 * reviews (and can edit) a pre-written message, then sends it from their own WhatsApp. Nothing is stored
 * on a server; the conversation continues on WhatsApp.
 */
export default function EnquiryFlow({consultations, courses, scenarios, number, initialId = '', initialSituation = null}) {
  const initial = consultations.find((o) => o.id === initialId) ? 'consultation' : courses.find((o) => o.id === initialId) ? 'course' : 'consultation';
  const [kind, setKind] = useState(initial);
  const [offerId, setOfferId] = useState(initialId || '');
  const [step, setStep] = useState(initialId ? 1 : 0);
  const [form, setForm] = useState({name: '', dob: '', city: '', time: '', language: '', level: '', situations: [], note: ''});
  const [message, setMessage] = useState('');
  const [edited, setEdited] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const root = useRef(null);
  const shownStep = useRef(step);
  // Move focus to the new step so keyboard and screen-reader users land on it (and focus is never lost to <body>).
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    root.current?.querySelector('.eq-panel')?.focus({preventScroll: true});
  }, [step]);

  const currency = useCurrency();
  const list = (kind === 'course' ? courses : kind === 'consultation' ? consultations : []).map((o) => ({...o, priceLabel: o.priceLabels[currency]}));
  const offer = list.find((o) => o.id === offerId) || null;
  const suggestions = kind === 'course' ? COURSE_GOALS : kind === 'consultation' && offer ? scenarios[offer.id] || [] : [];
  const set = (key) => (value) => setForm((f) => ({...f, [key]: value}));

  // A scenario clicked in the Consultations slider arrives pre-ticked.
  useEffect(() => {
    if (initialSituation !== null && offer && scenarios[offer.id]?.[initialSituation]) setForm((f) => ({...f, situations: [scenarios[offer.id][initialSituation]]}));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const draft = useMemo(() => buildMessage({kind, offer, ...form}), [kind, offer, form]);
  useEffect(() => { if (!edited) setMessage(draft); }, [draft, edited]);

  function chooseKind(k) {
    setKind(k);
    setOfferId('');
    setForm((f) => ({...f, situations: [], level: '', time: k === 'consultation' ? f.time : ''}));
  }
  function next(event) {
    event.preventDefault();
    if (step === 0 && kind !== 'question' && !offer) return;
    setStep((s) => Math.min(2, s + 1));
    document.getElementById('enquiry')?.scrollIntoView({behavior: 'smooth', block: 'start'});
  }
  async function copy() {
    try { await navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { document.getElementById('eq-message')?.select(); }
  }

  return <div className="eq" id="enquiry" ref={root}>
    <ol className="eq-steps" aria-label="Progress">
      {STEPS.map((label, i) => <li key={label} className={i === step ? 'is-current' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>
        <button type="button" disabled={i > step} onClick={() => i < step && setStep(i)}><span>{i < step ? <Check size={14}/> : i + 1}</span>{label}</button>
      </li>)}
    </ol>

    {step === 0 && <form className="eq-panel" tabIndex={-1} onSubmit={next}>
      <h3>What can Adarshh help you with?</h3>
      <div className="eq-kinds" role="radiogroup" aria-label="Type of enquiry">
        {KINDS.map(([k, label]) => <button key={k} type="button" role="radio" aria-checked={kind === k} className={kind === k ? 'is-on' : ''} onClick={() => chooseKind(k)}>{label}</button>)}
      </div>
      {kind !== 'question' && <>
        <label className="eq-label" htmlFor="eq-offer">{kind === 'course' ? 'Which course?' : 'Which consultation?'}</label>
        <select id="eq-offer" className="eq-input" value={offerId} onChange={(e) => setOfferId(e.target.value)} required>
          <option value="" disabled>Choose one</option>
          {list.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.priceLabel}</option>)}
        </select>
        {offer && <div className="eq-offer"><strong>{offer.name}</strong><span>{offer.priceLabel}</span><p>{offer.summary}</p></div>}
        {kind === 'consultation' && <p className="eq-hint">Not sure which one? <a href="/consultations">See which situation matches yours</a>.</p>}
      </>}
      <div className="eq-actions"><span/><button type="submit" className="hv-button" disabled={kind !== 'question' && !offer}>Continue <ArrowRight size={17}/></button></div>
    </form>}

    {step === 1 && <form className="eq-panel" tabIndex={-1} onSubmit={next}>
      {offer && <div className="eq-chosen"><div><small>{kind === 'course' ? 'Course' : 'Consultation'}</small><strong>{offer.name}</strong></div><button type="button" onClick={() => setStep(0)}><Pencil size={14}/> Change</button></div>}
      <div className="eq-grid">
        <div className="eq-field"><label className="eq-label" htmlFor="eq-name">Your name</label><input id="eq-name" className="eq-input" required autoComplete="name" maxLength={80} value={form.name} onChange={(e) => set('name')(e.target.value)} placeholder="Full name"/></div>
        <div className="eq-field"><label className="eq-label" htmlFor="eq-dob">Date of birth <span>(optional)</span></label><input id="eq-dob" className="eq-input" type="date" min="1900-01-01" max={today} value={form.dob} onChange={(e) => set('dob')(e.target.value)}/></div>
        <div className="eq-field"><label className="eq-label" htmlFor="eq-city">City <span>(optional)</span></label><input id="eq-city" className="eq-input" autoComplete="address-level2" maxLength={60} value={form.city} onChange={(e) => set('city')(e.target.value)} placeholder="e.g. Delhi"/></div>
      </div>
      {kind === 'course' && <><p className="eq-label">Your current level</p><Chips label="Your current level" options={LEVELS} value={form.level} onChange={set('level')}/></>}
      {kind === 'consultation' && <><p className="eq-label">Best time for a call</p><Chips label="Best time for a call" options={TIMES} value={form.time} onChange={set('time')}/></>}
      <p className="eq-label">Preferred language</p>
      <Chips label="Preferred language" options={LANGUAGES} value={form.language} onChange={set('language')}/>
      {suggestions.length > 0 && <><p className="eq-label">{kind === 'course' ? 'What do you want from the course?' : 'Does any of this sound like you?'} <span>(tap all that apply)</span></p>
        <Chips multi label="Situations" options={suggestions} value={form.situations} onChange={set('situations')}/></>}
      <label className="eq-label" htmlFor="eq-note">{kind === 'question' ? 'Your question' : 'Anything else?'} {kind !== 'question' && <span>(optional)</span>}</label>
      <textarea id="eq-note" className="eq-input" rows={3} maxLength={800} required={kind === 'question'} value={form.note} onChange={(e) => set('note')(e.target.value)} placeholder={kind === 'question' ? 'Ask anything about consultations, courses or numerology' : 'A line about your situation helps Adarshh prepare'}/>
      <p className="eq-hint">No need to type your phone number: WhatsApp shares it with Adarshh when you send.</p>
      <div className="eq-actions"><button type="button" className="hv-link" onClick={() => setStep(0)}><ArrowLeft size={16}/> Back</button><button type="submit" className="hv-button">Preview message <ArrowRight size={17}/></button></div>
    </form>}

    {step === 2 && <div className="eq-panel" tabIndex={-1}>
      <h3>Your message is ready</h3>
      <p className="eq-sub">Check it, add anything you like, then open WhatsApp and press <b>Send</b>.</p>
      <div className="eq-bubble">
        <label className="eq-label" htmlFor="eq-message">Message to Adarshh</label>
        <textarea id="eq-message" className="eq-input eq-message" rows={12} value={message} onChange={(e) => { setMessage(e.target.value); setEdited(true); }}/>
        {edited && <button type="button" className="eq-reset" onClick={() => setEdited(false)}>Undo my edits</button>}
      </div>
      <a className="hv-button eq-send" href={whatsappUrl(number, message)} target="_blank" rel="noopener noreferrer" onClick={() => setSent(true)}><WhatsAppIcon size={22}/> Open WhatsApp and send</a>
      {sent && <div className="eq-sent" role="status"><Check size={18}/><div><b>WhatsApp should now be open with your message.</b> Press Send there and Adarshh will reply to confirm the time and next steps. WhatsApp didn’t open? Copy the message and send it to <b>+{number.slice(0, 2)} {number.slice(2, 7)} {number.slice(7)}</b>.</div></div>}
      <div className="eq-actions"><button type="button" className="hv-link" onClick={() => setStep(1)}><ArrowLeft size={16}/> Edit details</button><button type="button" className="eq-copy" onClick={copy}>{copied ? <><Check size={16}/> Copied</> : <><Copy size={16}/> Copy message</>}</button></div>
    </div>}
  </div>;
}
