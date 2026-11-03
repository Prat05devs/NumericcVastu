import LocalizedContent from '../i18n/LocalizedContent';
import Link from 'next/link';
import Image from 'next/image';
import {ArrowUpRight, Award, BookOpen, Check, Home, Languages, MapPin, Phone, Plus, Star, Users, Video} from 'lucide-react';
import {SiteFooter} from './SiteChrome';
import Price from './Price';
import WhatsAppIcon from './WhatsAppIcon';
import GoogleBusinessCard from './GoogleBusinessCard';
import {consultations, priceLabels} from '../data/offers';
import {locations} from '../data/locations';
import {contact} from '../data/contact';
import {book, stats} from '../data/media';
import {highlights} from '../data/achievements';
import {googleReviews} from '../data/content';
import {whatsappUrl} from '../lib/whatsapp';
import {absoluteUrl, jsonLdHtml} from '../lib/site';
import {breadcrumbs, faqPage, ids} from '../lib/schema';
import {crop} from '../lib/crop';

const stat = (label) => stats.find((s) => s.label === label)?.value;
const PHOTOS = ['/images/gallery/portrait-standing.webp', '/images/gallery/portrait-at-work.webp', '/images/gallery/media-podcast-red-set.webp', '/images/gallery/portrait-arms-crossed.webp'];

/** A local landing page from data/locations.js: who to see, how to meet, what it costs and local questions. */
export default function LocationPage({location}) {
  const index = locations.indexOf(location);
  const photo = PHOTOS[index % PHOTOS.length];
  const offers = location.offerIds.map((id) => consultations.find((c) => c.id === id)).filter(Boolean);
  const others = locations.filter((l) => l.slug !== location.slug);
  const review = googleReviews.find((r) => !r.partial) || googleReviews[0];
  const ask = whatsappUrl(contact.whatsapp, `Namaste Adarshh ji 🙏 I found you while looking for a ${location.vastu ? 'Vastu consultant' : 'numerologist'} (${location.place}). I would like to book a consultation.`);
  const proof = [
    [Users, stat('Consultations'), 'consultations given'],
    [Star, stat('Years of practice'), 'years of practice'],
    [Award, highlights[1]?.title, `${highlights[1]?.year || ''} · ${highlights[1]?.by || ''}`.replace(/^ · | · $/g, '')],
    [BookOpen, book.title, 'his book, GuruCool Book of the Year 2025'],
  ].filter(([, value]) => value);
  const formats = [
    [MapPin, 'In person in Rohini', 'At the NumericcVaastu office in Sector 29, Rohini, New Delhi.'],
    [Video, 'Video call', 'Google Meet or Zoom, from home or work.'],
    [Phone, 'Phone call', 'A simple call when video is not convenient.'],
    [Home, 'Vastu site visit', 'Across Delhi NCR, with travel confirmed separately.'],
  ];
  const path = `/${location.slug}`;

  return <LocalizedContent><>
    <main id="main" className="hv cs-d loc">
      <section className="csd-hero">
        <div className="hv-wrap csd-hero__grid">
          <div>
            <nav className="cd-crumbs is-dark" aria-label="Breadcrumb"><Link href="/">Home</Link> / <Link href="/consultations">Consultations</Link> / <span aria-current="page">{location.eyebrow}</span></nav>
            <span className="csd-cat">{location.eyebrow}</span>
            <h1>{location.title} <em>{location.accent}</em></h1>
            <p className="csd-hero__lede">{location.lede}</p>
            <ul className="csd-hero__facts">
              <li><MapPin size={16}/>Office in Rohini, Delhi</li>
              <li><Video size={16}/>Video or phone, anywhere</li>
              <li><Languages size={16}/>Hindi or English</li>
            </ul>
            <div className="csd-hero__buy">
              <Link className="hv-button hv-button--gold" href="/consultations">Choose a consultation <ArrowUpRight size={18}/></Link>
              <a className="hv-button hv-button--ghost" href={ask} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={18}/> Ask on WhatsApp</a>
              <a className="loc-call" href={contact.phoneHref}><Phone size={16}/> {contact.phone}</a>
            </div>
          </div>
          <div className="csd-hero__media">
            <div className="csd-hero__photo"><Image src={photo} alt={`Adarshh Panndey, ${location.vastu ? 'Vastu consultant' : 'numerologist'}`} fill priority sizes="(max-width: 900px) 90vw, 440px" style={crop(photo, 0.85)}/></div>
            {review && <figure className="csd-quote">
              <div aria-label="Rated 5 out of 5">{Array.from({length: 5}, (_, k) => <Star key={k} size={14} fill="currentColor"/>)}</div>
              <blockquote>“{review.text.length > 120 ? `${review.text.slice(0, 117).trim()}…` : review.text}”</blockquote>
              <figcaption>{review.name} · Google review</figcaption>
            </figure>}
          </div>
        </div>
      </section>

      <section className="hv-wrap loc-proof" aria-label="Why people choose Adarshh">
        <ul>{proof.map(([Icon, value, label]) => <li key={label}><Icon size={22} aria-hidden="true"/><b>{value}</b><span>{label}</span></li>)}</ul>
      </section>

      <section className="hv-section hv-wrap loc-story" aria-labelledby="loc-story">
        <div>
          <span className="hv-eyebrow">{location.place}</span>
          <h2 id="loc-story">{location.heading[0]} <em>{location.heading[1]}</em></h2>
          {location.paragraphs.map((text) => <p key={text}>{text}</p>)}
          <Link className="hv-link" href="/about">More about Adarshh <ArrowUpRight size={16}/></Link>
        </div>
        <div className="loc-areas">
          <h3>{location.areasTitle}</h3>
          <ul>{location.areas.map((area) => <li key={area}>{area}</li>)}</ul>
        </div>
      </section>

      <section className="hv-section hv-tint" aria-labelledby="loc-formats">
        <div className="hv-wrap">
          <div className="hv-head is-center"><div><span className="hv-eyebrow">How you can consult</span><h2 id="loc-formats">Four ways <em>to meet.</em></h2></div></div>
          <ol className="csd-steps">{formats.map(([Icon, title, text]) => <li key={title}><span className="csd-steps__n"><Icon size={22}/></span><h3>{title}</h3><p>{text}</p></li>)}</ol>
        </div>
      </section>

      <section className="hv-section hv-wrap" aria-labelledby="loc-offers">
        <div className="hv-head"><div><span className="hv-eyebrow">Consultations and fees</span><h2 id="loc-offers">Popular <em>sessions.</em></h2></div><div className="hv-head__aside"><p>Every fee is shown before you book. One-to-one with Adarshh Panndey.</p><Link className="hv-link" href="/consultations#all-consultations">All consultations <ArrowUpRight size={16}/></Link></div></div>
        <ul className="csd-related">{offers.map((offer) => <li key={offer.id}><Link href={`/consultations/${offer.slug}`}><small>{offer.category}</small><h3>{offer.name}</h3><p>{offer.summary}</p><span><b><Price offer={offer}/></b><ArrowUpRight size={18}/></span></Link></li>)}</ul>
        {location.international && <div className="loc-fees">
          <h3>Fees in India and abroad</h3>
          <table>
            <thead><tr><th scope="col">Consultation</th><th scope="col">In India</th><th scope="col">Outside India</th></tr></thead>
            <tbody>{consultations.map((offer) => { const labels = priceLabels(offer); return <tr key={offer.id}><th scope="row"><Link href={`/consultations/${offer.slug}`}>{offer.name}</Link></th><td>{labels.INR}</td><td>{labels.USD}</td></tr>; })}</tbody>
          </table>
        </div>}
      </section>

      <section className="hv-section hv-cream" aria-labelledby="loc-visit">
        <div className="hv-wrap loc-visit">
          <div>
            <span className="hv-eyebrow">Visit or call</span>
            <h2 id="loc-visit">The office in <em>Rohini.</em></h2>
            <address className="loc-address">{contact.addressLines.map((line) => <span key={line}>{line}</span>)}</address>
            <p className="loc-contact"><a href={contact.phoneHref}><Phone size={16}/> {contact.phone}</a><a href={`mailto:${contact.email}`}>{contact.email}</a></p>
            <a className="hv-link" href={contact.mapUrl} target="_blank" rel="noopener noreferrer">Directions in Google Maps <ArrowUpRight size={16}/></a>
          </div>
          <GoogleBusinessCard title="Adarshh Panndey on Google"/>
        </div>
      </section>

      <section className="hv-section hv-wrap hv-faq" aria-labelledby="loc-faq">
        <div><span className="hv-eyebrow">Questions</span><h2 id="loc-faq">Common <em>questions.</em></h2><Link className="hv-link" href="/faq">More answers <ArrowUpRight size={16}/></Link></div>
        <div className="hv-faq__list">{location.faqs.map(([q, a], k) => <details key={q} open={k === 0}><summary>{q}<Plus size={20} aria-hidden="true"/></summary><p>{a}</p></details>)}</div>
      </section>

      <section className="hv-wrap loc-places" aria-labelledby="loc-places">
        <h2 id="loc-places">More places <em>Adarshh consults.</em></h2>
        <ul>{others.map((l) => <li key={l.slug}><Link href={`/${l.slug}`}><Check size={16}/>{l.eyebrow}</Link></li>)}</ul>
      </section>

      <div className="hv-wrap"><div className="inner-cta">
        <h2>Bring your question <em>to Adarshh.</em></h2>
        <p>Choose a session and book online, or send your question on WhatsApp first.</p>
        <Link href="/consultations" className="button">See consultations and fees <ArrowUpRight size={18}/></Link>
      </div></div>

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(breadcrumbs([[location.eyebrow, path]]))}/>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(faqPage(location.faqs))}/>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml({
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: location.seo.title.split(' – ')[0],
        serviceType: location.vastu ? 'Vastu consultation' : 'Numerology consultation',
        description: location.seo.description,
        url: absoluteUrl(path),
        provider: {'@id': ids.business},
        areaServed: location.schemaAreas.map(([type, name]) => ({'@type': type, name})),
        availableChannel: [
          {'@type': 'ServiceChannel', name: 'In person', serviceLocation: {'@id': ids.business}},
          {'@type': 'ServiceChannel', name: 'Video or phone call', servicePhone: {'@type': 'ContactPoint', telephone: contact.phoneHref.replace('tel:', '')}},
        ],
      })}/>
    </main>
    <SiteFooter/>
  </></LocalizedContent>;
}
