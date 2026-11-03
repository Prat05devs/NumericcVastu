'use client';
import LocalizedContent from '../i18n/LocalizedContent';

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { courses, offerCatalog, getCurrentCoursePromotion } from '../data/offers';

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

export function OfferAnnouncement() {
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
