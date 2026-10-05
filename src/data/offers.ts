/**
 * Single commercial source of truth.
 * Edit this file to add/retire offerings, change prices, or schedule promotions.
 * Amounts are integer paise; payment code must resolve the price on the server.
 * Existing-site prices are under review, so checkoutEnabled stays false.
 */
export type Offer = {
  id: string;
  slug: string;
  kind: 'course' | 'consultation';
  category: string;
  name: string;
  shortName?: string;
  summary: string;
  audience: string;
  outcome: string;
  inclusions: string[];
  pricePaise: number;
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
  startsAt: string;
  endsAt: string;
  enabled: boolean;
};

export const offerCatalog = {
  currency: 'INR' as const,
  featuredOfferId: 'course-launchpad',
  contactEmail: 'numericcvaastu@gmail.com',
  priceNote: 'Listed price from the existing website. Confirm current fee, taxes and availability before booking.',
  offers: [
    {id:'course-launchpad',slug:'numerology-career-launchpad',kind:'course',category:'Foundation',name:'Numerology Career Launchpad',summary:'Build a foundation in numerology and begin practising structured client readings.',audience:'Curious beginners and aspiring consultants',outcome:'Learn core calculations, the Lo Shu grid and an introductory consultation process.',inclusions:['12 core learning modules','Weekly live practice sessions','Consultation blueprint system','Name numerology training','Course and community access','Level 1 certification pathway'],pricePaise:2999900,priceVerified:false,checkoutEnabled:false,active:true,image:'/images/gallery/talk-audience-session.webp',source:'Existing NumericcVaastu website; confirm before launch'},
    {id:'course-accelerator',slug:'numerology-income-accelerator',kind:'course',category:'Application',name:'Numerology Income Accelerator',summary:'Deepen your numerology practice and learn to communicate a professional offer.',audience:'Learners with a working knowledge of numerology',outcome:'Practise advanced techniques, mentorship discussions and client communication.',inclusions:['Weekly live mentorship','Advanced name and mobile numerology','Vedic numerology integration','Consultation framework','Social media positioning toolkit','Corporate numerology topics'],pricePaise:7499900,priceVerified:false,checkoutEnabled:false,active:true,image:'/images/gallery/media-podcast-studio.webp',source:'Existing NumericcVaastu website; confirm before launch'},
    {id:'course-mastery',slug:'numerology-legacy-mastery',kind:'course',category:'Leadership',name:'Numerology Legacy Mastery',summary:'An advanced mentorship path for experienced practitioners developing their teaching and brand.',audience:'Experienced consultants seeking mentoring and leadership skills',outcome:'Explore advanced practice, teaching and building a sustainable professional presence.',inclusions:['12-month mastermind listed on the existing site','Advanced numerology resources','Brand incubator topics','Personal brand strategy','Acharya certification pathway','Community access'],pricePaise:25000000,priceVerified:false,checkoutEnabled:false,active:true,image:'/images/gallery/award-book-of-the-year.webp',source:'Existing NumericcVaastu website; confirm before launch'},
    {id:'consult-blueprint',slug:'personal-numerology-blueprint',kind:'consultation',category:'Personal',name:'Personal Numerology Blueprint Session',summary:'Explore a personal numerology reading based on your name and date of birth.',audience:'People seeking a personal perspective on their current questions',outcome:'Discuss your numbers, strengths and questions in a guided session.',inclusions:['Date of birth and life path discussion','Name and mobile number review','Personal strengths and patterns','Follow-up details to confirm'],pricePaise:1129900,priceVerified:false,checkoutEnabled:false,active:true,source:'Existing NumericcVaastu website; confirm before launch'},
    {id:'consult-career',slug:'career-growth-precision',kind:'consultation',category:'Personal',name:'Career Growth Precision Session',summary:'A numerological perspective on career choices and timing.',audience:'Professionals and students considering a career decision',outcome:'Reflect on direction, options and practical questions.',inclusions:['Career direction discussion','Job versus business questions','Timing discussion','Strengths and obstacles'],pricePaise:510000,priceVerified:false,checkoutEnabled:false,active:true,source:'Existing NumericcVaastu website; confirm before launch'},
    {id:'consult-relationship',slug:'relationship-compatibility',kind:'consultation',category:'Personal',name:'Relationship Compatibility Reading',summary:'Explore relationship patterns through traditional numerology.',audience:'Individuals and couples with relationship questions',outcome:'Consider compatibility and communication through an interpretive lens.',inclusions:['Individual number readings','Combined compatibility discussion','Relationship questions','Practical next steps'],pricePaise:510000,priceVerified:false,checkoutEnabled:false,active:true,source:'Existing NumericcVaastu website; confirm before launch'},
    {id:'consult-business',slug:'business-destiny-mapping',kind:'consultation',category:'Business',name:'Business Destiny Mapping Consultation',summary:'Consider business naming and founder numbers alongside your plans.',audience:'Founders and business owners',outcome:'Discuss name, brand and decision questions with a numerological perspective.',inclusions:['Founder and business number discussion','Business name review','Mobile number considerations','Numeric Vaastu topics'],pricePaise:2099900,priceVerified:false,checkoutEnabled:false,active:true,source:'Existing NumericcVaastu website; confirm before launch'},
    {id:'consult-baby-name',slug:'baby-name-numerology',kind:'consultation',category:'Family',name:'Baby Name Numerology Consultation',summary:'Explore possible names and the numerological meanings associated with them.',audience:'Expecting parents and families',outcome:'Review name options and the reasoning behind them.',inclusions:['Name options','Number alignment discussion','Explanation of the method'],pricePaise:749900,priceVerified:false,checkoutEnabled:false,active:true,source:'Existing NumericcVaastu website; confirm before launch'},
    {id:'consult-name',slug:'name-correction',kind:'consultation',category:'Personal',name:'Name Correction Consultation',summary:'Review the numerological interpretation of your name and possible alternatives.',audience:'People considering a personal name change',outcome:'Understand the proposed changes and their interpretive basis.',inclusions:['Current name analysis','Possible alternatives','Reasoning behind recommendations'],pricePaise:749900,priceVerified:false,checkoutEnabled:false,active:true,source:'Existing NumericcVaastu website; confirm before launch'},
    {id:'consult-mobile',slug:'mobile-number-energy',kind:'consultation',category:'Personal',name:'Mobile Number Energy Reading',summary:'Examine your current mobile number using the brand’s numerological framework.',audience:'People curious about number patterns in daily life',outcome:'Discuss the interpretation of your current number and possible choices.',inclusions:['Current number review','Compatibility discussion','Alternative number considerations'],pricePaise:510000,priceVerified:false,checkoutEnabled:false,active:true,source:'Existing NumericcVaastu website; confirm before launch'},
    {id:'consult-watch',slug:'wristwatch-analysis',kind:'consultation',category:'Specialist',name:'Wristwatch Analysis',summary:'A specialist interpretive session about watch placement and time symbolism.',audience:'People interested in a specialist numerology topic',outcome:'Discuss the traditional framework and how it is interpreted.',inclusions:['Watch placement discussion','Time symbolism','Questions and interpretation'],pricePaise:749900,priceVerified:false,checkoutEnabled:false,active:true,source:'Existing NumericcVaastu website; confirm before launch'},
    {id:'consult-signature',slug:'signature-analysis',kind:'consultation',category:'Specialist',name:'Signature Analysis Consultation',summary:'Explore a traditional interpretive reading of your signature.',audience:'People considering their personal or professional signature',outcome:'Review signature features and possible adjustments.',inclusions:['Signature review','Structure discussion','Optional adjustment ideas'],pricePaise:749900,priceVerified:false,checkoutEnabled:false,active:true,source:'Existing NumericcVaastu website; confirm before launch'},
    {id:'consult-home-vastu',slug:'residential-vastu',kind:'consultation',category:'Vaastu',name:'Residential Vastu Consultation',summary:'Review a home layout through traditional Vaastu principles.',audience:'Homeowners and families',outcome:'Discuss layout, directions and possible practical changes.',inclusions:['Residential layout review','Entrance and room discussion','Written action-plan details to confirm'],pricePaise:2099900,priceVerified:false,checkoutEnabled:false,active:true,source:'Existing NumericcVaastu website; confirm before launch'},
    {id:'consult-office-vastu',slug:'office-business-vastu',kind:'consultation',category:'Vaastu',name:'Office & Business Vastu Consultation',summary:'Review a workspace through traditional Vaastu principles.',audience:'Business owners and office teams',outcome:'Discuss spatial layout and potential practical changes.',inclusions:['Office layout review','Seating and department discussion','Action-plan details to confirm'],pricePaise:3199900,priceVerified:false,checkoutEnabled:false,active:true,source:'Existing NumericcVaastu website; confirm before launch'},
  ] satisfies Offer[],
  promotions: [] as Promotion[],
} as const;

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
export function getPricePaise(offer: Offer, now = new Date()): number {
  const promotion = getActivePromotion(offer.id, now);
  return promotion ? Math.max(0, offer.pricePaise - promotion.discountPaise) : offer.pricePaise;
}
export function formatPrice(offer: Offer, now = new Date()): string {
  return new Intl.NumberFormat('en-IN', {style:'currency',currency:offerCatalog.currency,maximumFractionDigits:0}).format(getPricePaise(offer, now)/100);
}
export function canCheckout(offer: Offer): boolean {
  return offer.active && offer.priceVerified && offer.checkoutEnabled;
}
export function assertOfferCatalog(): void {
  const ids = new Set<string>(); const routes = new Set<string>();
  for (const offer of offerCatalog.offers) {
    if (ids.has(offer.id) || routes.has(`${offer.kind}/${offer.slug}`)) throw new Error(`Duplicate offer: ${offer.id}`);
    ids.add(offer.id); routes.add(`${offer.kind}/${offer.slug}`);
    if (!Number.isSafeInteger(offer.pricePaise) || offer.pricePaise <= 0) throw new Error(`Invalid price: ${offer.id}`);
    if (offer.checkoutEnabled && !offer.priceVerified) throw new Error(`Unverified checkout: ${offer.id}`);
  }
  if (!offerCatalog.offers.some((offer) => offer.id === offerCatalog.featuredOfferId && offer.active && offer.kind === 'course')) throw new Error(`Invalid featured offer: ${offerCatalog.featuredOfferId}`);
  for (const promotion of offerCatalog.promotions) {
    if (Date.parse(promotion.startsAt) >= Date.parse(promotion.endsAt) || promotion.discountPaise <= 0 || !Number.isSafeInteger(promotion.discountPaise)) throw new Error(`Invalid promotion: ${promotion.id}`);
    for (const id of promotion.offerIds) {
      const offer = offerCatalog.offers.find((item) => item.id === id);
      if (!offer || promotion.discountPaise >= offer.pricePaise) throw new Error(`Invalid promotion target: ${promotion.id}/${id}`);
    }
  }
}
assertOfferCatalog();
