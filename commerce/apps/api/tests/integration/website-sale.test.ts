import {afterAll, describe, expect, it} from 'vitest';
import {Client, staff, prisma} from '../support/helpers.js';
import {ulid} from '../../src/lib/ids.js';

const auth = {Authorization: 'Bearer test-site-bookings-secret-0123456789abcdefghij'};
const created: string[] = [];
const campaign = (name: string, families: string[], percent = 15) => ({
  name, slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${ulid().slice(-6).toLowerCase()}`, storefronts: [],
  startsAt: new Date(Date.now() - 60_000).toISOString(), endsAt: new Date(Date.now() + 86_400_000).toISOString(), priority: 0,
  rule: {type: 'PERCENT', percentBp: percent * 100, appliesTo: {families, productIds: []}}, theme: {bannerText: `${name} banner`, showCountdown: true}, active: true,
});
const quote = (body: Record<string, unknown>) => new Client().init().then((c) => c.post('/internal/coupons/quote', body, auth));

afterAll(async () => { await prisma.campaign.updateMany({where: {slug: {in: created}}, data: {active: false}}); });

describe('a sale campaign on the website', () => {
  it('discounts courses and consultations (not the report unless listed), shows on /site/sale, and stacks only combinable coupons', async () => {
    const owner = await staff('OWNER');
    const sale = campaign('Deepawali Sale', []);
    created.push(sale.slug);
    expect((await owner.post('/admin/campaigns', sale)).status).toBe(201);

    const shop = await new Client().init();
    const list = (await shop.get('/site/sale')).body.data as {name: string; rule: {percentBp: number}; bannerText: string}[];
    expect(list.find((s) => s.name === 'Deepawali Sale')).toMatchObject({rule: {percentBp: 1500}, bannerText: 'Deepawali Sale banner'});

    // ₹7,500 consultation: 15% → ₹6,375.
    const consult = await quote({offerKind: 'consultation', amountMinor: 750000, currency: 'INR'});
    expect(consult.body.data).toMatchObject({valid: true, code: null, sale: {name: 'Deepawali Sale', discountMinor: '112500'}, discountMinor: '112500', finalMinor: '637500'});
    // $180 consultation: 15% → $153.
    expect((await quote({offerKind: 'consultation', amountMinor: 18000, currency: 'USD'})).body.data).toMatchObject({finalMinor: '15300'});
    // A blank list does not reach the report: it keeps its own price unless REPORT is listed.
    expect((await quote({offerKind: 'report', amountMinor: 39900, currency: 'INR'})).body.data).toMatchObject({valid: true, sale: null, finalMinor: '39900'});
    expect((await quote({offerKind: 'course', amountMinor: 2999900, currency: 'INR'})).body.data.finalMinor).toBe('2550000');

    const tag = ulid().slice(-6);
    expect((await owner.post('/admin/discounts', {code: `SOLO${tag}`, description: '', rule: {type: 'PERCENT', percentBp: 1000, appliesTo: {families: [], productIds: []}}, storefronts: ['website'], combinable: false, active: true})).status).toBe(201);
    expect((await owner.post('/admin/discounts', {code: `PLUS${tag}`, description: '', rule: {type: 'FIXED', amountPaise: '1000', appliesTo: {families: [], productIds: []}}, storefronts: ['website'], combinable: true, active: true})).status).toBe(201);
    const solo = await quote({code: `SOLO${tag}`, offerKind: 'consultation', amountMinor: 750000, currency: 'INR'});
    expect(solo.body.data).toMatchObject({valid: false});
    expect(solo.body.data.message).toContain('Deepawali Sale');
    // Combinable ₹10 off on top of the sale price: 637500 − 1000.
    expect((await quote({code: `PLUS${tag}`, offerKind: 'consultation', amountMinor: 750000, currency: 'INR'})).body.data).toMatchObject({valid: true, couponDiscountMinor: '1000', discountMinor: '113500', finalMinor: '636500'});
  });

  it('leaves the website alone when the sale is for crystal families only', async () => {
    await prisma.campaign.updateMany({where: {slug: {in: created}}, data: {active: false}});
    const owner = await staff('OWNER');
    const crystalOnly = campaign('Rudraksha Week', ['RUDRAKSHA'], 20);
    created.push(crystalOnly.slug);
    expect((await owner.post('/admin/campaigns', crystalOnly)).status).toBe(201);
    expect((await quote({offerKind: 'consultation', amountMinor: 750000, currency: 'INR'})).body.data).toMatchObject({valid: true, sale: null, finalMinor: '750000'});
    const list = (await (await new Client().init()).get('/site/sale')).body.data as {name: string}[];
    expect(list.some((s) => s.name === 'Rudraksha Week')).toBe(false);
  });
});
