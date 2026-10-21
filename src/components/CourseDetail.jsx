import Link from 'next/link';
import Image from 'next/image';
import {ArrowUpRight, Award, Check, CreditCard, GraduationCap, Mic, Plus, Users} from 'lucide-react';
import {SiteFooter} from './SiteChrome';
import StickyBuy from './StickyBuy';
import ReviewCards from './ReviewCards';
import StudentVideos from './StudentVideos';
import WhatsAppIcon from './WhatsAppIcon';
import FloatingNumbers from './FloatingNumbers';
import {courses, formatPrice, getActivePromotion, offerCatalog} from '../data/offers';
import {getCourseDetail} from '../data/courseDetails';
import {book} from '../data/media';
import {googleReviews, photos} from '../data/content';
import {appearances, ownShow} from '../data/podcasts';
import {crop} from '../lib/crop';

const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://numericcvaastu.com';
const jsonLd = (object) => <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(object).replace(/</g, '\\u003c')}}/>;
const studentPhotos = photos.filter((p) => p.category === 'With students' && !p.src.includes('teaching'));
/** Three different student photos per course for the hero collage. */
const collageFor = (i) => [studentPhotos[(i * 5) % studentPhotos.length], studentPhotos[(i * 5 + 2) % studentPhotos.length], studentPhotos[(i * 5 + 4) % studentPhotos.length]];
const factLabels = [['format', 'Format'], ['duration', 'Duration'], ['language', 'Language'], ['nextCohort', 'Next batch'], ['access', 'Access']];

/** Course program page: story first (who it is for, what you will be able to do, the journey, the mentor, real students), then the offer. */
export default function CourseDetail({offer}) {
  const detail = getCourseDetail(offer.id);
  const level = courses.findIndex((c) => c.id === offer.id);
  const checkout = `/checkout?offer=${offer.id}`;
  const ask = `/book-consultation?offer=${offer.id}`;
  const promo = getActivePromotion(offer.id);
  const facts = factLabels.filter(([key]) => detail.facts[key]);
  const collage = collageFor(level);
  const certificate = offer.inclusions.find((t) => /certif/i.test(t));
  const highlights = [
    offer.inclusions.find((t) => /module|resources/i.test(t)),
    offer.inclusions.find((t) => /live|mentorship|mastermind/i.test(t)),
    certificate,
  ].filter(Boolean);

  return <>
    <main id="main" className="hv cd">
      <section className="cd-hero">
        <FloatingNumbers/>
        <div className="hv-wrap cd-hero__grid">
          <div className="cd-hero__copy">
            <nav className="cd-crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link> / <Link href="/courses">Courses</Link> / <span aria-current="page">{offer.name}</span></nav>
            <span className="cd-level">Level {level + 1} of {courses.length} · {offer.category}</span>
            <h1>{offer.name}</h1>
            <p className="cd-hero__lede">{detail.headline}</p>
            <ul className="cd-hero__facts">
              {highlights.map((h) => <li key={h}><Check size={16}/>{h}</li>)}
              <li><GraduationCap size={16}/>Taught by Adarshh Panndey</li>
            </ul>
            <div className="cd-hero__buy" id="buy-anchor">
              <div className="cd-price"><strong>{formatPrice(offer)}</strong><span>{promo ? promo.label : 'Course fee'}</span></div>
              <Link className="hv-button hv-button--gold" href={checkout}>Enrol now <ArrowUpRight size={18}/></Link>
              <Link className="hv-button hv-button--light" href={ask}><WhatsAppIcon size={18}/> Ask a question</Link>
            </div>
          </div>
          <div className="cd-collage" aria-hidden="true">
            {collage.map((p, i) => <div key={p.src} className={`cd-collage__img cd-collage__img--${i}`}><Image src={p.src} alt="" fill sizes="(max-width: 900px) 45vw, 300px" style={crop(p.src, [0.78, 1, 0.9][i], [p.w, p.h])}/></div>)}
            <div className="cd-collage__badge"><Users size={20}/><b>1,500+</b><span>students trained</span></div>
          </div>
        </div>
      </section>

      <nav className="cd-ladder" aria-label="Learning path">
        <ol className="hv-wrap">
          {courses.map((c, i) => <li key={c.id} className={c.id === offer.id ? 'is-current' : ''}>
            <Link href={`/courses/${c.slug}`} aria-current={c.id === offer.id ? 'page' : undefined}><span>Level {i + 1}</span><b>{c.name}</b><small>{c.category} · {formatPrice(c)}</small></Link>
          </li>)}
        </ol>
      </nav>

      <section className="hv-section hv-wrap cd-for" aria-labelledby="cd-for">
        <div className="hv-head"><div><span className="hv-eyebrow">Is this for you?</span><h2 id="cd-for">Made for people <em>who…</em></h2></div><div className="hv-head__aside"><p>{offer.audience}.</p></div></div>
        <ul className="cd-for__list">{detail.whoFor.map((w) => <li key={w}><Check size={20}/>{w}</li>)}</ul>
        {detail.requirements.length > 0 && <p className="cd-for__req"><b>Before you join:</b> {detail.requirements.join(' ')}</p>}
      </section>

      <section className="hv-section hv-tint" aria-labelledby="cd-learn">
        <div className="hv-wrap">
          <div className="hv-head"><div><span className="hv-eyebrow">After the course</span><h2 id="cd-learn">What you’ll be <em>able to do.</em></h2></div><div className="hv-head__aside"><p>{offer.outcome}</p></div></div>
          <ol className="cd-outcomes">{detail.learn.map((l, i) => <li key={l}><span>{String(i + 1).padStart(2, '0')}</span><p>{l}</p></li>)}</ol>
        </div>
      </section>

      <section className="hv-section hv-wrap cd-journey" aria-labelledby="cd-journey">
        <div className="hv-head"><div><span className="hv-eyebrow">The journey</span><h2 id="cd-journey">How the course <em>unfolds.</em></h2></div><div className="hv-head__aside">{detail.description.slice(0, 2).map((d) => <p key={d}>{d}</p>)}</div></div>
        <ol className="cd-modules">{detail.modules.map((m, i) => <li key={m.title}>
          <span className="cd-modules__n">{i + 1}</span>
          <div><h3>{m.title}</h3><p>{m.summary}</p>{m.topics.length > 0 && <ul>{m.topics.map((t) => <li key={t}>{t}</li>)}</ul>}</div>
        </li>)}</ol>
        {!detail.syllabusConfirmed && <p className="cd-note">The lesson-by-lesson syllabus is shared with enrolled students. Ask on WhatsApp if you’d like it before joining.</p>}
      </section>

      <section className="cd-mentor" aria-labelledby="cd-mentor">
        <FloatingNumbers/>
        <div className="hv-wrap cd-mentor__grid">
          <div className="cd-mentor__photo"><Image src="/images/students/teaching-what-is-numerology.webp" alt="Adarshh Panndey teaching a numerology class" fill sizes="(max-width: 900px) 92vw, 460px" style={crop('/images/students/teaching-what-is-numerology.webp', 0.85)}/></div>
          <div>
            <span className="hv-eyebrow">Your teacher</span>
            <h2 id="cd-mentor">Learn from <em>Adarshh Panndey.</em></h2>
            <p>Adarshh teaches the way he practises: calculation first, then the pattern, then how to talk to a real client about it. He is the author of <a className="hv-link" href={book.amazon} target="_blank" rel="noopener noreferrer"><cite>{book.title}</cite></a> and a regular guest on India’s podcasts.</p>
            <ul className="cd-mentor__stats">
              <li><b data-count>1,500+</b>students trained</li>
              <li><b data-count>20,000+</b>consultations</li>
              <li><b data-count>{appearances.length + ownShow.length}+</b>podcast conversations</li>
              <li><b data-count>7+</b>years of practice</li>
            </ul>
            <div className="hv-actions"><Link className="hv-link" href="/about">His story <ArrowUpRight size={16}/></Link><Link className="hv-link" href="/podcasts"><Mic size={16}/> Hear him on podcasts</Link></div>
          </div>
        </div>
      </section>

      <section className="hv-section hv-wrap" aria-labelledby="cd-students">
        <div className="hv-head"><div><span className="hv-eyebrow">His students</span><h2 id="cd-students">Real classes, <em>real certificates.</em></h2></div><div className="hv-head__aside"><p>Moments from Adarshh’s certification ceremonies and workshops.</p><Link className="hv-link" href="/gallery">See the gallery <ArrowUpRight size={16}/></Link></div></div>
        <ul className="cd-mosaic">{studentPhotos.slice(0, 8).map((p) => <li key={p.src}><Image src={p.src} alt="Adarshh Panndey with his numerology students" fill sizes="(max-width: 700px) 46vw, 280px" style={crop(p.src, 0.8, [p.w, p.h])}/></li>)}</ul>
        <StudentVideos title="What his students say"/>
        <ReviewCards reviews={googleReviews.slice(0, 2)} className="cd-reviews"/>
      </section>

      <section className="hv-section hv-cream" aria-labelledby="cd-cert">
        <div className="hv-wrap cd-cert">
          <div className="cd-cert__visual" aria-hidden="true">
            <img src="/images/logo-nv.png" alt=""/>
            <small>NumericcVaastu Academy</small>
            <strong>Certificate of Completion</strong>
            <span>{offer.name}</span>
            <i/>
            <em>Adarshh Panndey</em>
          </div>
          <div>
            <span className="hv-eyebrow">Certification</span>
            <h2 id="cd-cert"><Award size={30} className="cd-cert__icon"/> Finish with <em>a certificate.</em></h2>
            <p>{detail.certificate}</p>
          </div>
        </div>
      </section>

      <section className="hv-section hv-wrap cd-buy" aria-labelledby="cd-buy">
        <div className="cd-buy__card">
          <div className="cd-buy__head">
            <span className="hv-eyebrow">Enrol</span>
            <h2 id="cd-buy">{offer.name}</h2>
            <div className="cd-price"><strong>{formatPrice(offer)}</strong><span>{promo ? promo.label : 'Course fee'}</span></div>
            {!offer.priceVerified && <p className="cd-buy__fine">{offerCatalog.priceNote}</p>}
          </div>
          <ul className="cd-buy__list">{offer.inclusions.map((i) => <li key={i}><Check size={18}/>{i}</li>)}</ul>
          {facts.length > 0 && <dl className="cd-buy__facts">{facts.map(([k, label]) => <div key={k}><dt>{label}</dt><dd>{detail.facts[k]}</dd></div>)}</dl>}
          <div className="cd-buy__actions">
            <Link className="hv-button hv-button--gold" href={checkout}>Enrol now <ArrowUpRight size={18}/></Link>
            <Link className="hv-button hv-button--ghost" href={ask}><WhatsAppIcon size={18}/> Ask on WhatsApp</Link>
          </div>
          <p className="cd-buy__pay"><CreditCard size={16}/> Secure payment by Razorpay: UPI, cards, net banking</p>
        </div>
      </section>

      <section className="hv-section hv-wrap hv-faq" aria-labelledby="cd-faq">
        <div><span className="hv-eyebrow">Questions</span><h2 id="cd-faq">Before you <em>enrol.</em></h2><p>Anything else? Ask Adarshh’s team on WhatsApp.</p><Link className="hv-link" href={ask}>Ask a question <ArrowUpRight size={16}/></Link></div>
        <div className="hv-faq__list">{detail.faqs.map(([q, a], i) => <details key={q} open={i === 0}><summary>{q}<Plus size={20} aria-hidden="true"/></summary><p>{a}</p></details>)}</div>
      </section>
      <StickyBuy name={offer.name} price={formatPrice(offer)} href={checkout} label="Enrol now"/>
      {jsonLd({'@context': 'https://schema.org', '@type': 'Course', name: offer.name, description: offer.summary, url: `${origin}/courses/${offer.slug}`, provider: {'@type': 'Organization', name: 'NumericcVaastu', sameAs: origin}, instructor: {'@type': 'Person', name: 'Adarshh Panndey'}, offers: {'@type': 'Offer', price: offer.pricePaise / 100, priceCurrency: 'INR', url: `${origin}/checkout?offer=${offer.id}`, category: 'Paid'}})}
    </main>
    <SiteFooter/>
  </>;
}
