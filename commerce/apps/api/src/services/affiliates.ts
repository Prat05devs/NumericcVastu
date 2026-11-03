import {commissionFor, percentOf, type Paise} from '@sc/contracts';
import {env} from '../config/env.js';
import {hmacHex, randomToken, safeEqual} from '../lib/crypto.js';
import {prisma, type Tx} from '../lib/db.js';
import {ulid} from '../lib/ids.js';
import {sha256} from '../lib/redact.js';
import {getSetting} from '../lib/settings.js';

/**
 * Partner (affiliate / influencer) attribution — modelled on how large programmes work:
 * - Links carry an unguessable random code (≈59 bits). A visit records a click and returns a SIGNED attribution
 *   token (click id + expiry + HMAC). Checkout trusts only a valid token, so nobody can claim sales by typing a code
 *   into a request, and stuffed/forged cookies are rejected.
 * - Last click wins within the partner's attribution window (default 30 days). An explicit partner coupon typed at
 *   checkout takes precedence over a link, because it is the customer's own declared intent.
 * - Commission is computed on merchandise actually paid (after discounts, excluding shipping and tax), held PENDING
 *   through the return window, reversed in proportion to refunds, and never paid on self-referrals.
 * - Partners see their own clicks, orders and earnings, never customer names, emails, phones or addresses.
 */
const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|curl|wget|python-requests|httpclient/i;

export const newLinkCode = () => randomToken(8).replace(/[-_]/g, 'x').slice(0, 10);

function sign(clickId: string, exp: number) {
  return hmacHex(env().SESSION_SECRET, `aff:${clickId}:${exp}`).slice(0, 32);
}
export function attributionToken(clickId: string, exp: number) {
  return `${clickId}.${exp.toString(36)}.${sign(clickId, exp)}`;
}

/** Records a click for an active link and returns the signed token the web app stores as a first-party cookie. */
export async function recordClick(code: string, meta: {ip: string; userAgent?: string | undefined; referrer?: string | undefined}) {
  if (!/^[A-Za-z0-9]{6,32}$/.test(code)) return null;
  const link = await prisma.affiliateLink.findUnique({where: {code}, include: {affiliate: true, discount: {select: {code: true, active: true}}}});
  if (!link || !link.active || link.affiliate.status !== 'ACTIVE' || !link.affiliate.active) return null;
  const ua = (meta.userAgent ?? '').slice(0, 300);
  const visitorHash = sha256(`${env().SESSION_SECRET}|${meta.ip}|${ua}`);
  const since = new Date(Date.now() - 30 * 60_000);
  const recent = await prisma.affiliateClick.findFirst({where: {linkId: link.id, visitorHash, createdAt: {gte: since}}, select: {id: true}});
  const clickId = ulid();
  await prisma.affiliateClick.create({data: {clickId, linkId: link.id, referrer: meta.referrer?.slice(0, 500) ?? null, userAgent: ua || null, visitorHash, isUnique: !recent, suspectedBot: BOT_UA.test(ua) || !ua}});
  const days = link.affiliate.attributionDays;
  const exp = Date.now() + days * 86_400_000;
  return {token: attributionToken(clickId, exp), maxAgeDays: days, storefrontId: link.storefrontId, targetPath: link.targetPath, couponCode: link.discount?.active ? link.discount.code : null};
}

export type Attribution = {affiliateId: string; linkId: string | null; clickId: string | null; via: 'LINK' | 'COUPON'; commissionJson: unknown; emailHash: string | null; userId: string | null};

/** Verifies a signed token; returns null for anything forged, expired, or for suspended partners/links. */
export async function resolveToken(token: string | undefined, db: Tx | typeof prisma = prisma): Promise<Attribution | null> {
  if (!token || token.length > 120) return null;
  const [clickId, exp36, sig] = token.split('.');
  if (!clickId || !exp36 || !sig) return null;
  const exp = parseInt(exp36, 36);
  if (!Number.isFinite(exp) || exp < Date.now() || !safeEqual(sign(clickId, exp), sig)) return null;
  const click = await db.affiliateClick.findUnique({where: {clickId}, include: {link: {include: {affiliate: true}}}});
  if (!click || click.suspectedBot || !click.link.active || click.link.affiliate.status !== 'ACTIVE' || !click.link.affiliate.active) return null;
  const a = click.link.affiliate;
  return {affiliateId: a.id, linkId: click.linkId, clickId, via: 'LINK', commissionJson: a.commissionJson, emailHash: a.emailHash, userId: a.userId};
}

/** A coupon that belongs to a partner link attributes the sale to that partner. */
export async function attributionForCoupon(discountId: string, db: Tx | typeof prisma = prisma): Promise<Attribution | null> {
  const link = await db.affiliateLink.findFirst({where: {discountId, active: true, affiliate: {status: 'ACTIVE', active: true}}, include: {affiliate: true}, orderBy: {createdAt: 'asc'}});
  if (!link) return null;
  return {affiliateId: link.affiliateId, linkId: link.id, clickId: null, via: 'COUPON', commissionJson: link.affiliate.commissionJson, emailHash: link.affiliate.emailHash, userId: link.affiliate.userId};
}

export const emailHash = (email: string) => sha256(`email:${email.trim().toLowerCase()}`);

type CommissionRule = {type: 'NONE' | 'PERCENT' | 'FIXED'; percentBp?: number; amountPaise?: string};
const ruleOf = (json: unknown) => {
  const r = (json ?? {type: 'NONE'}) as CommissionRule;
  return {type: r.type, ...(r.percentBp !== undefined && {percentBp: r.percentBp}), ...(r.amountPaise !== undefined && {amountPaise: BigInt(r.amountPaise)})};
};

/** Called inside the payment-capture transaction: one commission row per attributed order. */
export async function recordCommission(tx: Tx, order: {id: string; userId: string | null; email: string; affiliateLinkId: string | null; paidAt: Date}, basisPaise: Paise) {
  if (!order.affiliateLinkId) return 0n;
  const link = await tx.affiliateLink.findUnique({where: {id: order.affiliateLinkId}, include: {affiliate: true}});
  if (!link) return 0n;
  const a = link.affiliate;
  const flags: string[] = [];
  if ((a.userId && a.userId === order.userId) || (a.emailHash && a.emailHash === emailHash(order.email))) flags.push('SELF_REFERRAL');
  if (a.status !== 'ACTIVE') flags.push('PARTNER_SUSPENDED');
  const amount = flags.length ? 0n : commissionFor(ruleOf(a.commissionJson), basisPaise);
  const holdDays = (await getSetting('affiliates', tx))?.holdDays ?? 30;
  const snapshot = await tx.order.findUnique({where: {id: order.id}, select: {affiliateClickId: true, discountId: true}});
  await tx.affiliateCommission.upsert({
    where: {orderId: order.id}, update: {},
    create: {
      id: ulid(), affiliateId: a.id, linkId: link.id, orderId: order.id, attribution: snapshot?.affiliateClickId ? 'LINK' : 'COUPON', basisPaise, amountPaise: amount,
      status: flags.length ? 'REJECTED' : 'PENDING', flags, decisionNote: flags.length ? `Automatically rejected: ${flags.join(', ')}` : null,
      // Provisional: re-dated to delivery + hold when the order is delivered; approval also requires delivery.
      approvableAt: new Date(order.paidAt.getTime() + (holdDays + 30) * 86_400_000),
    },
  });
  return amount;
}

/** After a refund: reverse commission in proportion to the refunded share of the order. */
export async function reverseCommission(tx: Tx, orderId: string) {
  const c = await tx.affiliateCommission.findUnique({where: {orderId}});
  if (!c || c.status === 'REJECTED') return;
  const order = await tx.order.findUniqueOrThrow({where: {id: orderId}, select: {totalPaise: true, refundedPaise: true}});
  const share = order.totalPaise === 0n ? 0n : (c.amountPaise * order.refundedPaise) / order.totalPaise;
  const reversed = share > c.amountPaise ? c.amountPaise : share;
  const full = reversed >= c.amountPaise;
  const flags = Array.isArray(c.flags) ? (c.flags as string[]) : [];
  await tx.affiliateCommission.update({where: {id: c.id}, data: {
    reversedPaise: reversed,
    ...(c.status !== 'PAID' && full && {status: 'REVERSED'}),
    ...(c.status === 'PAID' && reversed > c.reversedPaise && !flags.includes('CLAWBACK_NEEDED') && {flags: [...flags, 'CLAWBACK_NEEDED']}),
  }});
}

/** On delivery, start the hold clock: commission becomes approvable after the configured return window. */
export async function startCommissionHold(tx: Tx, orderId: string, deliveredAt: Date) {
  const holdDays = (await getSetting('affiliates', tx))?.holdDays ?? 30;
  await tx.affiliateCommission.updateMany({where: {orderId, status: 'PENDING'}, data: {approvableAt: new Date(deliveredAt.getTime() + holdDays * 86_400_000)}});
}

/** TDS on a payout, only when the business has configured a rate after tax advice (never assumed). */
export async function payoutTax(affiliateId: string, grossPaise: Paise) {
  const s = await getSetting('affiliates');
  if (!s || s.tdsRateBp === null) return {tdsPaise: 0n, configured: false};
  const fyStart = new Date(Date.UTC(new Date().getUTCMonth() >= 3 ? new Date().getUTCFullYear() : new Date().getUTCFullYear() - 1, 3, 1));
  const prior = await prisma.affiliatePayout.aggregate({where: {affiliateId, status: {in: ['PENDING', 'PAID']}, createdAt: {gte: fyStart}}, _sum: {grossPaise: true}});
  const yearTotal = (prior._sum.grossPaise ?? 0n) + grossPaise;
  const threshold = s.tdsThresholdPaise === null ? 0n : BigInt(s.tdsThresholdPaise);
  if (yearTotal <= threshold) return {tdsPaise: 0n, configured: true};
  // Once the yearly threshold is crossed, deduct on this payout plus anything paid earlier this year without deduction.
  // The catch-up on earlier untaxed payouts happens once: on the first payout that crosses the threshold.
  const alreadyTaxed = await prisma.affiliatePayout.count({where: {affiliateId, status: {in: ['PENDING', 'PAID']}, createdAt: {gte: fyStart}, tdsPaise: {gt: 0n}}});
  const earlierUntaxed = alreadyTaxed ? 0n : (await prisma.affiliatePayout.aggregate({where: {affiliateId, status: {in: ['PENDING', 'PAID']}, createdAt: {gte: fyStart}, tdsPaise: 0n}, _sum: {grossPaise: true}}))._sum.grossPaise ?? 0n;
  const tds = percentOf(grossPaise + earlierUntaxed, s.tdsRateBp);
  return {tdsPaise: tds > grossPaise ? grossPaise : tds, configured: true};
}
