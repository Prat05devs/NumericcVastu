import {offerCatalog} from './offers';

/** Business contact details supplied by the client (October 2026). Used by the header bar, footer, contact page and structured data. */
const street = 'Flat No 972, 2nd Floor, Creative Hight Apartment';
const locality = 'Sector 29, Rohini';
const city = 'New Delhi';
const region = 'Delhi';
const postalCode = '110042';

export const contact = {
  email: offerCatalog.contactEmail,
  phone: '+91 70429 55904',
  phoneHref: 'tel:+917042955904',
  /** WhatsApp number in international format without + or spaces. */
  whatsapp: '917042955904',
  address: {street, locality, city, region, postalCode, country: 'IN'},
  addressLines: [street, locality, `${city}, ${region} ${postalCode}`],
  mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${street}, ${locality}, ${city}, ${region} ${postalCode}`)}`,
};
