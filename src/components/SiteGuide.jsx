'use client';
import Link from 'next/link';
import {useEffect, useMemo, useRef, useState} from 'react';
import {ArrowUpRight, MessageCircleQuestion, RotateCcw, SendHorizontal, X} from 'lucide-react';
import {useCurrency} from '../lib/useCurrency';

/**
 * Floating site guide. Answers come only from `entries` (data/guide.js): quick replies walk visitors through
 * the site, and typed questions are matched by keyword. Nothing is sent anywhere and no AI is involved.
 */

const STOP = new Set('a an and are as at be by can could do does for from get go have how i im in is it its me my need of on or please show should tell that the this to want what when which who why will with would you your about numerology numericcvaastu ji hai kya ka ki ke mujhe'.split(' '));
/** Spellings and Hinglish words visitors use, mapped to the words the entries contain. */
const SAME = {vaastu: 'vastu', vasthu: 'vastu', charge: 'fee', charges: 'fee', cost: 'fee', costs: 'fee', price: 'fee', prices: 'fee', pricing: 'fee', rate: 'fee', kitna: 'fee', kitne: 'fee', paisa: 'fee', pay: 'payment', paying: 'payment', upi: 'payment', razorpay: 'payment', shaadi: 'marriage', shadi: 'marriage', vivah: 'marriage', naukri: 'job', ghar: 'home', makan: 'home', dukaan: 'shop', dukan: 'shop', naam: 'name', bachcha: 'baby', bacha: 'baby', dob: 'birth', birthday: 'birth', enroll: 'enrol', enrollment: 'enrol', admission: 'enrol', adarsh: 'adarshh', aadarsh: 'adarshh', pandey: 'panndey'};
const DATE = /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/;
const MOBILE = '(max-width: 560px)';
const OPEN_EVENT = 'nv-guide-open';
/** Opens the guide from anywhere on the page, such as the footer invitation. */
export const openSiteGuide = () => window.dispatchEvent(new Event(OPEN_EVENT));

/** A light stemmer, so “change”, “changes” and “changing” all match. */
const stem = (w) => (w.length > 4 ? w.replace(/(ing|ed|es|s|e)$/, '') : w);
const tokens = (text) => text.toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w)).map((w) => stem(SAME[w] || w));

/** Scores every entry against the question: a word in the label counts three times, in the keys twice, in the answer once; rarer words count more. */
function buildIndex(entries) {
  const docs = entries.map((e) => {
    const label = new Set(tokens(`${e.label} ${e.title || ''}`));
    const strong = new Set(tokens(e.keys || ''));
    const weak = new Set(tokens([...e.text, ...(e.list?.items || [])].join(' ')));
    return {e, label, strong, weak};
  });
  const hit = (set, w) => set.has(w) || (w.length > 3 && [...set].some((x) => x.length > 3 && (x.startsWith(w) || w.startsWith(x))));
  return (question) => {
    const scores = docs.map(() => 0);
    for (const w of new Set(tokens(question))) {
      const weights = docs.map((d) => (hit(d.label, w) ? 3 : hit(d.strong, w) ? 2 : hit(d.weak, w) ? 1 : 0));
      const idf = Math.log(1 + docs.length / (weights.filter(Boolean).length || 1));
      weights.forEach((weight, i) => { scores[i] += weight * idf; });
    }
    return docs.map((d, i) => ({e: d.e, score: scores[i]})).filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
  };
}

function Answer({entry, onLink}) {
  return <>
    {entry.title && <strong className="sg-title">{entry.title}</strong>}
    {entry.text.map((t) => <p key={t}>{t}</p>)}
    {entry.list && <>{entry.list.title && <p className="sg-list-title">{entry.list.title}</p>}<ul>{entry.list.items.map((t) => <li key={t}>{t}</li>)}</ul></>}
    {entry.links?.length > 0 && <div className="sg-links">{entry.links.map(([label, href]) => href.startsWith('/')
      ? <Link key={href} href={href} onClick={onLink}>{label}<ArrowUpRight size={14} aria-hidden="true"/></Link>
      : <a key={href} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>{label}<ArrowUpRight size={14} aria-hidden="true"/></a>)}</div>}
  </>;
}

/** Fills each ¤{offer id} in the answers with that offer's price in the visitor's currency. */
const withPrices = (entries, prices, currency) => {
  const fill = (t) => t.replace(/¤\{([\w-]+)\}/g, (_, id) => prices[id]?.[currency] || '');
  return entries.map((e) => ({...e, text: e.text.map(fill), list: e.list && {...e.list, items: e.list.items.map(fill)}}));
};

export default function SiteGuide({entries: source, prices}) {
  const currency = useCurrency();
  const entries = useMemo(() => withPrices(source, prices, currency), [source, prices, currency]);
  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const search = useMemo(() => buildIndex(entries.filter((e) => e.id !== 'more')), [entries]);
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState([{from: 'bot', id: 'start'}]);
  const [draft, setDraft] = useState('');
  const panel = useRef(null), input = useRef(null), launcher = useRef(null), scroller = useRef(null), last = useRef(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    // On phones, focusing the box would open the keyboard over the first answer.
    if (open) (window.matchMedia(MOBILE).matches ? panel : input).current?.focus({preventScroll: true});
    else if (wasOpen.current) launcher.current?.focus({preventScroll: true});
    wasOpen.current = open;
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const close = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);
  useEffect(() => {
    if (open && last.current && scroller.current) scroller.current.scrollTo({top: last.current.offsetTop - 12});
  }, [log, open]);

  const reply = (userText, message) => setLog((l) => [...l, {from: 'user', text: userText}, message]);
  // The pressed quick reply is replaced by new ones, so keep focus inside the guide.
  const choose = (id) => { reply(byId.get(id).label, {from: 'bot', id}); panel.current?.focus({preventScroll: true}); };
  const ask = (event) => {
    event.preventDefault();
    const question = draft.trim();
    if (!question) return;
    setDraft('');
    if (DATE.test(question)) return reply(question, {from: 'bot', id: 'calculator'});
    const [best, ...rest] = search(question);
    if (!best || best.score < 1.5) return reply(question, {from: 'bot', miss: true});
    reply(question, {from: 'bot', id: best.e.id, also: rest.filter((r) => r.score >= best.score * 0.7 && !r.e.hidden).slice(0, 3).map((r) => r.e.id)});
  };
  const onLink = () => { if (window.matchMedia(MOBILE).matches) setOpen(false); };
  const lastBot = log.at(-1);
  const chips = lastBot.miss ? byId.get('start').next : [...(lastBot.also || []), ...byId.get(lastBot.id).next.filter((id) => !lastBot.also?.includes(id))];

  return <>
    {!open && <button ref={launcher} type="button" className="sg-launch" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label="Ask a question about NumericcVaastu"><MessageCircleQuestion size={26} aria-hidden="true"/><span>Ask a question</span></button>}
    {open && <section ref={panel} className="sg-panel" role="dialog" aria-label="NumericcVaastu site guide" tabIndex={-1}>
      <header className="sg-head">
        <img src="/images/logo-nv.png" alt="" width="36" height="36"/>
        <div><strong>Site guide</strong><small>Answers from this website</small></div>
        <button type="button" className="sg-icon" onClick={() => setLog([{from: 'bot', id: 'start'}])} aria-label="Start over" title="Start over"><RotateCcw size={18}/></button>
        <button type="button" className="sg-icon" onClick={() => setOpen(false)} aria-label="Close site guide" title="Close"><X size={20}/></button>
      </header>
      <div ref={scroller} className="sg-log">
        <div aria-live="polite">{log.map((m, i) => <div key={i} ref={i === log.length - 1 ? last : undefined} className={m.from === 'bot' ? 'sg-msg sg-bot' : 'sg-msg sg-user'}>
          {m.from === 'user' ? <p>{m.text}</p> : m.miss
            ? <><p>I couldn’t find that on the website. Try one of the topics below, or ask Adarshh’s team directly.</p><div className="sg-links"><Link href="/book-consultation" onClick={onLink}>Ask on WhatsApp<ArrowUpRight size={14} aria-hidden="true"/></Link><Link href="/contact" onClick={onLink}>Contact details<ArrowUpRight size={14} aria-hidden="true"/></Link></div></>
            : <Answer entry={byId.get(m.id)} onLink={onLink}/>}
        </div>)}</div>
        <div className="sg-chips" role="group" aria-label="Suggested questions">
          {chips.map((id) => <button type="button" key={id} onClick={() => choose(id)}>{byId.get(id).label}</button>)}
          {lastBot.id && lastBot.id !== 'start' && <button type="button" className="sg-chip-home" onClick={() => choose('start')}>Main menu</button>}
        </div>
      </div>
      <form className="sg-form" onSubmit={ask}>
        <input ref={input} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask about fees, courses, Vastu…" aria-label="Type your question" maxLength={200} autoComplete="off" enterKeyHint="send"/>
        <button type="submit" className="sg-send" aria-label="Send question" disabled={!draft.trim()}><SendHorizontal size={20}/></button>
      </form>
    </section>}
  </>;
}
