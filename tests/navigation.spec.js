import {test,expect} from '@playwright/test';

test('desktop menus expose catalogue links and close after navigation',async({page},testInfo)=>{
 await page.setViewportSize({width:1440,height:1000});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');
 const nav=page.getByRole('navigation',{name:'Main navigation',exact:true});
 await expect(nav.locator('.nv-nav-trigger')).toHaveCount(7);
 await expect(nav.getByRole('link',{name:'All pages',exact:true})).toHaveCount(0);
 await expect(nav.getByRole('link',{name:'Shop',exact:true})).toHaveAttribute('href','https://numericcvaastucrystal.in/');
 await nav.getByRole('button',{name:'Consultations',exact:true}).click();
 const panel=page.locator('#nv-panel-consultations');
 await expect(panel).toBeVisible();
 await expect(panel.locator('a[href^="/consultations/"]')).toHaveCount(11);
 await page.evaluate(()=>document.fonts.ready);
 await panel.locator('.nv-nav-feature img').evaluate(img=>img.decode().catch(()=>{}));
 await page.screenshot({path:testInfo.outputPath('desktop-consultations.png')});
 await panel.getByRole('link',{name:'Career',exact:true}).click();
 await expect(page).toHaveURL(/\/consultations\/career-growth-precision$/);
 await expect(panel).toBeHidden();
 await nav.getByRole('button',{name:'Free tools & reports',exact:true}).click();
 await expect(page.locator('#nv-panel-tools')).toBeVisible();
 await expect(page.locator('#nv-panel-consultations')).toBeHidden();
 await page.locator('#nv-panel-tools').getByRole('link',{name:/Vedic kundli calculator/}).click();
 await expect(page).toHaveURL(/\/vedic-numerology-calculator$/);
 await expect(nav.getByRole('button',{name:'Free tools & reports',exact:true})).toHaveClass(/is-current/);
 expect(errors).toEqual([]);
});

test('keyboard disclosure controls, Escape and outside click',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/');
 const trigger=page.locator('#nv-trigger-consultations');
 await trigger.focus();await page.keyboard.press('ArrowDown');
 await expect(page.locator('#nv-panel-consultations a').first()).toBeFocused();
 await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
 await expect(trigger).toHaveAttribute('aria-expanded','false');
 await page.keyboard.press('ArrowRight');await expect(page.locator('#nv-trigger-courses')).toBeFocused();
 await page.keyboard.press('Enter');await expect(page.locator('#nv-panel-courses')).toBeVisible();
 await page.keyboard.press('Escape');
 await page.locator('#nv-trigger-tools').click();
 await page.locator('.nv-navigation-scrim').click({position:{x:5,y:700}});
 await expect(page.locator('#nv-panel-tools')).toBeHidden();
});

test('page search filters destinations and accepts Hindi',async({page},testInfo)=>{
 await page.goto('/');
 await page.getByRole('button',{name:'Search the website'}).click();
 const search=page.getByRole('dialog',{name:'What are you looking for?'});
 await expect(search.getByRole('searchbox',{name:'Search pages'})).toBeFocused();
 await search.getByRole('searchbox',{name:'Search pages'}).fill('career');
 await search.getByLabel('Filter pages by category').selectOption('consultations');
 // The career session, and the Gurugram page whose summary mentions career.
 await expect(search.locator('.nv-search-results li')).toHaveCount(2);
 await expect(search.getByRole('link',{name:'Consultations Career'})).toHaveAttribute('href','/consultations/career-growth-precision');
 await page.screenshot({path:testInfo.outputPath('page-search.png')});
 await search.getByRole('searchbox').fill('unfindablexyz');
 await expect(search.getByText('No matching pages. Try a different word or category.')).toBeVisible();
 await page.keyboard.press('Escape');await expect(search).toBeHidden();
 await page.getByRole('button',{name:'Switch language to Hindi'}).click();
 await page.getByRole('button',{name:'वेबसाइट में खोजें'}).click();
 await page.getByRole('searchbox').fill('करियर');
 await page.getByLabel('श्रेणी के अनुसार पृष्ठ छाँटें').selectOption('consultations');
 await expect(page.locator('.nv-search-results li')).toHaveCount(2);
 await page.locator('.nv-search-results a[href="/consultations/career-growth-precision"]').click();
 await expect(page).toHaveURL(/\/consultations\/career-growth-precision$/);
});

test('mobile accordion keeps tool and report destinations reachable',async({page},testInfo)=>{
 await page.setViewportSize({width:375,height:900});await page.goto('/');
 const toggle=page.getByRole('button',{name:'Open navigation',exact:true});
 await toggle.click();
 const nav=page.getByRole('navigation',{name:'Main navigation',exact:true});
 await nav.getByRole('button',{name:'Free tools & reports',exact:true}).click();
 await expect(nav.getByRole('link',{name:/Lo Shu grid calculator/})).toBeVisible();
 await expect(nav.getByRole('link',{name:/Combined full report/})).toBeVisible();
 expect(await page.evaluate(()=>document.body.style.overflow)).toBe('hidden');
 await page.screenshot({path:testInfo.outputPath('mobile-tools.png')});
 await nav.getByRole('link',{name:/Vedic kundli calculator/}).click();
 await expect(page).toHaveURL(/\/vedic-numerology-calculator$/);
 await expect(page.getByRole('button',{name:'Open navigation',exact:true})).toHaveAttribute('aria-expanded','false');
 expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('button',{name:'Open navigation',exact:true})).toBeFocused();
});

for(const width of [375,768,1024,1440])test(`navigation fits both languages at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:950});await page.goto('/');
 for(const hindi of [false,true]){
  if(hindi)await page.getByRole('button',{name:'Switch language to Hindi'}).click();
  if(width<=1100)await page.getByRole('button',{name:hindi?'नेविगेशन खोलें':'Open navigation',exact:true}).click();
  // Every menu button opens; Shop is a link to the crystal store, checked in the desktop menu test.
  for(const trigger of await page.locator('button.nv-nav-trigger').all()){
   await trigger.click();
   await expect(trigger).toHaveAttribute('aria-expanded','true');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.keyboard.press('Escape');
 }
});

test('every internal navigation destination resolves',async({page,request})=>{
 test.setTimeout(90000);await page.goto('/');
 const paths=await page.locator('.nv-site-header a').evaluateAll(links=>[...new Set(links.map(link=>link.getAttribute('href')).filter(href=>href?.startsWith('/')).map(href=>href.split('#')[0]||'/'))]);
 for(const path of paths){const response=await request.get(path);expect(response.status(),path).toBe(200)}
});
