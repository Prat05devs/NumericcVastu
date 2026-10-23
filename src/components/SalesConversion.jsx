'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, Check, Compass, Sparkles } from 'lucide-react';
import { courses, offerCatalog, getActivePromotion, getCurrentCoursePromotion } from '../data/offers';
import Price from './Price';
import { springStep } from '../lib/motionSpring';

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
  return <a className="offer-announcement" href={courseUrl(spotlight)} aria-label={`${promotion ? `${promotion.label}. ` : ''}Explore ${spotlight.name}`}>
    <span className="offer-announcement__signal" aria-hidden="true"/>
    <strong>{promotion ? 'CURRENT OFFER' : 'FEATURED LEARNING PATH'}</strong>
    <span className="offer-announcement__message">{promotion ? `${promotion.label} · ${spotlight.name}` : spotlight.name}</span>
    <span className="offer-announcement__action">See the course <ArrowRight size={15}/></span>
  </a>;
}

export function SalesHero() {
  const now = useOfferClock();
  const promotion = getActivePromotion(featured.id, now);
  const visualRef = useRef(null);
  const cardRef = useRef(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const visual = visualRef.current;
    const card = cardRef.current;
    if (!visual || !card) return;
    let frame;
    const start = performance.now();
    const animate = (now) => {
      const t = (now - start) / 1000;
      const visualProgress = Math.min(1.04, springStep(t, 10, 0.94));
      const cardProgress = Math.min(1.04, springStep(t - 0.18, 15, 0.84));
      visual.style.transform = `translate3d(0, ${(1 - visualProgress) * 24}px, 0) scale(${0.965 + visualProgress * 0.035})`;
      visual.style.opacity = String(Math.min(1, Math.max(0, visualProgress)));
      card.style.transform = `translate3d(0, ${(1 - cardProgress) * 35}px, 0) scale(${0.91 + cardProgress * 0.09})`;
      card.style.opacity = String(Math.min(1, Math.max(0, cardProgress)));
      if (t < 1.7) frame = requestAnimationFrame(animate);
      else { visual.style.transform = ''; visual.style.opacity = ''; card.style.transform = ''; card.style.opacity = ''; }
    };
    frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); visual.style.transform = ''; visual.style.opacity = ''; card.style.transform = ''; card.style.opacity = ''; };
  }, []);

  return <section className="sales-hero wrap" aria-labelledby="sales-hero-title">
    <div className="sales-hero__copy">
      <span className="sales-hero__eyebrow"><span aria-hidden="true">✳</span> NUMEROLOGY EDUCATION WITH ADARSHH PANNDEY</span>
      <h1 id="sales-hero-title">Learn to read numbers.<br/><em>Build a practice with purpose.</em></h1>
      <p className="sales-hero__lead">Go from your first calculation to a structured reading with guided practice and a clear learning path.</p>
      <div className="sales-hero__actions">
        <a className="button sales-hero__primary" href={courseUrl(featured)}>Explore the foundation course <ArrowUpRight size={18}/></a>
        <a className="sales-hero__secondary" href="/courses">Compare all courses <ArrowRight size={18}/></a>
      </div>
      <p className="sales-hero__personal">Looking for guidance about your own numbers? <a href="/consultations">Explore consultations <ArrowUpRight size={15}/></a></p>
      <div className="sales-hero__inclusions" aria-label="Foundation course highlights">
        {featured.inclusions.slice(0, 3).map((item) => <span key={item}><Check size={15}/>{item}</span>)}
      </div>
    </div>
    <div className="sales-hero__visual" ref={visualRef}>
      <span className="sales-hero__stage-top">THE PERSON BEHIND THE PRACTICE <span>01 / 09</span></span>
      <div className="sales-hero__portrait-stage">
        <div className="sales-hero__orbit" aria-hidden="true"><span>1</span><span>4</span><span>7</span></div>
        <Image src="/images/adarshh/adarshh-pandey-portrait.webp" alt="Adarshh Panndey" fill priority sizes="(max-width: 760px) 100vw, 46vw" quality={82} className="sales-hero__portrait"/>
        <span className="sales-hero__founder">Learn with <strong>Adarshh Panndey</strong></span>
      </div>
      <a className="sales-hero__offer-card" href={courseUrl(featured)} ref={cardRef}>
        <span className="sales-hero__offer-kicker"><Sparkles size={16}/>{promotion ? promotion.label : `${featured.category} pathway`}</span>
        <strong>{featured.name}</strong>
        <span className="sales-hero__offer-bottom"><span><small>{promotion ? 'Current offer' : 'Listed fee'}</small><b><Price offer={featured} now={now}/></b></span><span className="sales-hero__offer-arrow"><ArrowUpRight size={21}/></span></span>
        {!featured.priceVerified && <small className="sales-hero__fee-note">Confirm current fee and availability before enrolment.</small>}
      </a>
    </div>
  </section>;
}

export function SalesValueStrip() {
  return <div className="sales-value-strip"><div className="wrap sales-value-strip__inner">
    <div><BookOpen size={20}/><span><strong>Start with the essentials</strong><small>{featured.inclusions[0]}</small></span></div>
    <div><Sparkles size={20}/><span><strong>Practise as you learn</strong><small>{featured.inclusions[1]}</small></span></div>
    <div><Compass size={20}/><span><strong>Choose your next step</strong><small>Three course pathways to explore</small></span></div>
    <a href="/courses">Find your course <ArrowUpRight size={16}/></a>
  </div></div>;
}

export function FeaturedCourses() {
  const now = useOfferClock();
  return <section className="sales-courses section" id="featured-courses" aria-labelledby="sales-courses-title"><div className="wrap">
    <div className="sales-courses__heading"><div><span className="eyebrow">CHOOSE THE PATH THAT FITS YOUR EXPERIENCE</span><h2 id="sales-courses-title">A course for where<br/>you are <em>now.</em></h2></div><p>See who each program is for, what you’ll explore, and the listed fee before you enquire.</p></div>
    <div className="sales-courses__grid">{courses.map((offer, index) => {
      const promotion = getActivePromotion(offer.id, now);
      return <article className={offer.id === featured.id ? 'sales-course-card sales-course-card--featured' : 'sales-course-card'} key={offer.id}>
        <div className="sales-course-card__top"><span>0{index + 1} / {offer.category.toUpperCase()}</span>{offer.id === featured.id && <span className="sales-course-card__featured">START HERE</span>}</div>
        <h3>{offer.name}</h3><p className="sales-course-card__audience">For {offer.audience.toLowerCase()}</p>
        <p className="sales-course-card__outcome">{offer.outcome}</p>
        <ul>{offer.inclusions.slice(0, 3).map((item) => <li key={item}><Check size={15}/>{item}</li>)}</ul>
        <div className="sales-course-card__bottom"><span><small>{promotion ? promotion.label : 'Listed fee'}</small><strong><Price offer={offer} now={now}/></strong></span><a href={courseUrl(offer)} aria-label={`View ${offer.name}`}>View course <ArrowUpRight size={17}/></a></div>
      </article>;
    })}</div>
    <div className="sales-courses__footer"><span>Fees and course details are from the existing catalogue and must be confirmed before enrolment.</span><a href="/courses">Compare the three learning paths <ArrowRight size={17}/></a></div>
  </div></section>;
}
