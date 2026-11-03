/**
 * Search (SEO) and AI-answer (GEO) data: who Adarshh Panndey is, the names people search for, and the title,
 * description and keywords of every page. See docs/SEO-KEYWORDS.md for the research behind these choices.
 *
 * Rules:
 * - Visible copy always spells the name "Adarshh Panndey" and the brand "NumericcVaastu". Misspellings people type
 *   (Adarsh Pandey, Numeric Vastu…) appear only in structured data, meta keywords, llms.txt and the About page's
 *   spelling note, so Google and AI assistants connect those searches to the right person.
 * - Titles lead with the search phrase, then the name. Descriptions answer the search in one sentence.
 * - Every claim must be supported on the page or in src/data (stats, awards, offers). No invented ratings.
 */
export const person = {
  name: 'Adarshh Panndey',
  alternateNames: [
    'Adarsh Pandey', 'Aadarsh Pandey', 'Adarshh Pandey', 'Adarsh Panndey', 'Aadarshh Panndey', 'Aadarshh Pandey',
    'Adarsh Pande', 'Adarsh Panday', 'Aadarsh Panday', 'Numerologist Adarshh', 'Numerologist Adarsh Pandey',
    'Numerologist Adarshh Pandey', 'Numerology by Aadarshh', 'आदर्श पांडेय', 'आदर्श पांडे',
  ],
  /** Many people share the name Adarsh Pandey; this tells search engines and assistants which one he is. */
  disambiguation: 'Numerologist and Vastu consultant in Rohini, New Delhi, India, founder of NumericcVaastu and author of Numerology: Numbers That Speak. Often searched as Adarsh Pandey.',
  jobTitles: ['Numerologist', 'Vastu Consultant', 'Numerology Teacher'],
  description: 'Adarshh Panndey is a numerologist and Vastu consultant based in Rohini, New Delhi, and the founder of NumericcVaastu. He gives personal numerology and Numeric Vaastu consultations in person and online, teaches numerology courses, and is the author of Numerology: Numbers That Speak.',
  linkedin: 'https://www.linkedin.com/in/adarshh-panndey-23075987/',
  youtubeChannel: 'https://www.youtube.com/channel/UCBkSfDIV6E-O2BPc6e46tZw',
};

export const brand = {
  name: 'NumericcVaastu',
  alternateNames: ['Numericc Vaastu', 'NumericVaastu', 'Numeric Vaastu', 'Numeric Vastu', 'NumericcVastu', 'Numericc Vastu', 'Numerology by Aadarshh'],
  slogan: 'Indian wisdom. A modern perspective.',
  description: 'NumericcVaastu is the numerology and Vastu practice and academy of Adarshh Panndey in Rohini, New Delhi: one-to-one numerology and Vastu consultations in person and online, and numerology courses from beginner to mentorship.',
  /** The course platform linked from Adarshh's Instagram profile. */
  learnUrl: 'https://learn.numericcvaastu.com/',
  knowsAbout: [
    'Numerology', 'Vedic numerology', 'Chaldean numerology', 'Lo Shu grid', 'Mulank (birth number)', 'Bhagyank (destiny number)',
    'Kua number', 'Name numerology', 'Name correction', 'Mobile number numerology', 'Baby name numerology', 'Business name numerology',
    'Signature analysis', 'Wristwatch numerology', 'Relationship compatibility', 'Career numerology', 'Vastu Shastra', 'Numeric Vaastu',
    'Residential Vastu', 'Office Vastu', 'Rudraksha', 'Crystals', 'Gemstones', 'Yantras',
  ],
};

/** Where Adarshh consults. In person at the Rohini office, site visits across Delhi NCR, online everywhere. */
export const serviceAreas = [
  ['Place', 'Rohini, New Delhi'], ['City', 'New Delhi'], ['City', 'Delhi'], ['City', 'Noida'], ['City', 'Greater Noida'],
  ['City', 'Gurugram'], ['City', 'Ghaziabad'], ['City', 'Faridabad'], ['AdministrativeArea', 'National Capital Region (Delhi NCR)'],
  ['AdministrativeArea', 'Uttar Pradesh'], ['AdministrativeArea', 'Haryana'], ['AdministrativeArea', 'Punjab'], ['AdministrativeArea', 'Uttarakhand'],
  ['AdministrativeArea', 'Rajasthan'], ['Country', 'India'], ['Country', 'United States'], ['Country', 'United Kingdom'],
  ['Country', 'United Arab Emirates'], ['Country', 'Canada'], ['Country', 'Australia'], ['Country', 'Singapore'],
].map(([type, name]) => ({'@type': type, name}));

/** Added to every page's meta keywords. Meta keywords carry little weight with Google; titles, headings, copy and
 *  structured data do the ranking work. They are kept because some engines and AI crawlers still read them. */
const common = ['Adarshh Panndey', 'Adarsh Pandey', 'NumericcVaastu', 'numerologist in Delhi'];
/** The misspelt name searches, added to the pages most likely to answer them. */
const nameSearches = ['Adarsh Pandey numerologist', 'Adarsh Pandey numerology', 'Aadarsh Pandey numerologist', 'Adarsh Pandey Delhi', 'Adarsh Pandey vastu', 'numerologist Adarsh Pandey contact number', 'आदर्श पांडेय अंक ज्योतिषी'];

/** Static routes. Location pages keep their own data in data/locations.js. */
export const pageSeo = {
  '/': {
    title: 'Adarshh Panndey – Numerologist & Vastu Consultant, Delhi',
    description: 'Numerologist Adarshh Panndey (Adarsh Pandey), Rohini, Delhi: 20,000+ consultations. Name, mobile number, career and Vastu guidance, in person or online.',
    keywords: ['best numerologist in Delhi', 'numerologist near me', 'numerologist in Rohini', 'vastu consultant in Delhi', 'numerology consultation', 'numerology course', 'Lo Shu grid calculator', ...nameSearches, 'Numeric Vastu'],
  },
  '/about': {
    title: 'About Adarshh Panndey (Adarsh Pandey) – Numerologist',
    description: 'Adarshh Panndey (Adarsh Pandey): Delhi numerologist and Vastu consultant, founder of NumericcVaastu and author of Numerology: Numbers That Speak.',
    keywords: ['who is Adarshh Panndey', 'who is Adarsh Pandey', ...nameSearches, 'Aadarsh Pandey', 'numerologist biography', 'Numbers That Speak author', 'famous numerologist in Delhi'],
  },
  '/courses': {
    title: 'Numerology Courses Online & in Delhi – Adarshh Panndey',
    description: 'Three numerology courses with Adarshh Panndey: a beginner course, a one-year advanced program with mentorship, and a mastery and mentorship program.',
    keywords: ['numerology course', 'numerology course online', 'numerology course in Hindi', 'numerology course in Delhi', 'learn numerology', 'numerology certification course India', 'become a numerologist', 'advanced numerology course'],
  },
  '/consultations': {
    title: 'Numerology & Vastu Consultations – Adarshh Panndey',
    description: 'Eleven one-to-one sessions with Adarshh Panndey: personal reading, career, marriage, name correction, mobile number, baby name, signature, watch and Vastu.',
    keywords: ['numerology consultation', 'numerology consultation fees', 'numerologist consultation online', 'name correction numerology', 'mobile number numerology', 'vastu consultation', 'talk to numerologist'],
  },
  '/book-consultation': {
    title: 'Book a Numerology Consultation on WhatsApp – Adarshh Panndey',
    description: 'Book a numerology or Vastu consultation with Adarshh Panndey, or ask about a course, in under a minute on WhatsApp. Or call +91 98701 97315.',
    keywords: ['book numerology consultation', 'numerologist appointment Delhi', 'numerologist WhatsApp number', 'Adarshh Panndey contact number'],
  },
  '/testimonials': {
    title: 'Adarshh Panndey Reviews – Google Reviews & Student Feedback',
    description: 'Google reviews from people who consulted numerologist Adarshh Panndey, and students talking about his numerology courses on video.',
    keywords: ['Adarshh Panndey reviews', 'numerologist reviews Delhi', 'NumericcVaastu reviews'],
  },
  '/gallery': {
    title: 'Adarshh Panndey Photos – Awards, Talks, Students & Media',
    description: 'Awards, talks, studio interviews, students and portraits from numerologist Adarshh Panndey’s work with NumericcVaastu.',
    keywords: ['Adarshh Panndey photos', 'numerologist awards', 'numerology seminar Delhi'],
  },
  '/blog': {
    title: 'Numerology Articles – Lo Shu Grid & Numeric Vaastu Guides',
    description: 'Plain-language guides to numerology, the Lo Shu grid, Numeric Vaastu and preparing for a consultation, from the NumericcVaastu journal.',
    keywords: ['numerology articles', 'what is numerology', 'Lo Shu grid explained', 'numeric vastu', 'numerology for beginners'],
  },
  '/contact': {
    title: 'Contact Adarshh Panndey – Numerologist in Rohini, Delhi',
    description: 'Call or WhatsApp +91 98701 97315, email numericcvaastu@gmail.com, or visit NumericcVaastu in Sector 29, Rohini, New Delhi 110042. Reviews on Google.',
    keywords: ['Adarshh Panndey contact number', 'Adarsh Pandey contact number', 'Adarsh Pandey numerologist phone number', 'numerologist phone number Delhi', 'numerologist in Rohini address', 'NumericcVaastu office', 'numerologist near me'],
  },
  '/faq': {
    title: 'Numerology & Vastu FAQ – Fees, Online Sessions, Courses',
    description: 'Answers about Adarshh Panndey’s numerology and Vastu consultations: fees, online and in-person sessions, clients abroad, courses, and numerology’s limits.',
    keywords: ['numerologist fees Delhi', 'online numerology consultation', 'numerology FAQ', 'is numerology real'],
  },
  '/sitemap': {title: 'Site Map – NumericcVaastu', description: 'Every public page of NumericcVaastu: consultations, courses, free numerology calculators, podcasts, predictions, guides and contact details, in one place.', keywords: []},
  '/numerology-calculator': {
    title: 'Free Lo Shu Grid Calculator by Date of Birth',
    description: 'Free Lo Shu grid calculator by Adarshh Panndey: Mulank, Bhagyank, Kua number, missing numbers, planes, name number and mobile number compatibility.',
    keywords: ['Lo Shu grid calculator', 'numerology calculator by date of birth', 'Mulank calculator', 'Bhagyank calculator', 'Kua number calculator', 'missing numbers numerology', 'mobile number numerology calculator', 'name number calculator', 'free numerology report'],
  },
  '/vedic-numerology-calculator': {
    title: 'Free Vedic Numerology Calculator – Numerology Kundli',
    description: 'Free Vedic numerology kundli calculator: planetary number grid, Mulank and Bhagyank, Chaldean name number, mobile number compatibility and a full report.',
    keywords: ['Vedic numerology calculator', 'numerology kundli', 'Vedic numerology chart', 'Chaldean numerology calculator', 'numerology chart by date of birth'],
  },
  '/podcasts': {
    title: 'Adarshh Panndey Podcasts – Numerology Interviews in Hindi',
    description: 'Watch numerologist Adarshh Panndey on Podcast Baba, RSR Podcast, Kadak Chai Show and more: mobile numbers, Mulank predictions, name numerology and remedies.',
    keywords: ['numerology podcast Hindi', 'Adarshh Panndey podcast', 'Mulank predictions 2026', 'numerologist interview'],
  },
  '/predictions': {
    title: 'Numerology Predictions That Came True – Adarshh Panndey',
    description: 'Numerology predictions Adarshh Panndey made on video before they happened: the 2026 Bengal election, gold prices, IPL 2026 and more, each dated and sourced.',
    keywords: ['numerology predictions 2026', 'numerologist predictions came true', 'numerology prediction 2027', 'Adarshh Panndey predictions'],
  },
  '/achievements': {
    title: 'Adarshh Panndey Awards – 40 Under 40 & Coach of the Year',
    description: 'Awards and press for numerologist Adarshh Panndey: The Popular Story 40 Under 40 (2026), Numerology Career Coach of the Year 2026, Book of the Year 2025.',
    keywords: ['award-winning numerologist', 'Numerology Career Coach of the Year', 'best numerologist in India award', 'Adarshh Panndey achievements'],
  },
};

/** One record per offer: what people search for that this consultation or course answers, and its own questions. */
export const offerSeo = {
  'course-launchpad': {
    title: 'Numerology Course for Beginners – Adarshh Panndey',
    description: 'Beginner numerology course with Adarshh Panndey: driver, conductor and Kua numbers, the numeroscope, remedies, name correction and client practice.',
    keywords: ['numerology course for beginners', 'learn numerology online', 'numerology course in Hindi', 'numerology course in Delhi', 'numerology course syllabus', 'driver and conductor number course', 'numeroscope course', 'Lo Shu grid course', 'name correction course', 'numerology remedies course', 'numerology certification course India', 'become a numerologist', 'Numerology Professional Success Program'],
  },
  'course-accelerator': {
    title: '1-Year Numerology Program – Adarshh Panndey',
    description: 'A one-year numerology mentorship with Adarshh Panndey: name, mobile and business numerology, remedies, consultation skills, personal branding and growth.',
    keywords: ['numerology mentorship program', 'advanced numerology course', 'complete numerology course', 'professional numerologist training', 'business numerology course', 'mobile numerology course', 'name numerology course', 'numerology business coaching', 'numerology certification India'],
  },
  'course-mastery': {
    title: 'Numerology Mentorship Program – Adarshh Panndey',
    description: 'An advanced numerology mentorship with Adarshh Panndey for experienced consultants: advanced practice, teaching, personal brand and a certification pathway.',
    keywords: ['numerology mentorship program', 'numerology mastermind', 'numerology teacher training', 'advanced numerology course'],
  },
  'consult-blueprint': {
    title: 'Personal Numerology Reading by Name & Birth Date',
    description: 'A complete numerology reading with Adarshh Panndey: Mulank, Bhagyank, Lo Shu grid, name number and mobile number reviewed together. In Delhi or online.',
    keywords: ['personal numerology reading', 'numerology reading by date of birth', 'full numerology consultation', 'numerology consultation Delhi', 'Mulank Bhagyank reading'],
    faqs: [
      ['What does a personal numerology reading cover?', 'Your birth number (Mulank), destiny number (Bhagyank), the Lo Shu grid with its missing numbers, your name number and your mobile number, read together to discuss your strengths, patterns and the questions you bring.'],
      ['Is this the right first session?', 'Yes, if you have several questions or are not sure where to start. The focused sessions on career, relationships, names or mobile numbers go deeper into one question.'],
    ],
  },
  'consult-career': {
    title: 'Career Numerology Consultation – Adarshh Panndey',
    description: 'Career numerology by date of birth with Adarshh Panndey: job or business, direction and timing from your Mulank, Bhagyank and personal year. Delhi or online.',
    keywords: ['career numerology', 'career by date of birth', 'numerology for career', 'job or business numerology', 'personal year number career'],
    faqs: [
      ['Can numerology tell me whether to choose a job or business?', 'The session looks at the patterns in your numbers linked to leadership, independence and teamwork, and discusses them alongside your actual options. It gives perspective, not a guaranteed result.'],
      ['Why does the personal year matter for career timing?', 'In numerology each year carries a personal year number. Adarshh uses it to discuss when a change, a launch or a period of consolidation may feel more natural.'],
    ],
  },
  'consult-relationship': {
    title: 'Marriage & Love Compatibility Numerology – Adarshh Panndey',
    description: 'Marriage and love compatibility by date of birth with numerologist Adarshh Panndey: both partners’ numbers, friendly and challenging pairs, and next steps.',
    keywords: ['relationship compatibility numerology', 'marriage compatibility by date of birth', 'love compatibility numerology', 'numerology for marriage', 'couple compatibility reading'],
    faqs: [
      ['Do both partners need to share details?', 'Both dates of birth give the fullest reading. If only one is available, the session focuses on your own numbers and relationship patterns.'],
      ['Is numerology compatibility the same as kundli matching?', 'No. Kundli matching uses astrology. Numerology compatibility compares the birth and destiny numbers of both people through friendly, neutral and challenging number relationships.'],
    ],
  },
  'consult-business': {
    title: 'Business Name Numerology – Adarshh Panndey',
    description: 'Business and company name numerology with Adarshh Panndey: founder numbers, brand name, business mobile number and Numeric Vaastu for your workplace.',
    keywords: ['business name numerology', 'company name numerology', 'lucky business name', 'brand name numerology', 'numerology for business'],
    faqs: [
      ['Can you check a company name before I register it?', 'Yes. Bring the names you are considering. The session compares each with the founders’ numbers and explains the reasoning, so you can decide alongside the legal and branding checks you also need.'],
      ['Does the founder’s date of birth matter?', 'Yes. A business name is read against the numbers of the people running it, not on its own.'],
    ],
  },
  'consult-baby-name': {
    title: 'Baby Name Numerology by Date of Birth – Adarshh Panndey',
    description: 'Choose a baby name by numerology with Adarshh Panndey: name options checked against your baby’s date of birth, with the reasoning behind each spelling.',
    keywords: ['baby name numerology', 'baby name by date of birth', 'lucky baby name', 'baby name spelling numerology', 'newborn name numerology'],
    faqs: [
      ['Can you suggest names, or only check ours?', 'Both. Share the names your family likes and Adarshh checks them, or ask for options that suit the date of birth.'],
      ['Can it be done before the baby is born?', 'Name options can be discussed in advance; the final check uses the actual date of birth.'],
    ],
  },
  'consult-name': {
    title: 'Name Correction Numerology – Adarshh Panndey',
    description: 'Name correction by numerology with Adarshh Panndey: your current name number, spellings that suit your date of birth, and the reasoning behind each change.',
    keywords: ['name correction numerology', 'name spelling correction', 'lucky name spelling', 'numerology name change', 'Chaldean name numerology'],
    faqs: [
      ['Do I need to change my name legally?', 'Not necessarily. A corrected spelling is often used for signatures, profiles or business. A legal change of name is your own decision and needs its own legal steps.'],
      ['Which system is used for name numbers?', 'The Chaldean table, the same letter values used in the free calculator on this website.'],
    ],
  },
  'consult-mobile': {
    title: 'Lucky Mobile Number Numerology – Adarshh Panndey',
    description: 'Mobile number numerology with Adarshh Panndey: your number’s total, how it suits your Mulank, Bhagyank and name number, and what to look for in a new number.',
    keywords: ['mobile number numerology', 'lucky mobile number by date of birth', 'phone number numerology', 'lucky phone number', 'mobile number compatibility'],
    faqs: [
      ['Can I check my mobile number for free first?', 'Yes. The free calculator on this website shows your number’s total and its compatibility with your birth, destiny and name numbers. The session goes further and discusses alternatives.'],
      ['Do I have to change my number?', 'No. The session explains how your current number reads; any change is your choice.'],
    ],
  },
  'consult-watch': {
    title: 'Wristwatch Numerology – Adarshh Panndey',
    description: 'Wristwatch analysis with numerologist Adarshh Panndey: which wrist to wear a watch on, the watch that suits your numbers, and the time symbolism behind it.',
    keywords: ['wristwatch numerology', 'which hand to wear watch numerology', 'lucky watch', 'watch as per numerology', 'wristwatch vastu'],
    faqs: [
      ['Can I get a watch made for my numbers?', 'Yes. Wristwatches are made on demand through the NumericcVaastu store after the analysis. Ask on WhatsApp.'],
    ],
  },
  'consult-signature': {
    title: 'Signature Analysis Numerology – Adarshh Panndey',
    description: 'Signature analysis with Adarshh Panndey: how your signature is read, its structure and direction, and optional adjustments that suit your numbers.',
    keywords: ['signature analysis', 'lucky signature numerology', 'signature numerology', 'signature correction'],
    faqs: [
      ['What do I share for a signature analysis?', 'A clear photo of your usual signature on plain paper, shared on WhatsApp after booking.'],
    ],
  },
  'consult-home-vastu': {
    title: 'Home Vastu Consultant, Delhi NCR – Adarshh Panndey',
    description: 'Residential Vastu consultation with Adarshh Panndey: entrance, kitchen, bedrooms and directions reviewed from your floor plan, online or on site in Delhi NCR.',
    keywords: ['home vastu consultant', 'vastu for home', 'residential vastu consultant Delhi', 'vastu for flat', 'vastu consultant near me', 'numeric vastu'],
    faqs: [
      ['Can Vastu be checked before buying a flat?', 'Yes. Share the floor plan and the main door direction before you decide; it is easier to plan than to change later.'],
      ['Do you work with apartments as well as houses?', 'Yes. Many homes in Delhi NCR are apartments, so the focus is on what can be adjusted inside the space.'],
    ],
  },
  'consult-office-vastu': {
    title: 'Office & Shop Vastu, Delhi NCR – Adarshh Panndey',
    description: 'Office and business Vastu with Adarshh Panndey: entrance, seating and department placement reviewed from your plan, online or on site across Delhi NCR.',
    keywords: ['office vastu consultant', 'vastu for office', 'commercial vastu', 'shop vastu', 'business vastu consultant Delhi'],
    faqs: [
      ['Can the office stay open during the consultation?', 'Yes. An online consultation needs only the plan and photos, and a site visit is arranged at a time that suits you.'],
    ],
  },
};

export const defaultImage = '/images/adarshh/adarshh-pandey-portrait.webp';

/** Next.js metadata for a page: absolute title, description, keywords, canonical link and social cards. */
export function metadataFor(path, {title, description, keywords = [], image = defaultImage, noindex = false, type = 'website'}) {
  return {
    title: {absolute: title},
    description,
    keywords: [...new Set([...keywords, ...common])],
    alternates: {canonical: path},
    openGraph: {title, description, url: path, type, siteName: brand.name, locale: 'en_IN', images: [image]},
    twitter: {card: 'summary_large_image', title, description, images: [image]},
    ...(noindex && {robots: {index: false, follow: true}}),
  };
}

export const pageMetadata = (path, overrides = {}) => metadataFor(path, {...pageSeo[path], ...overrides});

export function offerMetadata(offer) {
  const seo = offerSeo[offer.id] || {title: `${offer.name} | Adarshh Panndey`, description: offer.summary};
  const path = `/${offer.kind === 'course' ? 'courses' : 'consultations'}/${offer.slug}`;
  return metadataFor(path, {...seo, image: offer.image || defaultImage});
}
