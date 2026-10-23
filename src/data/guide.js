import {courses, consultations, offerCatalog, priceLabels} from './offers';
import {getCourseDetail} from './courseDetails';
import {consultScenarios, consultShortNames} from './consultScenarios';
import {faqs, posts, googleReviews} from './content';
import {contact} from './contact';
import {book, social, stats} from './media';
import {highlights, achievementCount} from './achievements';
import {predictionStats} from './predictions';
import {appearances, ownShow} from './podcasts';

/**
 * Knowledge base for the floating site guide (components/SiteGuide.jsx). No AI is involved: every answer is
 * built here from the site's own data, and the guide matches a visitor's words against `label`, `keys` and
 * the answer text. Built on the server in the root layout, so only these plain entries reach the browser.
 *
 * Entry: {id, label, title?, text: string[], list?: {title, items}, links?: [label, href][], next?: id[], keys?}
 * - `label` is the quick-reply button text and the visitor's side of the conversation.
 * - `next` are the quick replies offered after the answer.
 * - `keys` are extra search words, including common Hindi words visitors type in English letters.
 * - `hidden` entries are reachable by typing but never offered as a quick reply.
 */

export const guidePrices = () => Object.fromEntries([...consultations, ...courses].map((o) => [o.id, priceLabels(o)]));

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const faqId = (question) => `faq-${slug(question)}`;

/** Extra words people use for each consultation, beyond its name and listed situations. */
const consultKeys = {
  'consult-blueprint': 'personal reading life path mulank bhagyank future life general strengths decision year ahead',
  'consult-career': 'career job promotion salary switch interview study stream student naukri work',
  'consult-relationship': 'relationship marriage love partner compatibility couple husband wife shaadi match spouse',
  'consult-business': 'business company startup brand logo founder partner sales launch firm',
  'consult-baby-name': 'baby child newborn kid name bachcha naming son daughter',
  'consult-name': 'name correction spelling change surname aadhaar pan passport naam',
  'consult-mobile': 'mobile phone number sim vip cell',
  'consult-watch': 'watch wristwatch wrist clock time ghadi',
  'consult-signature': 'signature sign autograph hastakshar',
  'consult-home-vastu': 'home house flat apartment vastu residential ghar door kitchen bedroom room plot',
  'consult-office-vastu': 'office shop workspace vastu commercial clinic cash locker dukaan factory store',
};

const offerId = (offer) => `offer-${offer.id}`;
/** Prices go into answers as ¤{offer id} and the guide fills in the visitor's currency (see guidePrices). */
const formatPrice = (offer) => `¤{${offer.id}}`;
const stat = (label) => stats.find((s) => s.label === label).value;
/** Course FAQs every course shares (payment, batch dates) are general answers, not tied to one course. */
const sharedCourseFaqs = new Set(courses.map((c) => getCourseDetail(c.id).faqs.map(([q]) => q)).reduce((a, b) => a.filter((q) => b.includes(q))));

function consultationEntry(offer) {
  const scenarios = consultScenarios[offer.id] || [];
  return {
    id: offerId(offer),
    label: consultShortNames[offer.id] || offer.name,
    title: offer.name,
    text: [offer.summary, `Listed fee: ${formatPrice(offer)}. ${offerCatalog.priceNote}`],
    list: {title: 'Often booked by people asking:', items: scenarios.slice(0, 4)},
    links: [['See full details', `/consultations/${offer.slug}`], ['Book on WhatsApp', `/book-consultation?offer=${offer.id}`], ['Book & pay online', `/checkout?offer=${offer.id}`]],
    next: ['find-consult', 'booking', 'formats', faqId('What should I prepare for a consultation?')],
    keys: [offer.name, offer.category, offer.audience, offer.inclusions.join(' '), scenarios.join(' '), consultKeys[offer.id] || ''].join(' '),
  };
}

function courseEntries(offer, index) {
  const detail = getCourseDetail(offer.id);
  const others = courses.filter((c) => c.id !== offer.id).map(offerId);
  const course = {
    id: offerId(offer),
    label: offer.name,
    text: [`Step ${index + 1} · ${detail.path} · ${detail.level}.`, detail.headline, `Best for: ${offer.audience.toLowerCase()}. Listed fee: ${formatPrice(offer)}.`],
    list: {title: 'You will learn to…', items: detail.learn.slice(0, 4)},
    links: [['See the full course', `/courses/${offer.slug}`], ['Ask on WhatsApp', `/book-consultation?offer=${offer.id}`], ['Enrol & pay online', `/checkout?offer=${offer.id}`]],
    next: [...detail.faqs.map(([q]) => faqId(q)), ...others],
    keys: ['course class learn training certification batch', offer.category, detail.level, detail.path, detail.whoFor.join(' '), detail.modules.map((m) => m.title).join(' '), offer.inclusions.join(' ')].join(' '),
  };
  const answers = detail.faqs.map(([q, a]) => ({id: faqId(q), label: q, text: [a], links: sharedCourseFaqs.has(q) ? [['Ask on WhatsApp', '/book-consultation']] : [['See the full course', `/courses/${offer.slug}`]], next: ['courses', 'booking']}));
  return [course, ...answers];
}

export function guideEntries() {
  const predicted = predictionStats();
  const entries = [
    {
      id: 'start', label: 'Main menu',
      text: ['Namaste 🙏 I’m the NumericcVaastu site guide. I can help you choose a consultation or course, explain fees and booking, or find anything on this website.', 'Pick an option below, or type your question.'],
      next: ['find-consult', 'courses', 'booking', 'fees', 'calculator', 'contact', 'about', 'more'],
      keys: 'hi hii hello hey namaste namaskar menu help start options',
    },
    {
      id: 'more', label: 'More topics',
      text: ['Here is everything else on the site.'],
      next: ['achievements', 'book', 'predictions', 'podcasts', 'videos', 'reviews', 'gallery', 'journal', 'policies'],
      keys: 'other topics more explore',
    },
    {
      id: 'thanks', label: 'Thank you', hidden: true,
      text: ['You’re welcome! Is there anything else I can help you find?'],
      next: ['start', 'contact'],
      keys: 'thanks thank you dhanyavad shukriya great ok okay',
    },
    // On a tie the earlier entry wins, so general answers come before specific ones.
    ...faqs.map(([q, a]) => ({id: faqId(q), label: q, text: [a], next: ['booking', 'find-consult', 'courses']})),
    {
      id: 'booking', label: 'How do I book?',
      text: ['Booking takes under a minute and happens on WhatsApp:'],
      list: {title: '', items: ['Choose a consultation or course, or simply ask a question.', 'Add a few details like your name and date of birth.', 'Send the ready-made message from your own WhatsApp. Adarshh replies personally to confirm the time, fee and next steps.']},
      links: [['Start booking', '/book-consultation'], ['Call ' + contact.phone, contact.phoneHref]],
      next: [faqId('How do I pay?'), faqId('What should I prepare for a consultation?'), 'formats', 'find-consult'],
      keys: 'book booking appointment slot schedule enquiry enquire register enrol join reserve whatsapp',
    },
    {
      id: 'formats', label: 'Online or in person?',
      text: ['Numerology consultations can be a video call (Google Meet or Zoom), a phone call, or in person at the Rohini, Delhi office.', 'Vaastu consultations are done online with your floor plan and photos, or as a site visit in Delhi NCR (travel confirmed separately).', 'Sessions are in Hindi or English, whichever you prefer.'],
      next: ['booking', 'contact'],
      keys: 'online offline in person video call zoom meet phone call visit site visit office location language hindi english remote',
    },
    {
      id: 'fees', label: 'Fees & prices',
      text: [offerCatalog.priceNote],
      list: {title: 'Listed fees', items: [...consultations, ...courses].map((o) => `${o.name}: ${formatPrice(o)}`)},
      links: [['See consultations', '/consultations#all-consultations'], ['See courses', '/courses']],
      next: [faqId('How do I pay?'), 'booking', 'find-consult'],
      keys: 'fee fees price prices cost charges rate rates amount kitna paisa rupees inr how much expensive',
    },
    {
      id: 'calculator', label: 'Free numerology calculator',
      title: 'Your free Lo Shu report',
      text: ['Enter your date of birth for your Mulank, Bhagyank and Kua, the planes and yogs in your grid, your friend and enemy numbers, lucky colours, first remedies, your gemstone and the life period you are in now.'],
      links: [['Open the calculator', '/numerology-calculator']],
      next: ['find-consult', 'courses'],
      keys: 'calculator calculate free report lo shu loshu grid mulank bhagyank kua date of birth dob birthday lucky number colour color gemstone remedies missing numbers chart',
    },
    {
      id: 'contact', label: 'Contact the team',
      title: 'Phone, email and office address',
      text: [`Phone and WhatsApp: ${contact.phone}`, `Email: ${contact.email}`, `Office: ${contact.addressLines.join(', ')}`],
      links: [['Call now', contact.phoneHref], ['WhatsApp', social.whatsapp], ['Email', `mailto:${contact.email}`], ['Open in Google Maps', contact.mapUrl]],
      next: ['booking', 'formats'],
      keys: 'contact phone call number email mail address office location where rohini delhi map visit reach talk speak team whatsapp',
    },
    {
      id: 'find-consult', label: 'Help me choose a consultation',
      text: ['Adarshh offers ' + consultations.length + ' one-to-one consultations. What would you like guidance on?'],
      links: [['Compare all consultations', '/consultations#all-consultations']],
      next: consultations.map(offerId),
      keys: 'which consultation choose suitable right session problem guidance personal reading appointment',
    },
    ...consultations.map(consultationEntry),
    {
      id: 'courses', label: 'Explore courses',
      title: 'Three learning paths',
      text: ['Each path builds on the one before: first the method, then professional practice, then teaching and leadership. All are taught by Adarshh Panndey.'],
      list: {title: 'The paths', items: courses.map((c) => `${c.name} (${getCourseDetail(c.id).level}): ${formatPrice(c)}`)},
      links: [['Compare the courses', '/courses']],
      next: [...courses.map(offerId), faqId(faqs[0][0])],
      keys: 'course courses learn learning study academy class training teach become numerologist certification certificate',
    },
    ...courses.flatMap(courseEntries),
    {
      id: 'about', label: 'About Adarshh Panndey',
      text: ['Adarshh Panndey is the founder of NumericcVaastu. He began his career in the pharmaceutical industry before moving into numerology and education, and now runs a consulting practice and an academy.', `${stat('Years of practice')} years of practice, ${stat('Consultations')} consultations, and author of ${book.fullTitle}.`],
      links: [['Read his story', '/about'], ['See his achievements', '/achievements']],
      next: ['achievements', 'book', 'find-consult'],
      keys: 'adarshh adarsh aadarsh panndey pandey founder who numerologist experience story background guru sir',
    },
    {
      id: 'achievements', label: 'Awards & achievements',
      text: [`${achievementCount} awards and recognitions so far, including:`],
      list: {title: '', items: highlights.map((h) => `${h.title}${h.year ? ` (${h.year})` : ''}`)},
      links: [['See all achievements', '/achievements']],
      next: ['about', 'book', 'predictions'],
      keys: 'award awards achievement achievements recognition certificate honour honor trophy 40 under 40 press media feature',
    },
    {
      id: 'book', label: 'His book',
      title: book.fullTitle,
      text: [`${book.feature}, and winner of GuruCool’s Book of the Year 2025.`],
      links: [['Buy on Amazon', book.amazon]],
      next: ['about', 'courses'],
      keys: 'book author numbers that speak amazon read buy',
    },
    {
      id: 'predictions', label: 'Predictions',
      text: [`Predictions Adarshh made on record in his videos. ${predicted.cameTrue} have come true, each checked against news reports, and ${predicted.awaiting} are still awaiting their date.`],
      links: [['See the predictions', '/predictions']],
      next: ['podcasts', 'videos'],
      keys: 'prediction predictions forecast election politics gold market came true future bhavishya',
    },
    {
      id: 'podcasts', label: 'Podcasts',
      text: [`Watch ${appearances.length + ownShow.length}+ podcast conversations with Adarshh on mobile numbers, names and birth dates, the Lo Shu grid, career, karma and remedies.`],
      links: [['Watch the podcasts', '/podcasts'], ['YouTube channel', social.youtube]],
      next: ['predictions', 'videos'],
      keys: 'podcast podcasts interview episode show youtube watch listen',
    },
    {
      id: 'videos', label: 'Videos & reels',
      text: ['Short videos and reels from Adarshh are on the home page, YouTube and Instagram.'],
      links: [['Watch on the home page', '/#watch'], ['YouTube', social.youtube], ['Instagram', social.instagram]],
      next: ['podcasts', 'reviews'],
      keys: 'video videos reel reels instagram youtube social shorts',
    },
    {
      id: 'reviews', label: 'Client reviews',
      text: [`Read ${googleReviews.length} Google reviews and watch students talk about their courses on video.`],
      links: [['Read the reviews', '/testimonials']],
      next: ['find-consult', 'courses'],
      keys: 'review reviews testimonial testimonials feedback rating google experience students genuine trust',
    },
    {
      id: 'gallery', label: 'Photo gallery',
      text: ['Awards, talks, studio interviews, students and portraits from Adarshh’s work.'],
      links: [['Open the gallery', '/gallery']],
      next: ['achievements', 'videos'],
      keys: 'gallery photo photos pictures images events',
    },
    {
      id: 'journal', label: 'Articles & guides',
      text: ['Short guides from the NumericcVaastu journal:'],
      links: [['Open the journal', '/blog']],
      next: posts.map((p) => `post-${p.slug}`),
      keys: 'blog journal article articles guide guides read learn basics',
    },
    ...posts.map((p) => ({
      id: `post-${p.slug}`, label: p.cover.title,
      title: p.title,
      text: [p.description, p.sections[0][1]],
      links: [['Read the article', `/blog/${p.slug}`]],
      next: ['journal', 'courses'],
      keys: [p.category, p.sections.map(([h]) => h).join(' ')].join(' '),
    })),
    {
      id: 'policies', label: 'Policies & refunds',
      text: ['Numerology and Numeric Vaastu are traditional interpretive frameworks. Consultations and courses offer a perspective for reflection and education, and do not guarantee outcomes or replace medical, legal or financial advice.', 'Ask the team for the written refund, cancellation and rescheduling terms before you pay.'],
      links: [['Refunds', '/refund-policy'], ['Terms', '/terms-and-conditions'], ['Privacy', '/privacy-policy'], ['Disclaimer', '/disclaimer']],
      next: ['contact'],
      keys: 'policy policies refund cancel cancellation reschedule privacy terms conditions disclaimer data guarantee',
    },
  ];
  // A course FAQ shared by several courses appears once; the first copy wins.
  const seen = new Set();
  return entries.filter((e) => !seen.has(e.id) && seen.add(e.id));
}
