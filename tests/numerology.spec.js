import {test,expect} from '@playwright/test';
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
 // The complete report is a paid PDF: the buy box shows the price and is ready to pay.
 await expect(page.locator('#full-report')).toContainText('₹399');
 const pay=page.getByRole('button',{name:'Pay ₹399 and get my report',exact:true});
 await expect(pay).toBeDisabled(); // the buyer's own WhatsApp number is required
 await page.getByLabel('Your WhatsApp number',{exact:true}).fill('+91 98765 43210');
 await expect(pay).toBeEnabled();
 expect(page.url()).not.toContain('Priya');expect(page.url()).not.toContain('1111111111');
 expect(errors).toEqual([]);
});
test('paid report: buy box in both languages, and the PDF opens only with a valid pass',async({page,request})=>{
 await page.goto('/numerology-calculator');await calculate(page);
 const box=page.locator('#full-report');
 await expect(box).toContainText('19 chapters in a PDF, in English and Hindi');
 await expect(box).toContainText('Every missing number with its remedies');
 await expect(box).not.toContainText('free');
 await page.getByRole('button',{name:'Switch language to Hindi'}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','hi');
 await expect(page.getByRole('button',{name:'₹399 भुगतान करें और मेरी रिपोर्ट पाएं',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'भाषा अंग्रेज़ी में बदलें'}).click();
 expect((await request.get('/api/report/pdf?pass=not-a-pass&lang=en')).status()).toBe(403);
 const missing=await request.post('/api/report/order',{data:{dob:'1990-05-23',name:'',phone:''}});
 expect(missing.status()).toBe(400);
 const forged=await request.post('/api/report/access',{data:{inputs:{dob:'1990-05-23',name:'Priya Sharma',phone:'9876543210'},razorpay_order_id:'order_x',razorpay_payment_id:'pay_x',razorpay_signature:'forged',binding:'x'}});
 expect(forged.ok()).toBe(false);
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
 await page.getByRole('button',{name:'Switch language to Hindi'}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','hi');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('Kua shows all four sourced directions in the free reading',async({page})=>{
 await page.goto('/numerology-calculator');await calculate(page);
 // The default fixture is male 1990, Kua 1: N, E, SE, S by purpose.
 await expect(page.locator('.nv-kua .nv-direction-table tbody td')).toHaveText(['North','East','South-east','South']);
 await page.getByRole('button',{name:'Switch language to Hindi'}).click();
 await expect(page.locator('.nv-kua .nv-direction-table tbody td')).toHaveText(['उत्तर','पूर्व','दक्षिण-पूर्व','दक्षिण']);
});
