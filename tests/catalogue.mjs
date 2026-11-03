import assert from 'node:assert/strict';
import fs from 'node:fs';
import {locations} from '../src/data/locations.js';
import {offerCatalog,courses,consultations,formatPrice,getPricePaise,getActivePromotion,getCurrentCoursePromotion,assertOfferCatalog} from '../src/data/offers.ts';
assertOfferCatalog();
assert.equal(courses.length,3);assert.equal(consultations.length,11);
assert(offerCatalog.offers.every(offer=>!offer.checkoutEnabled));
assert.deepEqual(offerCatalog.offers.filter(offer=>offer.priceVerified).map(offer=>offer.id),['course-launchpad']);
for(const offer of offerCatalog.offers){
 const detail=`.next/server/app/${offer.kind==='course'?'courses':'consultations'}/${offer.slug}.html`;
 assert(fs.existsSync(detail),`missing detail page ${detail}`);
 const detailHtml=fs.readFileSync(detail,'utf8');
 assert(detailHtml.includes(formatPrice(offer)),`detail price mismatch ${offer.id}`);
 const listingHtml=fs.readFileSync(`.next/server/app/${offer.kind==='course'?'courses':'consultations'}.html`,'utf8');
 assert(listingHtml.includes(formatPrice(offer)),`listing price mismatch ${offer.id}`);
 assert(listingHtml.includes(offer.name.replaceAll('&','&amp;')),`listing name missing ${offer.id}`);
}
assert(!fs.existsSync('.next/server/app/pricing.html'),'pricing page should be retired');
const homepage=fs.readFileSync('.next/server/app/index.html','utf8');
const featured=offerCatalog.offers.find(offer=>offer.id===offerCatalog.featuredOfferId);
assert(featured&&homepage.includes(featured.name)&&homepage.includes(formatPrice(featured)));
assert(homepage.includes('Compare all courses'));
assert(!homepage.includes('15,000+')&&!homepage.includes('500+'));
const sitemap=fs.readFileSync('.next/server/app/sitemap.xml.body','utf8');
assert(offerCatalog.offers.every(offer=>sitemap.includes(`/${offer.kind==='course'?'courses':'consultations'}/${offer.slug}`)));
assert(!sitemap.includes('/loader-preview')&&!sitemap.includes('/privacy-policy')&&!sitemap.includes('/pricing'));
// Search and AI visibility: one canonical domain, local pages, shop, crawler access and llms.txt.
const canonicalOrigin='https://www.numericcvaastu.com';
assert(sitemap.includes(`${canonicalOrigin}/about`)&&!sitemap.includes('https://numericcvaastu.com/')&&!sitemap.includes('/shop'),'sitemap must use the www origin');
// All three domains work on their own: no host redirect, only canonical links to .com. /shop opens the crystal store.
const redirects=JSON.parse(fs.readFileSync('.next/routes-manifest.json','utf8')).redirects;
assert(!redirects.some(rule=>rule.has?.some(item=>item.type==='host')),'domains must not redirect to each other');
assert(redirects.some(rule=>rule.source==='/shop'&&rule.destination==='https://numericcvaastucrystal.in/'));
for(const location of locations){
 assert(sitemap.includes(`${canonicalOrigin}/${location.slug}`),`sitemap missing ${location.slug}`);
 const html=fs.readFileSync(`.next/server/app/${location.slug}.html`,'utf8');
 assert(html.includes(`<link rel="canonical" href="${canonicalOrigin}/${location.slug}"/>`),`canonical missing ${location.slug}`);
 assert(html.includes('"@type":"FAQPage"')&&html.includes('share.google'),`schema or Google profile missing ${location.slug}`);
}
for(const page of ['index','contact','about']){
 const html=fs.readFileSync(`.next/server/app/${page}.html`,'utf8');
 assert(!html.includes('href="https://numericcvaastu.com'),`${page} links the bare domain`);
 assert(html.includes('"@id":"https://www.numericcvaastu.com/#business"'),`${page} missing business schema`);
}
const robots=fs.readFileSync('.next/server/app/robots.txt.body','utf8');
assert(['GPTBot','OAI-SearchBot','ClaudeBot','PerplexityBot','Google-Extended'].every(bot=>robots.includes(`User-Agent: ${bot}`))&&robots.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`));
const llms=fs.readFileSync('.next/server/app/llms.txt.body','utf8');
assert(offerCatalog.offers.every(offer=>llms.includes(formatPrice(offer))&&llms.includes(formatPrice(offer,new Date(),'USD'))),'llms.txt prices out of date');
assert(llms.includes('Adarshh Panndey')&&llms.includes('Adarsh Pandey'));
const about=fs.readFileSync('.next/server/app/about.html','utf8');
assert(about.includes('Adarsh Pandey')&&about.includes('disambiguatingDescription'),'misspelt name must reach the About page');
const offer=offerCatalog.offers[0];
const future=new Date('2030-02-01T00:00:00Z');
assert.equal(getPricePaise(offer,future),offer.pricePaise);
assert.equal(getActivePromotion(offer.id,future),undefined);
const testPromotion={id:'test-catalogue-promo',label:'Test offer',offerIds:[offer.id],discountPaise:10000,startsAt:'2030-01-01T00:00:00Z',endsAt:'2030-03-01T00:00:00Z',enabled:true};
offerCatalog.promotions.push(testPromotion);
assert.equal(getPricePaise(offer,future),offer.pricePaise-10000);
assert.equal(getPricePaise(offer,new Date('2030-03-01T00:00:00Z')),offer.pricePaise);
assert.equal(getActivePromotion(offer.id,new Date('2029-12-31T23:59:59Z')),undefined);
assert.equal(getCurrentCoursePromotion(future)?.offer.id,offer.id);
assertOfferCatalog();
offerCatalog.promotions.pop();
console.log(`Catalog parity verified: ${offerCatalog.offers.length} offers, listings, detail pages, XML sitemap, checkout disabled. ${locations.length} local pages, robots.txt and llms.txt verified.`);
