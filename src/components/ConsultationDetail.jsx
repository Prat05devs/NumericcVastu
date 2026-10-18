import Link from 'next/link';
import Image from 'next/image';
import {ArrowUpRight, CalendarCheck, Check, ClipboardList, CreditCard, Languages, MessageCircleQuestion, Plus, Sparkles, Star, Video} from 'lucide-react';
import {SiteFooter} from './SiteChrome';
import StickyBuy from './StickyBuy';
import ReviewCards from './ReviewCards';
import WhatsAppIcon from './WhatsAppIcon';
import {consultations, formatPrice, offerCatalog} from '../data/offers';
import {consultScenarios} from '../data/consultScenarios';
import {intakeFor, sessionFields} from '../data/intake';
import {googleReviews} from '../data/content';
import {crop} from '../lib/crop';

const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://numericcvaastu.com';
const PORTRAITS = ['/images/gallery/portrait-standing.webp', '/images/gallery/media-podcast-red-set.webp', '/images/gallery/portrait-arms-crossed.webp', '/images/gallery/media-podcast-portrait.webp'];

const faqs = (offer) => [
  ['Is the session online or in person?', offer.id.endsWith('vastu') ? 'Most Vastu consultations are done online from your floor plan and photos. Site visits in Delhi NCR can be arranged; travel is confirmed separately.' : 'Choose a video call, a phone call or an in-person meeting at the Rohini, Delhi office when you book.'],
  ['What if I don’t know my time of birth?', 'Leave it blank. Numerology works mainly from your name and date of birth; the time and place help Adarshh add detail where they are known.'],
  ['How do I book?', 'Fill in your details at checkout and pay securely with Razorpay (UPI, cards or net banking). The team then confirms your slot on WhatsApp. Prefer to talk first? Ask on WhatsApp.'],
  ['Can I reschedule?', 'Yes, let the team know on WhatsApp as early as possible. See the refund policy for cancellations.'],
  ['Does a consultation guarantee a result?', 'No. Numerology and Vastu are traditional interpretive practices. A session gives you perspective and practical next steps; it does not replace medical, legal or financial advice.'],
];

/** Consultation page: who it is for, what you get, how it works and exactly what will be asked, then booking. */
export default function ConsultationDetail({offer}) {
  const i = consultations.findIndex((c) => c.id === offer.id);
  const portrait = PORTRAITS[i % PORTRAITS.length];
  const checkout = `/checkout?offer=${offer.id}`;
  const ask = `/book-consultation?offer=${offer.id}`;
  const scenarios = consultScenarios[offer.id] || [];
  const asked = [...intakeFor(offer).fields, ...sessionFields(offer.id)].filter((f) => f.type !== 'heading' && f.type !== 'note');
  const related = consultations.filter((c) => c.id !== offer.id && (c.category === offer.category || c.id.endsWith('vastu') === offer.id.endsWith('vastu'))).slice(0, 3);
  const review = googleReviews.find((r) => !r.partial) || googleReviews[0];
  const steps = [
    [CreditCard, 'Book and pay online', 'Choose your preferred date and time, and pay securely with UPI, card or net banking.'],
    [ClipboardList, 'Share your details', 'Your name and birth details go straight to Adarshh so he can prepare your reading in advance.'],
    [Video, 'Meet Adarshh', 'A one-to-one conversation by video, by phone or in person in Rohini, Delhi.'],
    [Sparkles, 'Leave with next steps', 'Clear guidance and practical remedies you can act on.'],
  ];

  return <>
    <main id="main" className="hv cs-d">
      <section className="csd-hero">
        <div className="hv-wrap csd-hero__grid">
          <div>
            <nav className="cd-crumbs is-dark" aria-label="Breadcrumb"><Link href="/">Home</Link> / <Link href="/consultations">Consultations</Link> / <span aria-current="page">{offer.name}</span></nav>
            <span className="csd-cat">{offer.category} consultation</span>
            <h1>{offer.name}</h1>
            <p className="csd-hero__lede">{offer.summary} {offer.outcome}</p>
            <ul className="csd-hero__facts">
              <li><Check size={16}/>One-to-one with Adarshh Panndey</li>
              <li><Video size={16}/>{offer.id.endsWith('vastu') ? 'Online or site visit' : 'Video, phone or in person'}</li>
              <li><Languages size={16}/>Hindi or English</li>
            </ul>
            <div className="csd-hero__buy" id="buy-anchor">
              <div className="cd-price is-dark"><strong>{formatPrice(offer)}</strong><span>Consultation fee</span></div>
              <Link className="hv-button hv-button--gold" href={checkout}>Book this session <ArrowUpRight size={18}/></Link>
              <Link className="hv-button hv-button--ghost" href={ask}><WhatsAppIcon size={18}/> Ask first</Link>
            </div>
          </div>
          <div className="csd-hero__media">
            <div className="csd-hero__photo"><Image src={portrait} alt="Adarshh Panndey" fill priority sizes="(max-width: 900px) 90vw, 440px" style={crop(portrait, 0.85)}/></div>
            {review && <figure className="csd-quote">
              <div aria-label="Rated 5 out of 5">{Array.from({length: 5}, (_, k) => <Star key={k} size={14} fill="currentColor"/>)}</div>
              <blockquote>“{review.text.length > 120 ? `${review.text.slice(0, 117).trim()}…` : review.text}”</blockquote>
              <figcaption>{review.name} · Google review</figcaption>
            </figure>}
          </div>
        </div>
      </section>

      {scenarios.length > 0 && <section className="hv-section hv-wrap" aria-labelledby="csd-for">
        <div className="hv-head"><div><span className="hv-eyebrow">Is this for you?</span><h2 id="csd-for">Does this <em>sound like you?</em></h2></div><div className="hv-head__aside"><p>{offer.audience}. If any of these feel familiar, this session is a good place to start.</p></div></div>
        <ul className="csd-scenarios">{scenarios.map((s, k) => <li key={s}><Link href={`/book-consultation?offer=${offer.id}&s=${k}`}><MessageCircleQuestion size={22}/><span>{s}</span><ArrowUpRight size={16} className="csd-scenarios__go"/></Link></li>)}</ul>
      </section>}

      <section className="hv-section hv-tint" aria-labelledby="csd-get">
        <div className="hv-wrap csd-get">
          <div><span className="hv-eyebrow">What you get</span><h2 id="csd-get">In your <em>session.</em></h2><p>Every reading is prepared from your own details before you meet.</p></div>
          <ul>{offer.inclusions.map((x) => <li key={x}><Check size={20}/>{x}</li>)}</ul>
        </div>
      </section>

      <section className="hv-section hv-wrap" aria-labelledby="csd-how">
        <div className="hv-head is-center"><div><span className="hv-eyebrow">How it works</span><h2 id="csd-how">From booking <em>to clarity.</em></h2></div></div>
        <ol className="csd-steps">{steps.map(([Icon, t, d], k) => <li key={t}><span className="csd-steps__n"><Icon size={22}/></span><small>Step {k + 1}</small><h3>{t}</h3><p>{d}</p></li>)}</ol>
      </section>

      <section className="hv-section hv-cream" aria-labelledby="csd-ask">
        <div className="hv-wrap csd-ask">
          <div>
            <span className="hv-eyebrow">Come prepared</span>
            <h2 id="csd-ask">What Adarshh <em>will ask you.</em></h2>
            <p>You’ll fill these in at checkout; it only takes a few minutes. {offer.id.endsWith('vastu') ? 'Floor plans and photos are shared on WhatsApp after booking.' : offer.id === 'consult-signature' ? 'A photo of your signature is shared on WhatsApp after booking.' : 'Fields marked optional can be left blank.'}</p>
            <Link className="hv-button" href={checkout}><CalendarCheck size={18}/> Start booking</Link>
          </div>
          <ul className="csd-ask__list">{asked.map((f) => <li key={f.name}><Check size={16}/>{f.label}{!f.required && <small> (optional)</small>}</li>)}</ul>
        </div>
      </section>

      <section className="hv-section hv-wrap" aria-labelledby="csd-reviews">
        <div className="hv-head"><div><span className="hv-eyebrow">Client stories</span><h2 id="csd-reviews">What clients <em>say.</em></h2></div><div className="hv-head__aside"><Link className="hv-link" href="/testimonials">More experiences <ArrowUpRight size={16}/></Link></div></div>
        <ReviewCards reviews={googleReviews}/>
      </section>

      <section className="hv-section hv-wrap hv-faq" aria-labelledby="csd-faq">
        <div><span className="hv-eyebrow">Questions</span><h2 id="csd-faq">Before you <em>book.</em></h2><p>{offerCatalog.priceNote}</p><Link className="hv-link" href={ask}>Ask on WhatsApp <ArrowUpRight size={16}/></Link></div>
        <div className="hv-faq__list">{faqs(offer).map(([q, a], k) => <details key={q} open={k === 0}><summary>{q}<Plus size={20} aria-hidden="true"/></summary><p>{a}</p></details>)}</div>
      </section>

      {related.length > 0 && <section className="hv-section hv-tint" aria-labelledby="csd-more">
        <div className="hv-wrap">
          <div className="hv-head"><div><span className="hv-eyebrow">Related sessions</span><h2 id="csd-more">You might <em>also need.</em></h2></div><div className="hv-head__aside"><Link className="hv-link" href="/consultations">All consultations <ArrowUpRight size={16}/></Link></div></div>
          <ul className="csd-related">{related.map((r) => <li key={r.id}><Link href={`/consultations/${r.slug}`}><small>{r.category}</small><h3>{r.name}</h3><p>{r.summary}</p><span><b>{formatPrice(r)}</b><ArrowUpRight size={18}/></span></Link></li>)}</ul>
        </div>
      </section>}
      <StickyBuy name={offer.name} price={formatPrice(offer)} href={checkout} label="Book now"/>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({'@context': 'https://schema.org', '@type': 'Service', name: offer.name, description: offer.summary, provider: {'@type': 'Person', name: 'Adarshh Panndey'}, areaServed: 'IN', url: `${origin}/consultations/${offer.slug}`, offers: {'@type': 'Offer', price: offer.pricePaise / 100, priceCurrency: 'INR', url: `${origin}/checkout?offer=${offer.id}`}}).replace(/</g, '\\u003c')}}/>
    </main>
    <SiteFooter/>
  </>;
}
