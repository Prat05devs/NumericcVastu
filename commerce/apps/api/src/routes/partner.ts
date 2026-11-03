import {Router, type NextFunction, type Request, type Response} from 'express';
import {z} from 'zod';
import * as C from '@sc/contracts';
import {env} from '../config/env.js';
import {prisma} from '../lib/db.js';
import {AppError, notFound} from '../lib/errors.js';
import {encrypt} from '../lib/crypto.js';
import {ulid} from '../lib/ids.js';
import {noStore, param, parse, route, send, toPlain} from '../lib/http.js';
import {audit} from '../lib/audit.js';
import {getSetting} from '../lib/settings.js';
import {rateLimit} from '../middleware/core.js';
import {auditCtx, customerOf, requireCustomer} from '../middleware/auth.js';
import {newLinkCode} from '../services/affiliates.js';

/**
 * Partner portal for influencers and affiliates: they sign in with the email they were invited with (same email
 * code as customers) and see only their own links, clicks, attributed orders and earnings. Customer identity is
 * never exposed: orders appear as a masked code, date, amount basis and status.
 */
export const partnerRouter = Router();
const r = partnerRouter;
type Partner = Awaited<ReturnType<typeof prisma.affiliate.findFirstOrThrow>>;

async function loadPartner(req: Request, res: Response, next: NextFunction) {
  const c = customerOf(res);
  if (!c) return next(new AppError('UNAUTHENTICATED', 401, 'Please sign in with the email your invitation was sent to.'));
  const partner = await prisma.affiliate.findFirst({where: {userId: c.user.id}});
  if (!partner) return next(new AppError('FORBIDDEN', 403, 'This account is not part of the partner programme.'));
  res.locals['partner'] = partner;
  next();
}
const partnerOf = (res: Response) => res.locals['partner'] as Partner;
function requireActive(_req: Request, res: Response, next: NextFunction) {
  const p = partnerOf(res);
  if (p.status === 'SUSPENDED') return next(new AppError('FORBIDDEN', 403, 'Your partner account is paused. Please contact us.'));
  if (p.status !== 'ACTIVE') return next(new AppError('FORBIDDEN', 403, 'Accept the partner terms to get started.'));
  next();
}
const guard = [requireCustomer, loadPartner];
const maskCode = (code: string) => `${code.slice(0, 4)}••••${code.slice(-2)}`;
const shareUrl = (code: string) => `${env().APP_BASE_URL}/r/${code}`;

route(r, {method: 'get', path: '/partner/me', access: 'CUSTOMER', tag: 'Partner portal', summary: 'Partner profile, terms status and commission rule'}, ...guard, async (_req, res) => {
  noStore(res);
  const p = partnerOf(res);
  const s = await getSetting('affiliates');
  send(res, toPlain({
    name: p.name, status: p.status, platform: p.platform, handle: p.handle, commission: p.commissionJson, attributionDays: p.attributionDays, canCreateLinks: p.canCreateLinks,
    payout: {hasDetails: Boolean(p.payoutDetailsEnc), hint: p.payoutHint, minPayoutPaise: s?.minPayoutPaise ?? null, holdDays: s?.holdDays ?? null},
    terms: {required: s?.termsVersion ?? null, accepted: p.termsVersion, pageSlug: s?.termsPageSlug ?? null, needsAcceptance: Boolean(s && p.termsVersion !== s.termsVersion)},
  }));
});
route(r, {method: 'post', path: '/partner/terms', access: 'CUSTOMER', tag: 'Partner portal', summary: 'Accept the current partner terms (activates an invited partner)', body: C.PartnerTermsAccept}, ...guard, async (req, res) => {
  const b = parse(C.PartnerTermsAccept, req.body);
  const p = partnerOf(res);
  const s = await getSetting('affiliates');
  if (!s) throw new AppError('CONFLICT', 409, 'The partner programme terms are not published yet.');
  if (b.termsVersion !== s.termsVersion) throw new AppError('CONFLICT', 409, 'The terms have been updated; please read the latest version.');
  const page = await prisma.cmsPage.findUnique({where: {slug: s.termsPageSlug}, select: {status: true}});
  if (page?.status !== 'PUBLISHED') throw new AppError('CONFLICT', 409, 'The partner terms page is not published yet.');
  await prisma.affiliate.update({where: {id: p.id}, data: {termsVersion: s.termsVersion, termsAcceptedAt: new Date(), ...(p.status === 'INVITED' && {status: 'ACTIVE'})}});
  await audit(prisma, auditCtx(req, res), 'partner.terms_accepted', 'affiliate', p.id, {version: s.termsVersion});
  send(res, {status: p.status === 'INVITED' ? 'ACTIVE' : p.status, termsVersion: s.termsVersion});
});

const Range = z.object({from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()});
route(r, {method: 'get', path: '/partner/summary', access: 'CUSTOMER', tag: 'Partner portal', summary: 'Clicks, orders, conversion and earnings for a date range', query: Range}, ...guard, async (req, res) => {
  noStore(res);
  const p = partnerOf(res);
  const q = parse(Range, req.query);
  const from = q.from ? new Date(`${q.from}T00:00:00Z`) : new Date(Date.now() - 30 * 86_400_000);
  const to = q.to ? new Date(`${q.to}T23:59:59.999Z`) : new Date();
  const linkIds = (await prisma.affiliateLink.findMany({where: {affiliateId: p.id}, select: {id: true}})).map((l) => l.id);
  const [clicks, unique, commissions, balances] = await Promise.all([
    prisma.affiliateClick.count({where: {linkId: {in: linkIds}, createdAt: {gte: from, lte: to}, suspectedBot: false}}),
    prisma.affiliateClick.count({where: {linkId: {in: linkIds}, createdAt: {gte: from, lte: to}, suspectedBot: false, isUnique: true}}),
    prisma.affiliateCommission.findMany({where: {affiliateId: p.id, createdAt: {gte: from, lte: to}}, select: {basisPaise: true, amountPaise: true, reversedPaise: true, status: true}}),
    prisma.affiliateCommission.groupBy({by: ['status'], where: {affiliateId: p.id}, _sum: {amountPaise: true, reversedPaise: true}}),
  ]);
  const net = (s?: {_sum: {amountPaise: bigint | null; reversedPaise: bigint | null}}) => (s?._sum.amountPaise ?? 0n) - (s?._sum.reversedPaise ?? 0n);
  const orders = commissions.filter((c) => c.status !== 'REJECTED').length;
  send(res, toPlain({
    range: {from, to}, clicks, uniqueClicks: unique, orders, conversionRate: unique ? Math.round((orders / unique) * 10_000) / 100 : 0,
    salesPaise: commissions.filter((c) => c.status !== 'REJECTED').reduce((s, c) => s + c.basisPaise, 0n),
    earnedPaise: commissions.filter((c) => c.status !== 'REJECTED').reduce((s, c) => s + c.amountPaise - c.reversedPaise, 0n),
    balances: {pendingPaise: net(balances.find((b) => b.status === 'PENDING')), approvedPaise: net(balances.find((b) => b.status === 'APPROVED')), paidPaise: net(balances.find((b) => b.status === 'PAID'))},
  }));
});
route(r, {method: 'get', path: '/partner/links', access: 'CUSTOMER', tag: 'Partner portal', summary: 'My links with clicks and orders'}, ...guard, async (_req, res) => {
  noStore(res);
  const p = partnerOf(res);
  const links = await prisma.affiliateLink.findMany({where: {affiliateId: p.id}, orderBy: {createdAt: 'desc'}, include: {discount: {select: {code: true, active: true, description: true}}, _count: {select: {clicks: {where: {suspectedBot: false}}, commissions: {where: {status: {not: 'REJECTED'}}}}}}});
  send(res, links.map((l) => ({id: l.id, label: l.label, targetPath: l.targetPath, shareUrl: shareUrl(l.code), active: l.active, coupon: l.discount?.active ? {code: l.discount.code, description: l.discount.description} : null, clicks: l._count.clicks, orders: l._count.commissions, createdAt: l.createdAt})));
});
route(r, {method: 'post', path: '/partner/links', access: 'CUSTOMER', tag: 'Partner portal', summary: 'Create my own tracked link to a page of the shop', body: C.PartnerLinkCreate}, ...guard, requireActive, rateLimit('partner-links', 20, 3600_000), async (req, res) => {
  const b = parse(C.PartnerLinkCreate, req.body);
  const p = partnerOf(res);
  if (!p.canCreateLinks) throw new AppError('FORBIDDEN', 403, 'Ask us to create links for you.');
  if (!/^\/[a-z0-9\-/]*$/.test(b.targetPath)) throw new AppError('VALIDATION_FAILED', 422, 'Use a page path from this shop, such as /rudraksha or /products/…');
  if ((await prisma.affiliateLink.count({where: {affiliateId: p.id}})) >= 50) throw new AppError('CONFLICT', 409, 'You have reached 50 links. Disable unused ones or contact us.');
  const id = ulid();
  const code = newLinkCode();
  await prisma.affiliateLink.create({data: {id, code, affiliateId: p.id, storefrontId: 'crystal', targetPath: b.targetPath, label: b.label, createdByPartner: true}});
  await audit(prisma, auditCtx(req, res), 'partner.link_create', 'affiliate', p.id, {linkId: id, targetPath: b.targetPath});
  send(res, {id, shareUrl: shareUrl(code)}, 201);
});
route(r, {method: 'patch', path: '/partner/links/:id', access: 'CUSTOMER', tag: 'Partner portal', summary: 'Disable or re-enable one of my links', body: z.object({active: z.boolean()})}, ...guard, async (req, res) => {
  const {active} = parse(z.object({active: z.boolean()}), req.body);
  const n = await prisma.affiliateLink.updateMany({where: {id: param(req, 'id'), affiliateId: partnerOf(res).id}, data: {active}});
  if (n.count !== 1) throw notFound('Link');
  send(res, {id: param(req, 'id'), active});
});
route(r, {method: 'get', path: '/partner/commissions', access: 'CUSTOMER', tag: 'Partner portal', summary: 'Earnings ledger (no customer details)'}, ...guard, async (_req, res) => {
  noStore(res);
  const p = partnerOf(res);
  const rows = await prisma.affiliateCommission.findMany({where: {affiliateId: p.id}, orderBy: {createdAt: 'desc'}, take: 200, include: {link: {select: {label: true, targetPath: true}}}});
  const orders = await prisma.order.findMany({where: {id: {in: rows.map((c) => c.orderId)}}, select: {id: true, publicCode: true}});
  send(res, toPlain(rows.map((c) => ({
    id: c.id, date: c.createdAt, order: maskCode(orders.find((o) => o.id === c.orderId)?.publicCode ?? '------'), via: c.attribution, link: c.link?.label || c.link?.targetPath || null,
    salesPaise: c.basisPaise, commissionPaise: c.amountPaise - c.reversedPaise, status: c.status, availableFrom: c.status === 'PENDING' ? c.approvableAt : null,
    note: c.status === 'REJECTED' || c.status === 'REVERSED' ? c.decisionNote ?? 'Order refunded or cancelled' : null,
  }))));
});
route(r, {method: 'get', path: '/partner/payouts', access: 'CUSTOMER', tag: 'Partner portal', summary: 'My payout statements'}, ...guard, async (_req, res) => {
  noStore(res);
  send(res, toPlain(await prisma.affiliatePayout.findMany({where: {affiliateId: partnerOf(res).id, status: {not: 'CANCELLED'}}, orderBy: {createdAt: 'desc'}, select: {id: true, grossPaise: true, tdsPaise: true, netPaise: true, status: true, method: true, reference: true, paidAt: true, createdAt: true}})));
});
route(r, {method: 'put', path: '/partner/payout-details', access: 'CUSTOMER', tag: 'Partner portal', summary: 'Save UPI or bank details and PAN (encrypted; shown back only as a hint)', body: C.PayoutDetails}, ...guard, rateLimit('partner-payout', 5, 3600_000), async (req, res) => {
  const b = parse(C.PayoutDetails, req.body);
  const p = partnerOf(res);
  const hint = [b.method === 'UPI' ? `UPI ••••${b.upiId.slice(b.upiId.indexOf('@') - 2)}` : `A/c ••••${b.accountNumber.slice(-4)}`, b.pan ? `PAN ••••${b.pan.slice(-2)}` : null].filter(Boolean).join(' · ');
  await prisma.affiliate.update({where: {id: p.id}, data: {payoutDetailsEnc: encrypt(JSON.stringify(b)), payoutHint: hint}});
  await audit(prisma, auditCtx(req, res), 'partner.payout_details', 'affiliate', p.id, {method: b.method, pan: Boolean(b.pan)});
  send(res, {hint});
});
