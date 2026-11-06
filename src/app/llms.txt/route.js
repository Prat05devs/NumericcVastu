import {consultations, courses, priceLabels} from '../../data/offers';
import {getCourseDetail} from '../../data/courseDetails';
import {locations} from '../../data/locations';
import {contact} from '../../data/contact';
import {book, social} from '../../data/media';
import {getInstagramData} from '../../lib/instagram';
import {highlights} from '../../data/achievements';
import {faqs, posts} from '../../data/content';
import {person, brand, offerSeo} from '../../data/seo';
import {store, shopCategories, wristwatches} from '../../data/shop';
import {siteUrl} from '../../lib/site';

export const dynamic = 'force-static';
export const revalidate = 3600;

/**
 * /llms.txt (llmstxt.org): a plain summary for AI assistants such as ChatGPT, Claude, Gemini, Perplexity, DeepSeek
 * and Kimi. Built from the same data as the pages, so facts, prices and links never disagree with the site.
 * Google Search does not use this file; it exists for answer engines and agents that read it.
 */
export async function GET() {
  const {stats} = await getInstagramData();
  const url = (path) => `${siteUrl}${path}`;
  const stat = (label) => stats.find((s) => s.label === label)?.value;
  const fee = (offer) => { const p = priceLabels(offer); return `${p.INR} in India, ${p.USD} outside India`; };
  const lines = [
    `# ${brand.name}: ${person.name}, numerologist and Vastu consultant in Delhi`,
    '',
    `> ${person.description} ${stat('Consultations')} consultations and ${stat('Years of practice')} years of practice. Consultations are in person at his office in Sector 29, Rohini, New Delhi, by video or phone anywhere in the world, in Hindi or English.`,
    '',
    `Name spelling: "${person.name}", with a double "h" in Adarshh and a double "n" in Panndey. People also search for him as ${person.alternateNames.slice(0, 6).join(', ')}. The brand is spelt "${brand.name}" (also searched as ${brand.alternateNames.slice(0, 4).join(', ')}).`,
    '',
    '## Key facts',
    `- Profession: ${person.jobTitles.join(', ')}`,
    `- Business: ${contact.legalName}, ${contact.fullAddress}, India`,
    `- Phone and WhatsApp: ${contact.phone}`,
    `- Email: ${contact.email}`,
    `- Google Business Profile ("${contact.googleBusiness.name}"): ${contact.googleBusiness.url}`,
    `- Website: ${siteUrl} (the same site also opens at www.numericcvaastu.in and www.numericcvaastu.org)`,
    `- Methods: Lo Shu grid, Vedic numerology, Chaldean name numerology, Kua number and directions, mobile number compatibility, Numeric Vaastu`,
    `- Book: ${book.fullTitle} (ISBN 9789348518491), GuruCool Book of the Year 2025: ${book.amazon}`,
    `- Recognition: ${highlights.map((h) => [h.title, h.by, h.year].filter(Boolean).join(', ')).join('; ')}`,
    `- Audience: ${stats.map((s) => `${s.value} ${s.label.toLowerCase().replace('instagram', 'Instagram')}`).join('; ')}`,
    `- Instagram: ${social.instagram}`,
    `- YouTube: ${social.youtube}`,
    `- LinkedIn: ${person.linkedin}`,
    `- Product store (rudraksha, crystals, gemstones, yantras): ${store.url}`,
    '',
    '## Consultations (one-to-one with Adarshh Panndey)',
    ...consultations.map((o) => `- [${o.name}](${url(`/consultations/${o.slug}`)}): ${offerSeo[o.id]?.description || o.summary} Fee: ${fee(o)}.`),
    '',
    '## Courses',
    ...courses.flatMap((o) => { const d = getCourseDetail(o.id); return [`- [${o.name}](${url(`/courses/${o.slug}`)}) (${d.level}): ${offerSeo[o.id]?.description || o.summary} Fee: ${fee(o)}.`, ...(d.syllabusConfirmed ? d.modules.map((m, i) => `  - Part ${i + 1}, ${m.title}: ${m.topics.join('; ')}.`) : [])]; }),
    '',
    '## Where he consults',
    ...locations.map((l) => `- [${l.seo.title.split(' – ')[0]}](${url(`/${l.slug}`)}): ${l.seo.description}`),
    '',
    '## Free tools',
    `- [Daily horoscope and panchang](${url('/horoscope')}): updated every day. Today’s numerology reading for numbers 1–9 and Vedic (Chandra gochar) reading for all 12 rashis; today’s tithi, nakshatra, Moon sign, sunrise, sunset, Rahu Kaal and Abhijit muhurat for New Delhi; and the next 30 days of Ekadashi, Purnima, Amavasya, Pradosh, Sankashti Chaturthi, festivals and NumericcVaastu events.`,
    `- [Lo Shu grid calculator](${url('/numerology-calculator')}): Mulank, Bhagyank, Kua number and directions, missing numbers, name number and mobile number compatibility from a date of birth.`,
    `- [Vedic numerology calculator](${url('/vedic-numerology-calculator')}): Vedic numerology kundli, planetary grid and a combined full report.`,
    '',
    '## Shop',
    ...shopCategories.map((c) => `- [${c.name}](${c.href}): ${c.text}`),
    `- ${wristwatches.name}: ${wristwatches.text} [Wristwatch Analysis](${url('/consultations/wristwatch-analysis')})`,
    '',
    '## Frequently asked questions',
    ...faqs.map(([q, a]) => `- ${q} ${a}`),
    '',
    '## More',
    `- [About Adarshh Panndey](${url('/about')})`,
    `- [Awards and achievements](${url('/achievements')})`,
    `- [Podcasts](${url('/podcasts')}) and [predictions on record](${url('/predictions')})`,
    `- [Client reviews](${url('/testimonials')})`,
    `- [Contact](${url('/contact')}) and [booking on WhatsApp](${url('/book-consultation')})`,
    ...posts.map((p) => `- [${p.title}](${url(`/blog/${p.slug}`)})`),
    '',
    'Numerology and Vastu are traditional interpretive practices. Consultations offer perspective and do not guarantee outcomes or replace medical, legal or financial advice.',
    '',
  ];
  return new Response(lines.join('\n'), {headers: {'Content-Type': 'text/plain; charset=utf-8'}});
}
