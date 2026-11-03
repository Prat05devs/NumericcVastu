import {offerCatalog} from './offers';

/** Business contact details supplied by the client (October 2026). Used by the header bar, footer, contact page and structured data. */
const street = 'Flat No 972, 2nd Floor, Creative Hight Apartment';
const locality = 'Sector 29, Rohini';
const city = 'New Delhi';
const region = 'Delhi';
const postalCode = '110042';
const fullAddress = `${street}, ${locality}, ${city}, ${region} ${postalCode}`;

/**
 * Google Business Profile, listed on Google as "Adarshh Panndey". "Numerologist near me" searches, the map pack,
 * calls and reviews all happen on this profile, so the site links to it wherever people decide: header, footer,
 * contact, reviews, location pages and after checkout. Keep the business name, address and phone here identical
 * to the profile; Google and AI assistants compare them.
 */
const googleBusiness = {
  name: 'Adarshh Panndey',
  /** Share link supplied by the client (November 2026). */
  url: 'https://share.google/3UZ673B6qO3Dah6Vj',
  /** The profile's Knowledge Graph ID (resolved from the share link); used in structured data. */
  kgmid: '/g/11w1kvlf3g',
  searchUrl: 'https://www.google.com/search?kgmid=/g/11w1kvlf3g&q=Adarshh+Panndey',
  /**
   * Paste the profile's own review link here to open the review form directly: on Google Search, open the
   * profile → "Ask for reviews" (or "Get more reviews") → copy the link (it looks like https://g.page/r/…/review).
   * Until then the profile link is used and visitors tap "Write a review" there.
   */
  reviewUrl: '',
  /** Optional: the profile's current star rating and review count, e.g. 4.9 and 120. Shown only when both are set. */
  rating: null,
  reviewCount: null,
};

export const contact = {
  legalName: 'NumericcVaastu Training and Consultancy LLP',
  email: offerCatalog.contactEmail,
  phone: '+91 98701 97315',
  phoneHref: 'tel:+919870197315',
  /** WhatsApp number in international format without + or spaces. */
  whatsapp: '919870197315',
  address: {street, locality, city, region, postalCode, country: 'IN'},
  addressLines: [street, locality, `${city}, ${region} ${postalCode}`],
  fullAddress,
  /** Searches Maps for the business name and address, which opens the Business Profile rather than a bare pin. */
  mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Adarshh Panndey, ${fullAddress}`)}`,
  googleBusiness,
  reviewLink: googleBusiness.reviewUrl || googleBusiness.url,
};
