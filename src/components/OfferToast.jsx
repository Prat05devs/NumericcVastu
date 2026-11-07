'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useMemo, useState} from 'react';
import LocalizedContent from '../i18n/LocalizedContent';
import {promoFor, reportOffer} from '../data/offers';
import {useSales} from './SaleProvider';
import Price from './Price';

const SEEN = 'nv-offer-toast'; // per browser session: 'closed' once dismissed
const HIDE_ON = ['/checkout', '/my-report', '/book-consultation'];
const left = (end, now) => {
  const ms = Math.max(0, new Date(end).getTime() - now);
  const d = Math.floor(ms / 86_400_000), h = Math.floor((ms % 86_400_000) / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
  return d ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
};

/**
 * Corner offer card, the way large stores announce a running sale: slides in after a short pause or a third of the
 * page, alternates between offers, closes to a small "Offers" tab and does not pop up again in the same session.
 * Shows only real offers: a running website sale (back office) and the report's own promotion.
 */
export default function OfferToast() {
  const path = usePathname();
  const sales = useSales();
  const [now, setNow] = useState(0);
  const [state, setState] = useState('hidden'); // hidden | open | tab
  const [i, setI] = useState(0);
  const sale = sales.find((s) => new Date(s.endsAt).getTime() > (now || Date.now()));
  const reportPromo = now ? promoFor(reportOffer, new Date(now)) : null;
  const offers = useMemo(() => [
    sale && {key: 'sale', tag: sale.name, title: sale.rule?.type === 'PERCENT' ? `${sale.rule.percentBp / 100}% off consultations and courses` : 'Festival prices on consultations and courses', ends: sale.endsAt, href: '/consultations', cta: 'See the offers'},
    reportPromo && {key: 'report', tag: reportPromo.label, title: 'Your complete numerology report', price: true, href: '/numerology-calculator#full-report', cta: 'Get my report'},
  ].filter(Boolean), [sale, reportPromo]);
  const hidden = HIDE_ON.some((p) => path?.startsWith(p));

  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (hidden || !offers.length) return;
    let closed = false;
    try { closed = sessionStorage.getItem(SEEN) === 'closed'; } catch {}
    if (closed) { setState('tab'); return; }
    const open = () => setState((s) => (s === 'hidden' ? 'open' : s));
    const timer = setTimeout(open, 6000);
    const onScroll = () => { if (window.scrollY > document.documentElement.scrollHeight * 0.33 - window.innerHeight) open(); };
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => { clearTimeout(timer); window.removeEventListener('scroll', onScroll); };
  }, [hidden, offers.length]);
  useEffect(() => {
    if (state !== 'open' || offers.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % offers.length), 7000);
    return () => clearInterval(t);
  }, [state, offers.length]);

  if (hidden || !offers.length || state === 'hidden') return null;
  const close = () => { setState('tab'); try { sessionStorage.setItem(SEEN, 'closed'); } catch {} };
  if (state === 'tab') return <LocalizedContent><button type="button" className="ot-tab" onClick={() => setState('open')} aria-label="Show current offers"><span aria-hidden="true">🎁</span> Offers</button></LocalizedContent>;
  const o = offers[i % offers.length];
  return <LocalizedContent><aside className="ot" role="complementary" aria-label="Current offer" aria-live="polite">
    <button type="button" className="ot-x" onClick={close} aria-label="Close offer">×</button>
    <span className="ot-tag">{o.tag}</span>
    <b className="ot-title">{o.title}</b>
    {o.price && <span className="ot-price"><Price offer={reportOffer}/></span>}
    {o.ends && <span className="ot-ends">Ends in <strong>{left(o.ends, now)}</strong></span>}
    <Link className="ot-cta" href={o.href} onClick={close}>{o.cta} →</Link>
    {offers.length > 1 && <span className="ot-dots" aria-hidden="true">{offers.map((x, k) => <i key={x.key} className={k === i % offers.length ? 'on' : ''}/>)}</span>}
  </aside></LocalizedContent>;
}
