import {test,expect} from '@playwright/test';

test('catalogue routes, price parity, and enquiry draft',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/consultations');
 await expect(page.getByRole('heading',{name:/Guidance made personal/})).toBeVisible();
 const priceCard=page.getByRole('article').filter({has:page.getByRole('link',{name:'Personal Numerology Blueprint Session'})}).first();
 const price=await priceCard.locator('strong').last().textContent();
 await priceCard.getByRole('link',{name:'Personal Numerology Blueprint Session',exact:true}).click();
 await expect(page.locator('.detail-price strong')).toHaveText(price);
 await page.getByRole('link',{name:'Request a consultation'}).first().click();
 await expect(page.getByLabel('Choose a consultation')).toHaveValue('consult-blueprint');
 await expect(page.locator('.booking-selected')).toContainText(price);
 await page.getByLabel('Your name').fill('Test Visitor');
 await page.getByLabel('Email address').fill('visitor@example.com');
 const download=page.waitForEvent('download');
 await page.getByRole('button',{name:'Save enquiry draft'}).click();
 expect((await download).suggestedFilename()).toBe('numericcvaastu-enquiry.txt');
 await expect(page.getByRole('status')).toContainText('No enquiry has been submitted');
 expect(errors).toEqual([]);
});

test('homepage calculator, slideshow and video tabs',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');
 await expect(page.getByRole('heading',{level:1})).toContainText('Know your numbers');
 await page.getByLabel('Your date of birth').fill('1990-05-23');
 await page.getByRole('button',{name:'Show my numbers'}).click();
 await expect(page.locator('.hv-loshu__numbers strong')).toHaveText(['5','2']);
 await expect(page.locator('.hv-loshu__missing')).toHaveText('Missing from your grid: 4, 6, 7, 8');
 await expect(page.locator('.hv-stage__slide.is-active')).toHaveCount(1);
 await page.getByRole('tab',{name:/Instagram Reels/}).click();
 await expect(page.getByRole('tab',{name:/Instagram Reels/})).toHaveAttribute('aria-selected','true');
 expect(errors).toEqual([]);
});

test('pricing redirects to courses',async({page})=>{
 await page.goto('/pricing');
 await expect(page).toHaveURL(/\/courses$/);
});

test('gallery opens and closes accessibly',async({page})=>{
 await page.goto('/gallery');
 await page.getByRole('button',{name:/Open Portraits photograph, 1 of 40/}).click();
 await expect(page.getByRole('dialog',{name:'Image viewer'})).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog',{name:'Image viewer'})).not.toBeVisible();
 await page.getByRole('button',{name:'Certificates',exact:true}).click();
 await expect(page.locator('.gallery-tile')).toHaveCount(6);
});

test('loader preview follows progress and can close',async({page})=>{
 await page.goto('/loader-preview');
 await page.getByRole('button',{name:'Preview this flow'}).first().click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByRole('status')).toContainText('Step 1 of 3');
 await page.getByRole('button',{name:'Close progress preview'}).click();
 await expect(page.getByRole('dialog')).not.toBeVisible();
});

for(const width of [375,768,1024,1440]){
 test(`responsive pages ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  for(const route of ['/','/courses','/consultations','/courses/numerology-career-launchpad','/gallery','/book-consultation']){
   await page.goto(route);
   await page.evaluate(()=>document.fonts.ready);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route).toBe(true);
  }
  if(width===375){await page.getByRole('button',{name:'Open navigation'}).click();await expect(page.getByRole('navigation').getByRole('link',{name:'Gallery'})).toBeVisible()}
 });
}
