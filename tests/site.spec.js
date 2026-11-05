import {test,expect} from '@playwright/test';

test('consultation page, WhatsApp enquiry and checkout',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/consultations');
 await expect(page.getByRole('heading',{name:/Not sure which consultation/})).toBeVisible();
 await expect(page.locator('.cs__box')).toHaveCount(6);
 const priceCard=page.getByRole('article').filter({has:page.getByRole('link',{name:'Personal Numerology Blueprint Session'})}).first();
 const price=await priceCard.locator('strong').last().innerText();
 await priceCard.getByRole('link',{name:'Personal Numerology Blueprint Session',exact:true}).click();
 await expect(page.locator('.csd-hero .cd-price strong')).toHaveText(price,{useInnerText:true});
 await page.getByRole('link',{name:/Ask first/}).click();
 await expect(page.locator('.eq-chosen strong')).toHaveText('Personal Numerology Blueprint Session');
 await page.getByLabel('Your name').fill('Test Visitor');
 await page.getByRole('button',{name:/Preview message/}).click();
 const href=await page.locator('a.eq-send').getAttribute('href');
 expect(href).toContain('https://wa.me/919870197315?text=');
 expect(decodeURIComponent(href.split('text=')[1])).toContain(price);
 await page.goto('/checkout?offer=consult-blueprint',{waitUntil:'networkidle'});
 await expect(page.locator('.co-summary__total strong')).toHaveText(price);
 await page.getByLabel('Your name').fill('Test Visitor');await page.getByLabel('Your WhatsApp number',{exact:true}).fill('9876543210');await page.getByLabel('Email',{exact:true}).fill('test@example.com');await page.getByLabel('City').fill('Delhi');
 await page.getByLabel('How would you like to meet?').selectOption({index:1});await page.getByLabel('Preferred language').selectOption('Hindi');
 await page.getByLabel('Preferred date').fill(new Date(Date.now()+2*86400000).toISOString().slice(0,10));await page.getByLabel('Preferred time').selectOption({index:1});
 await page.getByRole('button',{name:/Continue/}).click();
 await page.getByLabel(/full name, as on documents/).fill('Test Visitor');
 await page.getByLabel('Date of birth').fill('1990-05-23');await page.getByLabel('Place of birth').fill('Delhi');await page.getByLabel('Gender').selectOption('Female');await page.getByLabel(/What would you like to ask/).fill('Career direction');
 await page.getByRole('button',{name:/Continue/}).click();
 await expect(page.getByRole('heading',{name:'Review your booking'})).toBeVisible();
 await expect(page.locator('.co-review')).toContainText('23 May 1990');
 expect(errors).toEqual([]);
});

test('podcasts and predictions pages',async({page})=>{
 await page.goto('/podcasts');
 await expect(page.getByRole('heading',{level:1})).toContainText('podcasts');
 await page.getByRole('button',{name:/^Predictions/}).click();
 await expect(page.locator('.pc-card').first()).toBeVisible();
 await page.goto('/predictions');
 const outcomeFilter=page.getByRole('button',{name:/^Came true/});
 await outcomeFilter.click();
 await expect(outcomeFilter).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.pr-card.is-awaiting')).toHaveCount(0);
 for(const card of await page.locator('.pr-card').all()) await expect(card.locator('.is-outcome a')).toHaveAttribute('href',/^https:/);
});

test('homepage free tools, slideshow and video tabs',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');
 await expect(page.getByRole('heading',{level:1})).toContainText('Know your numbers');
 await expect(page.getByRole('link',{name:/Lo Shu numerology.*Open the tool/})).toHaveAttribute('href','/numerology-calculator');
 await expect(page.getByRole('link',{name:/Vedic numerology.*Open the tool/})).toHaveAttribute('href','/vedic-numerology-calculator');
 await expect(page.locator('.hv-stage__slide.is-active')).toHaveCount(1);
 await page.getByRole('tab',{name:/Instagram Reels/}).click();
 await expect(page.getByRole('tab',{name:/Instagram Reels/})).toHaveAttribute('aria-selected','true');
 expect(errors).toEqual([]);
});

test('full numerology report reads the date from the link',async({page})=>{
 await page.goto('/numerology-calculator?dob=1996-04-15&g=male');
 await expect(page.locator('.nv-num strong')).toHaveText(['6','8','4']);
 await expect(page.locator('.nv-planes li.is-full b')).toHaveText(['Practical plane','Will plane','Golden Yog (Raj Yog)']);
 await expect(page.locator('.nv-kua h3')).toContainText('Four favourable directions');
 await expect(page.locator('.nv-kua .nv-direction-table tbody tr')).toHaveCount(4);
});

test('pricing redirects to courses',async({page})=>{
 await page.goto('/pricing');
 await expect(page).toHaveURL(/\/courses$/);
});

test('gallery opens and closes accessibly',async({page})=>{
 await page.goto('/gallery');
 await page.getByRole('button',{name:/Open Portraits photograph, 1 of \d+/}).click();
 await expect(page.getByRole('dialog',{name:'Image viewer'})).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog',{name:'Image viewer'})).not.toBeVisible();
 for(const name of ['Certificates','With students']){
  const filter=page.locator('.gallery-filters button',{hasText:name});
  await filter.click();
  const expected=Number(await filter.locator('span').textContent());
  expect(expected).toBeGreaterThan(0);
  await expect(page.locator('.gallery-tile')).toHaveCount(expected);
 }
});

test('loader preview follows progress and can close',async({page})=>{
 await page.goto('/loader-preview',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Preview this flow'}).first().click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByRole('status')).toContainText('Step 1 of 3');
 await page.getByRole('button',{name:'Close progress preview'}).click();
 await expect(page.getByRole('dialog')).not.toBeVisible();
});

for(const width of [375,768,1024,1440]){
 test(`responsive pages ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  for(const route of ['/','/courses','/consultations','/courses/numerology-career-launchpad','/numerology-calculator','/vedic-numerology-calculator','/gallery','/book-consultation']){
   await page.goto(route);
   await page.evaluate(()=>document.fonts.ready);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route).toBe(true);
  }
  if(width===375){await page.getByRole('button',{name:'Open navigation'}).click();const nav=page.getByRole('navigation',{name:'Main navigation',exact:true});await nav.getByRole('button',{name:'Watch & read',exact:true}).click();await expect(nav.getByRole('link',{name:'Gallery',exact:true})).toBeVisible()}
 });
}

test('friend and enemy numbers follow the compatibility chart',async({page})=>{
 // The chart's own worked example: personality (Mulank) 6 with destiny (Bhagyank) 1.
 await page.goto('/numerology-calculator?dob=1983-01-06');
 const result=page.locator('.nv-compat__result');
 await expect(result.locator('.is-friend')).toHaveText(['1','2','5','6','7','9']);
 await expect(result.locator('.is-enemy')).toHaveText(['3','8']);
 await expect(page.locator('.nv-swatches').last()).toHaveText(/Yellow.*Black/);
 await expect(page.locator('#full-report')).toContainText('six years ahead');
});

test('local pages, shop and Google Business Profile',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/numerologist-in-delhi');
 await expect(page.getByRole('heading',{level:1})).toContainText('Numerologist in Delhi');
 await expect(page.getByRole('link',{name:/Write a Google review/}).first()).toHaveAttribute('href',/share\.google|g\.page/);
 await expect(page.locator('.hv-faq__list details')).toHaveCount(4);
 await expect(page.locator('.loc-places a')).toHaveCount(7);
 await page.getByRole('button',{name:'Switch language to Hindi'}).click();
 await expect(page.getByRole('heading',{level:1})).toContainText('दिल्ली में अंक ज्योतिषी');
 await page.getByRole('button',{name:'भाषा अंग्रेज़ी में बदलें'}).click();
 await page.goto('/online-numerology-consultation');
 await expect(page.locator('.loc-fees tbody tr')).toHaveCount(11);
 await page.goto('/');
 const shop=page.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('link',{name:'Shop',exact:true});
 if(await shop.isVisible()){await expect(shop).toHaveAttribute('href','https://numericcvaastucrystal.in/');await expect(shop).toHaveAttribute('target','_blank')}
 await expect(page.locator('a.hv-near__shop')).toHaveAttribute('href','https://numericcvaastucrystal.in/');
 await expect(page.locator('.hv-near__places li')).toHaveCount(8);
 await expect(page.locator('footer').getByRole('link',{name:'Find us on Google'})).toBeVisible();
 expect(errors).toEqual([]);
});
