import {offerCatalog} from './offers';

/** Business contact details supplied by the client (October 2026). Used by the header bar, footer, contact page and structured data. */
const street = 'Flat No 972, 2nd Floor, Creative Hight Apartment';
const locality = 'Sector 29, Rohini';
const city = 'New Delhi';
const region = 'Delhi';
const postalCode = '110042';

export const contact = {
  email: offerCatalog.contactEmail,
  phone: '+91 98701 97315',
  phoneHref: 'tel:+919870197315',
  /** WhatsApp number in international format without + or spaces. */
  whatsapp: '919870197315',
  address: {street, locality, city, region, postalCode, country: 'IN'},
  addressLines: [street, locality, `${city}, ${region} ${postalCode}`],
  mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${street}, ${locality}, ${city}, ${region} ${postalCode}`)}`,
};
