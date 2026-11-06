import {describe, expect, it} from 'vitest';
import {Client, staff, prisma} from '../support/helpers.js';
import {ulid} from '../../src/lib/ids.js';

const coupon = (code: string, extra: Record<string, unknown> = {}) => ({
  code, description: '', rule: {type: 'PERCENT', percentBp: 1000, maxDiscountPaise: '50000', appliesTo: {families: [], productIds: []}},
  storefronts: ['crystal'], combinable: false, active: true, ...extra,
});

describe('crystal shop offers bar and newsletter', () => {
  it('advertises only coupons staff chose to show, never partner-link codes', async () => {
    const marketing = await staff('OWNER');
    const tag = ulid().slice(-6);
    const shown = `SHOW${tag}`, hidden = `HIDE${tag}`, partner = `LINK${tag}`, website = `WEB${tag}`;
    expect((await marketing.post('/admin/discounts', coupon(shown, {showInOffers: true}))).status).toBe(201);
    expect((await marketing.post('/admin/discounts', coupon(hidden))).status).toBe(201);
    expect((await marketing.post('/admin/discounts', coupon(partner, {showInOffers: true, lockedToLink: true}))).status).toBe(201);
    expect((await marketing.post('/admin/discounts', coupon(website, {showInOffers: true, storefronts: ['website']}))).status).toBe(201);

    const shop = await new Client().init();
    const res = await shop.get('/offers');
    expect(res.status).toBe(200);
    const codes = (res.body.data as {code: string}[]).map((o) => o.code);
    expect(codes).toContain(shown);
    expect(codes).not.toContain(hidden);
    expect(codes).not.toContain(partner);
    expect(codes).not.toContain(website);
    const offer = (res.body.data as {code: string; title: string; terms: string}[]).find((o) => o.code === shown)!;
    expect(offer.title).toBe('10% off, up to ₹500');
    expect(offer.terms).toContain('Saves up to ₹500.');
  });

  it('records a newsletter opt-in once and answers the same way for repeats', async () => {
    const shop = await new Client().init();
    const email = `news-${ulid().toLowerCase()}@example.test`;
    const first = await shop.post('/newsletter', {email, source: 'home', consentVersion: 'news-v1'});
    expect(first.status).toBe(200);
    const again = await shop.post('/newsletter', {email: email.toUpperCase(), source: 'footer', consentVersion: 'news-v1'});
    expect(again.body.data).toEqual(first.body.data);
    expect(await prisma.newsletterSubscriber.count({where: {email}})).toBe(1);
    expect((await shop.post('/newsletter', {email: 'not-an-email', consentVersion: 'news-v1'})).status).toBe(422);
  });
});
