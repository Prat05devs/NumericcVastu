'use client';
import LocalizedContent from '../i18n/LocalizedContent';

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { courses, offerCatalog, getCurrentCoursePromotion } from '../data/offers';
import { useSales } from './SaleProvider';

const featured = courses.find((offer) => offer.id === offerCatalog.featuredOfferId) || courses[0];
const courseUrl = (offer) => `/courses/${offer.slug}`;

function useOfferClock() {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return new Date(now);
}

const CRYSTAL_SHOP = 'https://numericcvaastucrystal.in/';
const WEBSITE_KINDS = {COURSE: 'courses', CONSULTATION: 'consultations', REPORT: 'the ₹399 report'};
const listJoin = (parts) => (parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0] || '');

/**
 * While a sale runs (back office → Sales & festive themes), the top bar becomes a strip that runs right to left:
 * the website offer, when it ends, the crystal shop's sale and a booking link. Pauses on hover or focus.
 */
function SaleStrip({sale, now}) {
  const r = sale.rule || {};
  const off = r.type === 'PERCENT' ? `${r.percentBp / 100}% off` : `₹${Number(r.amountPaise || 0) / 100} off`;
  const fam = r.families || [];
  const web = fam.length ? fam.filter((f) => WEBSITE_KINDS[f]).map((f) => WEBSITE_KINDS[f]) : Object.values(WEBSITE_KINDS);
  const reachesShop = !fam.length || fam.some((f) => ['RUDRAKSHA', 'GEMSTONE', 'CRYSTAL', 'YANTRA'].includes(f));
  const ends = new Date(sale.endsAt);
  const days = Math.max(0, Math.ceil((ends.getTime() - now) / 86_400_000));
  const endDate = ends.toLocaleDateString('en-IN', {day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata'});
  const items = [
    {text: `${sale.name}: ${off} all ${listJoin(web)}`, href: '/courses', strong: true},
    sale.showCountdown ? {text: days <= 1 ? `Last day: ends ${endDate}` : `Ends ${endDate} · ${days} days left`} : null,
    reachesShop ? {text: 'The sale is on at our crystal shop too: rudraksha, gemstones and crystals', href: CRYSTAL_SHOP, external: true} : null,
    {text: 'Book a consultation at the sale price', href: '/consultations'},
  ].filter(Boolean);
  const set = (dup) => <span className="sale-strip__set" aria-hidden={dup || undefined}>{items.map((it, i) => {
    const body = <>{it.strong ? <b className="sale-strip__tag">SALE</b> : <i className="sale-strip__dot" aria-hidden="true">✦</i>}<span>{it.text}</span>{it.href && <ArrowRight size={13} aria-hidden="true"/>}</>;
    return it.href ? <a key={i} className="sale-strip__item" href={it.href} tabIndex={dup ? -1 : undefined} {...(it.external && {target: '_blank', rel: 'noopener noreferrer'})}>{body}</a> : <span key={i} className="sale-strip__item">{body}</span>;
  })}</span>;
  return <LocalizedContent><div className="sale-strip" role="region" aria-label={`${sale.name}`}><div className="sale-strip__track">{set(false)}{set(true)}</div></div></LocalizedContent>;
}

export function OfferAnnouncement() {
  const sales = useSales();
  const clock = useOfferClock();
  const live = sales.filter((s) => new Date(s.endsAt).getTime() > (clock.getTime() || Date.now()) && new Date(s.startsAt).getTime() <= (clock.getTime() || Date.now()));
  if (live.length) return <SaleStrip sale={live[0]} now={clock.getTime() || Date.now()}/>;
  return <FeaturedAnnouncement/>;
}

function FeaturedAnnouncement() {
  const now = useOfferClock();
  const current = getCurrentCoursePromotion(now);
  const promotion = current?.promotion;
  const spotlight = current?.offer || featured;
  return <LocalizedContent><a className="offer-announcement" href={courseUrl(spotlight)} aria-label={`${promotion ? `${promotion.label}. ` : ''}Explore ${spotlight.name}`}>
    <span className="offer-announcement__signal" aria-hidden="true"/>
    <strong>{promotion ? 'CURRENT OFFER' : 'FEATURED LEARNING PATH'}</strong>
    <span className="offer-announcement__message">{promotion ? `${promotion.label} · ${spotlight.name}` : spotlight.name}</span>
    <span className="offer-announcement__action">See the course <ArrowRight size={15}/></span>
  </a></LocalizedContent>;
}
