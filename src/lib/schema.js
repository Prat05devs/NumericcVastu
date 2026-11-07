/**
 * Structured data (schema.org JSON-LD) for search engines and AI assistants.
 *
 * The root layout publishes one linked graph: the business (a local ProfessionalService), Adarshh Panndey, his
 * book, the website and the crystal store. Pages refer to those nodes by `@id` instead of repeating them, so every
 * page strengthens the same entity. Only visible, verifiable facts belong here: no self-written star ratings.
 */
import {contact} from '../data/contact';
import {book, social, stats} from '../data/media';
import {highlights} from '../data/achievements';
import {brand, person, serviceAreas} from '../data/seo';
import {offerCatalog, consultations, courses, getPrice} from '../data/offers';
import {store, shopCategories} from '../data/shop';
import {siteUrl, siteDomains, absoluteUrl} from './site';

export const ids = {
  business: `${siteUrl}/#business`,
  person: `${siteUrl}/#adarshh-panndey`,
  website: `${siteUrl}/#website`,
  book: `${siteUrl}/#book`,
  store: `${siteUrl}/#store`,
};

const ref = (id) => ({'@id': id});
const stat = (label) => stats.find((s) => s.label === label)?.value;

export const postalAddress = {
  '@type': 'PostalAddress',
  streetAddress: `${contact.address.street}, ${contact.address.locality}`,
  addressLocality: contact.address.city,
  addressRegion: contact.address.region,
  postalCode: contact.address.postalCode,
  addressCountry: contact.address.country,
};

const inr = (paise) => new Intl.NumberFormat('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 0}).format(paise / 100);
const active = offerCatalog.offers.filter((offer) => offer.active);
const prices = active.map((offer) => offer.pricePaise);

/** Both currencies for an offer: rupees in India, US dollars elsewhere. */
export function offerPrices(offer, url) {
  return [
    {'@type': 'Offer', price: getPrice(offer, 'INR') / 100, priceCurrency: 'INR', url, eligibleRegion: {'@type': 'Country', name: 'India'}, availability: 'https://schema.org/InStock'},
    {'@type': 'Offer', price: getPrice(offer, 'USD') / 100, priceCurrency: 'USD', url, availability: 'https://schema.org/InStock'},
  ];
}

export const offerUrl = (offer) => absoluteUrl(`/${offer.kind === 'course' ? 'courses' : 'consultations'}/${offer.slug}`);

export function siteGraph() {
  const gbp = contact.googleBusiness;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfessionalService',
        '@id': ids.business,
        name: brand.name,
        legalName: contact.legalName,
        alternateName: brand.alternateNames,
        slogan: brand.slogan,
        description: brand.description,
        url: siteUrl,
        logo: absoluteUrl('/images/logo-nv.png'),
        image: [absoluteUrl('/images/share/adarshh-panndey-numericcvaastu.jpg'), absoluteUrl('/images/gallery/portrait-standing.webp')],
        founder: ref(ids.person),
        telephone: contact.phoneHref.replace('tel:', ''),
        email: contact.email,
        address: postalAddress,
        hasMap: gbp.url,
        areaServed: serviceAreas,
        priceRange: `${inr(Math.min(...prices))} – ${inr(Math.max(...prices))}`,
        currenciesAccepted: 'INR, USD',
        paymentAccepted: 'UPI, Credit card, Debit card, Net banking, PayPal',
        knowsAbout: brand.knowsAbout,
        knowsLanguage: ['hi', 'en'],
        contactPoint: {'@type': 'ContactPoint', telephone: contact.phoneHref.replace('tel:', ''), email: contact.email, contactType: 'customer service', availableLanguage: ['Hindi', 'English'], areaServed: 'Worldwide'},
        // The other domains serving this site, so search engines and assistants know all three belong to one business.
        sameAs: [gbp.url, gbp.searchUrl, social.instagram, social.youtube, person.youtubeChannel, store.url, brand.learnUrl, ...siteDomains.map((d) => `https://${d}`).filter((u) => u !== siteUrl)],
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Numerology and Vastu consultations and courses',
          itemListElement: [
            {'@type': 'OfferCatalog', name: 'Consultations', itemListElement: consultations.map((offer) => ({'@type': 'Offer', price: getPrice(offer, 'INR') / 100, priceCurrency: 'INR', url: offerUrl(offer), itemOffered: {'@type': 'Service', name: offer.name, description: offer.summary, url: offerUrl(offer)}}))},
            {'@type': 'OfferCatalog', name: 'Courses', itemListElement: courses.map((offer) => ({'@type': 'Offer', price: getPrice(offer, 'INR') / 100, priceCurrency: 'INR', url: offerUrl(offer), itemOffered: {'@type': 'Course', name: offer.name, description: offer.summary, url: offerUrl(offer), provider: ref(ids.business)}}))},
          ],
        },
      },
      {
        '@type': 'Person',
        '@id': ids.person,
        name: person.name,
        alternateName: person.alternateNames,
        disambiguatingDescription: person.disambiguation,
        jobTitle: person.jobTitles,
        description: [person.description, stat('Consultations') && `${stat('Consultations')} consultations and ${stat('Years of practice')} years of practice.`].filter(Boolean).join(' '),
        url: absoluteUrl('/about'),
        image: absoluteUrl('/images/gallery/media-podcast-studio.webp'),
        worksFor: ref(ids.business),
        address: postalAddress,
        knowsAbout: brand.knowsAbout,
        knowsLanguage: ['hi', 'en'],
        hasOccupation: person.jobTitles.map((name) => ({'@type': 'Occupation', name, occupationLocation: {'@type': 'City', name: 'New Delhi'}})),
        award: highlights.map((h) => [h.title, h.by, h.year].filter(Boolean).join(', ')),
        sameAs: [social.instagram, social.youtube, person.youtubeChannel, person.linkedin, social.facebook, gbp.url].filter(Boolean),
      },
      {
        '@type': 'Book',
        '@id': ids.book,
        name: book.fullTitle,
        author: ref(ids.person),
        isbn: '9789348518491',
        url: book.amazon,
        sameAs: ['https://www.amazon.com/dp/B0F78Q2S58'],
        award: 'GuruCool Book of the Year 2025',
      },
      {
        '@type': 'WebSite',
        '@id': ids.website,
        name: brand.name,
        alternateName: brand.alternateNames,
        url: siteUrl,
        inLanguage: 'en-IN',
        publisher: ref(ids.business),
        about: ref(ids.person),
      },
      {
        '@type': 'OnlineStore',
        '@id': ids.store,
        name: store.name,
        url: store.url,
        parentOrganization: ref(ids.business),
        hasOfferCatalog: {'@type': 'OfferCatalog', name: 'Rudraksha, crystals, gemstones and yantras', itemListElement: shopCategories.map((c) => ({'@type': 'OfferCatalog', name: c.name, url: c.href, description: c.text}))},
      },
    ],
  };
}

export const breadcrumbs = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [['Home', '/'], ...items].map(([name, path], index) => ({'@type': 'ListItem', position: index + 1, name, item: absoluteUrl(path)})),
});

export const faqPage = (faqs) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(([question, answer]) => ({'@type': 'Question', name: question, acceptedAnswer: {'@type': 'Answer', text: answer}})),
});
