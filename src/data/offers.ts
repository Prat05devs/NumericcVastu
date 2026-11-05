/**
 * Single commercial source of truth.
 * Edit this file to add/retire offerings, change prices, or schedule promotions.
 * Amounts are integer paise (INR) and cents (USD); payment code must resolve the price on the server.
 * Visitors in India see and pay rupees; everyone else sees and pays dollars (lib/currency.js decides).
 * USD prices are fixed per offer. The October 2026 rule: double the rupee price, convert at ₹88 = $1 and
 * round up to the next $10 (₹29,999 → $690). Edit any USD amount directly; it does not follow the rupee price.
 * Every listed offering takes live payment at the price below (client approval, 4 November 2026). To pause one, set
 * checkoutEnabled: false; its page then sends visitors to WhatsApp instead.
 */
export type Offer = {
  id: string;
  slug: string;
  kind: 'course' | 'consultation' | 'report';
  category: string;
  name: string;
  shortName?: string;
  summary: string;
  audience: string;
  outcome: string;
  inclusions: string[];
  pricePaise: number;
  priceUsdCents: number;
  priceVerified: boolean;
  checkoutEnabled: boolean;
  active: boolean;
  image?: string;
  source: string;
};
export type Promotion = {
  id: string;
  label: string;
  offerIds: string[];
  discountPaise: number;
  /** Optional; without it the dollar price gets the same percentage off, rounded to whole dollars. */
  discountUsdCents?: number;
  startsAt: string;
  endsAt: string;
  enabled: boolean;
};

export type Currency = 'INR' | 'USD';

export const offerCatalog = {
  featuredOfferId: 'course-launchpad',
  contactEmail: 'numericcvaastu@gmail.com',
  priceNote: 'Pay securely online to book. After payment, the team contacts you to schedule your session.',
  offers: [
    {id:'course-launchpad',slug:'numerology-career-launchpad',kind:'course',category:'Foundation',name:'Numerology Career Launchpad',summary:'Build a foundation in numerology and begin practising structured client readings.',audience:'Curious beginners and aspiring consultants',outcome:'Learn core calculations, the Lo Shu grid and an introductory consultation process.',inclusions:['45 lessons in a 4-part syllabus','Weekly live practice sessions','Case studies and 5-step client analysis','Name correction and 3 levels of remedies','Course and community access','Level 1 certificate ceremony'],pricePaise:2999900,priceUsdCents:69000,priceVerified:true,checkoutEnabled:true,active:true,image:'/images/gallery/portrait-blue-suit-seated.webp',source:'Fee and syllabus confirmed by the client, 2 November 2026'},
    {id:'course-accelerator',slug:'numerology-income-accelerator',kind:'course',category:'Application',name:'Numerology Income Accelerator',summary:'A one-year mentorship covering complete numerology, consultation mastery, personal branding and business growth.',audience:'Learners and consultants building a full-time numerology practice',outcome:'Study numerology in depth and build the consultation, sales, branding and business systems of a professional practice.',inclusions:['1-year program in 10 phases','Weekly live Q&A and mentorship','Real client practice sessions','Personal branding and business growth','Bonus templates, scripts and AI tools','Certification on successful completion'],pricePaise:7499900,priceUsdCents:171000,priceVerified:true,checkoutEnabled:true,active:true,image:'/images/gallery/media-podcast-studio.webp',source:'Duration and syllabus confirmed by the client, 2 November 2026; listed fee approved for online payment, 4 November 2026'},
    {id:'course-mastery',slug:'numerology-legacy-mastery',kind:'course',category:'Leadership',name:'Numerology Legacy Mastery',summary:'The Income Accelerator programme plus a done-with-you practice: podcast, business setup, CRM and LMS, three months of social media and your website.',audience:'Experienced consultants seeking mentoring and leadership skills',outcome:'Explore advanced practice, teaching and building a sustainable professional presence.',inclusions:['Everything in the Numerology Income Accelerator','Podcast','Business setup','CRM and LMS','Social media services for 3 months','Website setup'],pricePaise:25000000,priceUsdCents:569000,priceVerified:true,checkoutEnabled:true,active:true,image:'/images/gallery/award-book-of-the-year.webp',source:'Listed price approved for online payment by the client, 4 November 2026'},
    {id:'consult-blueprint',slug:'personal-numerology-blueprint',kind:'consultation',category:'Personal',name:'Personal Numerology Blueprint Session',summary:'Explore a personal numerology reading based on your name and date of birth.',audience:'People seeking a personal perspective on their current questions',outcome:'Discuss your numbers, strengths and questions in a guided session.',inclusions:['Date of birth and life path discussion','Name and mobile number review','Personal strengths and patterns','Follow-up details to confirm'],pricePaise:1499900,priceUsdCents:35000,priceVerified:true,checkoutEnabled:true,active:true,source:'Direct consultation with Adarshh Panndey; fee set to ₹14,999 by the client, 4 November 2026'},
    {id:'consult-career',slug:'career-growth-precision',kind:'consultation',category:'Personal',name:'Career Growth Precision Session',summary:'A numerological perspective on career choices and timing.',audience:'Professionals and students considering a career decision',outcome:'Reflect on direction, options and practical questions.',inclusions:['Career direction discussion','Job versus business questions','Timing discussion','Strengths and obstacles'],pricePaise:510000,priceUsdCents:12000,priceVerified:true,checkoutEnabled:true,active:true,source:'Listed price approved for online payment by the client, 4 November 2026'},
    {id:'consult-relationship',slug:'relationship-compatibility',kind:'consultation',category:'Personal',name:'Relationship Compatibility Reading',summary:'Explore relationship patterns through traditional numerology.',audience:'Individuals and couples with relationship questions',outcome:'Consider compatibility and communication through an interpretive lens.',inclusions:['Individual number readings','Combined compatibility discussion','Relationship questions','Practical next steps'],pricePaise:750000,priceUsdCents:18000,priceVerified:true,checkoutEnabled:true,active:true,source:'Listed price approved for online payment by the client, 4 November 2026'},
    {id:'consult-business',slug:'business-destiny-mapping',kind:'consultation',category:'Business',name:'Business Destiny Mapping Consultation',summary:'Consider business naming and founder numbers alongside your plans.',audience:'Founders and business owners',outcome:'Discuss name, brand and decision questions with a numerological perspective.',inclusions:['Founder and business number discussion','Business name review','Mobile number considerations','Numeric Vaastu topics'],pricePaise:2099900,priceUsdCents:48000,priceVerified:true,checkoutEnabled:true,active:true,source:'Listed price approved for online payment by the client, 4 November 2026'},
    {id:'consult-partnership',slug:'business-partnership-compatibility',kind:'consultation',category:'Business',name:'Business & Partnership Compatibility Reading',summary:'Read your numbers beside your business partner’s before you sign, invest or grow together.',audience:'Founders, co-founders and anyone entering or reviewing a business partnership',outcome:'See where your numbers support each other, where friction is likely, and how roles and decisions could be shared.',inclusions:['Each partner’s numbers read','Partner compatibility discussion','Roles, money and decision-making','Timing for signing or launching','Practical next steps'],pricePaise:750000,priceUsdCents:18000,priceVerified:true,checkoutEnabled:true,active:true,source:'New consultation added and priced at ₹7,500 by the client, 5 November 2026; US price from the pricing rule (same as the ₹7,500 relationship reading)'},
    {id:'consult-baby-name',slug:'baby-name-numerology',kind:'consultation',category:'Family',name:'Baby Name Numerology Consultation',summary:'Explore possible names and the numerological meanings associated with them.',audience:'Expecting parents and families',outcome:'Review name options and the reasoning behind them.',inclusions:['Name options','Number alignment discussion','Explanation of the method'],pricePaise:749900,priceUsdCents:18000,priceVerified:true,checkoutEnabled:true,active:true,source:'Listed price approved for online payment by the client, 4 November 2026'},
    {id:'consult-name',slug:'name-correction',kind:'consultation',category:'Personal',name:'Name Correction Consultation',summary:'Review the numerological interpretation of your name and possible alternatives.',audience:'People considering a personal name change',outcome:'Understand the proposed changes and their interpretive basis.',inclusions:['Current name analysis','Possible alternatives','Reasoning behind recommendations'],pricePaise:749900,priceUsdCents:18000,priceVerified:true,checkoutEnabled:true,active:true,source:'Listed price approved for online payment by the client, 4 November 2026'},
    {id:'consult-mobile',slug:'mobile-number-energy',kind:'consultation',category:'Personal',name:'Mobile Number Energy Reading',summary:'Examine your current mobile number using the brand’s numerological framework.',audience:'People curious about number patterns in daily life',outcome:'Discuss the interpretation of your current number and possible choices.',inclusions:['Current number review','Compatibility discussion','Alternative number considerations'],pricePaise:510000,priceUsdCents:12000,priceVerified:true,checkoutEnabled:true,active:true,source:'Listed price approved for online payment by the client, 4 November 2026'},
    {id:'consult-watch',slug:'wristwatch-analysis',kind:'consultation',category:'Specialist',name:'Wristwatch Analysis',summary:'A specialist interpretive session about watch placement and time symbolism.',audience:'People interested in a specialist numerology topic',outcome:'Discuss the traditional framework and how it is interpreted.',inclusions:['Watch placement discussion','Time symbolism','Questions and interpretation'],pricePaise:749900,priceUsdCents:18000,priceVerified:true,checkoutEnabled:true,active:true,source:'Listed price approved for online payment by the client, 4 November 2026'},
    {id:'consult-signature',slug:'signature-analysis',kind:'consultation',category:'Specialist',name:'Signature Analysis Consultation',summary:'Explore a traditional interpretive reading of your signature.',audience:'People considering their personal or professional signature',outcome:'Review signature features and possible adjustments.',inclusions:['Signature review','Structure discussion','Optional adjustment ideas'],pricePaise:749900,priceUsdCents:18000,priceVerified:true,checkoutEnabled:true,active:true,source:'Listed price approved for online payment by the client, 4 November 2026'},
    {id:'consult-home-vastu',slug:'residential-vastu',kind:'consultation',category:'Vaastu',name:'Residential Vastu Consultation',summary:'Review a home layout through traditional Vaastu principles.',audience:'Homeowners and families',outcome:'Discuss layout, directions and possible practical changes.',inclusions:['Residential layout review','Entrance and room discussion','Written action-plan details to confirm'],pricePaise:2099900,priceUsdCents:48000,priceVerified:true,checkoutEnabled:true,active:true,source:'Listed price approved for online payment by the client, 4 November 2026'},
    {id:'consult-office-vastu',slug:'office-business-vastu',kind:'consultation',category:'Vaastu',name:'Office & Business Vastu Consultation',summary:'Review a workspace through traditional Vaastu principles.',audience:'Business owners and office teams',outcome:'Discuss spatial layout and potential practical changes.',inclusions:['Office layout review','Seating and department discussion','Action-plan details to confirm'],pricePaise:3199900,priceUsdCents:73000,priceVerified:true,checkoutEnabled:true,active:true,source:'Listed price approved for online payment by the client, 4 November 2026'},
  ] satisfies Offer[],
  promotions: [] as Promotion[],
} as const;

/**
 * The complete numerology report from the free calculator: a personal PDF, bought online and generated on the
 * server only after the payment is verified (app/api/report/*). It is not listed among courses or consultations.
 */
export const reportOffer: Offer = {
  id:'report-full',slug:'complete-numerology-report',kind:'report',category:'Report',name:'Complete Numerology Report',
  summary:'Your personal PDF report: Lo Shu and Vedic grids, name and phone numbers, missing numbers with remedies, six years ahead and an action plan.',
  audience:'Anyone who has tried the free calculator',outcome:'A 19-chapter PDF in English or Hindi, ready the moment the payment is confirmed.',
  inclusions:['19-chapter PDF report','English and Hindi','Clickable contents','Missing numbers with remedies'],
  pricePaise:39900,priceUsdCents:1000,priceVerified:true,checkoutEnabled:true,active:true,
  source:'₹399 set by the client, 4 November 2026; US price from the pricing rule (₹399 × 2 ÷ 88, rounded up to $10)',
};

export const courses = offerCatalog.offers.filter((offer) => offer.kind === 'course' && offer.active);
export const consultations = offerCatalog.offers.filter((offer) => offer.kind === 'consultation' && offer.active);
export function getOffer(kind: Offer['kind'], slug: string): Offer | undefined {
  return offerCatalog.offers.find((offer) => offer.kind === kind && offer.slug === slug && offer.active);
}
export function getActivePromotion(offerId: string, now = new Date()): Promotion | undefined {
  const time = now.getTime();
  return offerCatalog.promotions.find((promotion) => promotion.enabled && promotion.offerIds.includes(offerId) && time >= Date.parse(promotion.startsAt) && time < Date.parse(promotion.endsAt));
}
export function getCurrentCoursePromotion(now = new Date()): {promotion: Promotion; offer: Offer} | undefined {
  const active = offerCatalog.promotions
    .filter((promotion) => promotion.enabled && now.getTime() >= Date.parse(promotion.startsAt) && now.getTime() < Date.parse(promotion.endsAt))
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  for (const promotion of active) {
    const offer = courses.find((course) => promotion.offerIds.includes(course.id));
    if (offer) return {promotion, offer};
  }
}
/** Price in minor units (paise or cents) after any active promotion. */
export function getPrice(offer: Offer, currency: Currency = 'INR', now = new Date()): number {
  const promotion = getActivePromotion(offer.id, now);
  if (currency === 'INR') return promotion ? Math.max(0, offer.pricePaise - promotion.discountPaise) : offer.pricePaise;
  if (!promotion) return offer.priceUsdCents;
  const discount = promotion.discountUsdCents ?? Math.round(offer.priceUsdCents * promotion.discountPaise / offer.pricePaise / 100) * 100;
  return Math.max(0, offer.priceUsdCents - discount);
}
export function getPricePaise(offer: Offer, now = new Date()): number {
  return getPrice(offer, 'INR', now);
}
export function formatPrice(offer: Offer, now = new Date(), currency: Currency = 'INR'): string {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {style:'currency',currency,maximumFractionDigits:0}).format(getPrice(offer, currency, now)/100);
}
/** Both labels, for pages that are cached once and shown to visitors in and outside India. */
export function priceLabels(offer: Offer, now = new Date()): Record<Currency, string> {
  return {INR: formatPrice(offer, now, 'INR'), USD: formatPrice(offer, now, 'USD')};
}
export function canCheckout(offer: Offer): boolean {
  return offer.active && offer.priceVerified && offer.checkoutEnabled;
}
export function assertOfferCatalog(): void {
  const ids = new Set<string>(); const routes = new Set<string>();
  for (const offer of offerCatalog.offers as readonly Offer[]) {
    if (ids.has(offer.id) || routes.has(`${offer.kind}/${offer.slug}`)) throw new Error(`Duplicate offer: ${offer.id}`);
    ids.add(offer.id); routes.add(`${offer.kind}/${offer.slug}`);
    if (!Number.isSafeInteger(offer.pricePaise) || offer.pricePaise <= 0) throw new Error(`Invalid price: ${offer.id}`);
    if (!Number.isSafeInteger(offer.priceUsdCents) || offer.priceUsdCents <= 0) throw new Error(`Invalid USD price: ${offer.id}`);
    if (offer.checkoutEnabled && !offer.priceVerified) throw new Error(`Unverified checkout: ${offer.id}`);
  }
  if (!Number.isSafeInteger(reportOffer.pricePaise) || reportOffer.pricePaise <= 0 || !Number.isSafeInteger(reportOffer.priceUsdCents) || reportOffer.priceUsdCents <= 0) throw new Error('Invalid report price');
  if (!offerCatalog.offers.some((offer) => offer.id === offerCatalog.featuredOfferId && offer.active && offer.kind === 'course')) throw new Error(`Invalid featured offer: ${offerCatalog.featuredOfferId}`);
  for (const promotion of offerCatalog.promotions) {
    if (Date.parse(promotion.startsAt) >= Date.parse(promotion.endsAt) || promotion.discountPaise <= 0 || !Number.isSafeInteger(promotion.discountPaise)) throw new Error(`Invalid promotion: ${promotion.id}`);
    for (const id of promotion.offerIds) {
      const offer = offerCatalog.offers.find((item) => item.id === id);
      if (!offer || promotion.discountPaise >= offer.pricePaise) throw new Error(`Invalid promotion target: ${promotion.id}/${id}`);
      if (promotion.discountUsdCents !== undefined && (!Number.isSafeInteger(promotion.discountUsdCents) || promotion.discountUsdCents <= 0 || promotion.discountUsdCents >= offer.priceUsdCents)) throw new Error(`Invalid USD promotion target: ${promotion.id}/${id}`);
    }
  }
}
assertOfferCatalog();
