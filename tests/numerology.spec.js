import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
async function calculate(page,{name='Priya Sharma',phone='9876543210',gender='male'}={}) {
 await page.getByLabel('Your full name',{exact:true}).fill(name);
 await page.getByLabel('Phone number',{exact:true}).fill(phone);
 await page.getByLabel('Date of birth',{exact:true}).fill('1990-05-23');
 await page.locator('#hv-gender').selectOption(gender);
 await page.getByRole('button',{name:'Show my numbers',exact:true}).click();
}
for(const [route,title,expected] of [
 ['/numerology-calculator','Lo Shu kundli',['·','99','22','3','55','·','·','11','·']],
 ['/vedic-numerology-calculator','Vedic numerology kundli',['3','·','9','·','·','55','22','·','·']],
])test(`separate free tool at ${route}`,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(route);await calculate(page);
 await expect(page.getByTestId('name-analysis')).toContainText('29 → 2');
 await expect(page.getByTestId('phone-analysis')).toContainText('45 → 9');
 await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
 const grid=page.locator('.hv-loshu__grid');await expect(grid).toHaveCount(1);
 await expect(grid.locator('b')).toHaveText(expected);
 await page.getByLabel('Phone number',{exact:true}).fill('1111111111');
 await page.getByRole('button',{name:'Show my numbers',exact:true}).click();
 await expect(grid.locator('b')).toHaveText(expected);
 await expect(page.getByTestId('phone-analysis')).toContainText('10 → 1');
 await page.getByRole('button',{name:'Generate my full report',exact:true}).click();
 await expect(page.locator('.full-report .fr-grid')).toHaveCount(2);
 await expect(page.getByRole('heading',{name:'Your Vedic numerology reading',exact:true})).toBeVisible();
 expect(page.url()).not.toContain('Priya');expect(page.url()).not.toContain('1111111111');
 expect(errors).toEqual([]);
});
test('full report downloads locally and can switch language without losing calculations',async({page})=>{
 await page.goto('/numerology-calculator');await calculate(page);
 await page.getByRole('button',{name:'Generate my full report',exact:true}).click();
 await expect(page.locator('.full-report .fr-page')).toHaveCount(20);
 await expect(page.locator('.fr-name')).toHaveText('Priya Sharma');
 await expect(page.locator('.full-report')).toContainText('9876543210');
 await page.getByRole('button',{name:'Switch language to Hindi'}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','hi');
 await expect(page.getByRole('heading',{name:'आपके नाम का कैल्डियन विश्लेषण',exact:true})).toBeVisible();
 await expect(page.locator('.fr-name')).toHaveText('Priya Sharma');
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'रिपोर्ट डाउनलोड करें',exact:true}).click();
 const file=await downloaded;
 expect(file.suggestedFilename()).toBe('numericcvaastu-report-1990-05-23-hi.html');
 const html=await fs.readFile(await file.path(),'utf8');
 expect(html).toContain('<html lang="hi">');expect(html).toContain('Priya Sharma');
 expect(html).toContain('आपके अगले छह व्यक्तिगत वर्ष');expect(html).not.toContain('<script');
 expect(html).toContain('data:image/png;base64,');
 await page.goto('/courses');await expect(page.getByRole('heading',{level:1})).toHaveText('उद्देश्य के साथ अध्ययन।');
 await page.reload();await expect(page.locator('html')).toHaveAttribute('lang','hi');
 await page.getByRole('button',{name:'भाषा अंग्रेज़ी में बदलें'}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','en');
});
test('invalid shared dates and invalid profile data show no broken report',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/numerology-calculator?dob=1990-02-31&g=male');
 await expect(page.locator('.nv-num')).toHaveCount(0);
 await calculate(page,{name:'प्रिया शर्मा'});
 await expect(page.locator('.fr-error[role=alert]')).toContainText('English letters');
 await calculate(page,{phone:'+919876543210'});
 await expect(page.locator('.fr-error[role=alert]')).toContainText('without the country code');
 expect(errors).toEqual([]);
});
for(const width of [375,768,1024,1440])test(`Hindi calculator and navigation fit at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:950});await page.goto('/numerology-calculator');await calculate(page);
 await page.getByRole('button',{name:'Generate my full report',exact:true}).click();
 await page.getByRole('button',{name:'Switch language to Hindi'}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','hi');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('report print layouts in both languages',async({page},testInfo)=>{
 await page.goto('/numerology-calculator');await calculate(page);
 await page.getByRole('button',{name:'Generate my full report',exact:true}).click();
 await page.evaluate(()=>document.fonts.ready);
 await page.pdf({path:testInfo.outputPath('report-en.pdf'),format:'A4',printBackground:true});
 await page.getByRole('button',{name:'Switch language to Hindi'}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','hi');
 await page.evaluate(()=>document.fonts.ready);
 await page.pdf({path:testInfo.outputPath('report-hi.pdf'),format:'A4',printBackground:true});
 await page.locator('.fr-cover').screenshot({path:testInfo.outputPath('cover-hi.png')});
 await page.setViewportSize({width:375,height:950});
 await page.goto('/numerology-calculator');
 await expect(page.locator('html')).toHaveAttribute('lang','hi');
 await page.screenshot({path:testInfo.outputPath('calculator-mobile-hi.png')});
});


test('Kua shows all four sourced directions in the free reading and report',async({page})=>{
 await page.goto('/numerology-calculator');await calculate(page);
 // The default fixture is male 1990, Kua 1: N, E, SE, S by purpose.
 await expect(page.locator('.nv-kua .nv-direction-table tbody td')).toHaveText(['North','East','South-east','South']);
 await page.getByRole('button',{name:'Generate my full report',exact:true}).click();
 await expect(page.locator('.full-report .nv-direction-table tbody td')).toHaveText(['North','East','South-east','South']);
 await page.getByRole('button',{name:'Switch language to Hindi'}).click();
 await expect(page.locator('.full-report .nv-direction-table tbody td')).toHaveText(['उत्तर','पूर्व','दक्षिण-पूर्व','दक्षिण']);
});
