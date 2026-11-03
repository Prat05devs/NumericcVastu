import {Router} from 'express';
import {z} from 'zod';
import * as C from '@sc/contracts';
import {env} from '../config/env.js';
import {prisma} from '../lib/db.js';
import {AppError, notFound} from '../lib/errors.js';
import {ulid} from '../lib/ids.js';
import {noStore, param, parse, route, send, toPlain, mounted} from '../lib/http.js';
import {audit} from '../lib/audit.js';
import {enqueue} from '../lib/outbox.js';
import {getSetting} from '../lib/settings.js';
import {transaction, isUniqueViolation} from '../lib/tx.js';
import {auditCtx, requireStaff, staffOf} from '../middleware/auth.js';
import {emailHash, newLinkCode, payoutTax} from '../services/affiliates.js';

export const adminMarketingRouter = mounted(Router(), '/admin');
const r = adminMarketingRouter;
const staff = requireStaff;
const ruleToWire = (rule: z.infer<typeof C.DiscountRuleIn>) => toPlain(rule) as object;

// ───────────── Coupons (discounts)
function discountData(b: z.infer<typeof C.CouponUpsert>, lockedToLink?: boolean) {
  if (b.rule.type === 'NONE') throw new AppError('VALIDATION_FAILED', 422, 'A coupon needs a percentage or a fixed amount.');
  const value = b.rule.type === 'PERCENT' ? BigInt(b.rule.percentBp ?? 0) : BigInt(b.rule.amountPaise ?? '0');
  if (value <= 0n) throw new AppError('VALIDATION_FAILED', 422, 'Discount value must be positive.');
  return {
    code: b.code, description: b.description, type: b.rule.type, value, capPaise: b.rule.maxDiscountPaise ? BigInt(b.rule.maxDiscountPaise) : null, minOrderPaise: b.rule.minOrderPaise ? BigInt(b.rule.minOrderPaise) : null,
    startsAt: b.startsAt ? new Date(b.startsAt) : null, endsAt: b.endsAt ? new Date(b.endsAt) : null, limitTotal: b.limitTotal ?? null, limitPerCustomer: b.limitPerCustomer ?? null,
    eligibleRulesJson: {families: b.rule.appliesTo.families, productIds: b.rule.appliesTo.productIds, storefronts: b.storefronts, ...(lockedToLink !== undefined && {lockedToLink})}, combinable: b.combinable, active: b.active,
  };
}
const CouponIn = C.CouponUpsert.extend({lockedToLink: z.boolean().optional()});
route(r, {method: 'get', path: '/discounts', access: 'STAFF:marketing.write', tag: 'Admin marketing', summary: 'Coupons with usage'}, staff('marketing.write'), async (_req, res) => {
  noStore(res);
  const rows = await prisma.discount.findMany({orderBy: {createdAt: 'desc'}, include: {affiliateLinks: {select: {code: true, affiliate: {select: {name: true}}}}, _count: {select: {redemptions: {where: {status: 'REDEEMED'}}}}}});
  send(res, toPlain(rows));
});
route(r, {method: 'post', path: '/discounts', access: 'STAFF:marketing.write', tag: 'Admin marketing', summary: 'Create a coupon', body: CouponIn}, staff('marketing.write'), async (req, res) => {
  const b = parse(CouponIn, req.body);
  const id = ulid();
  try { await prisma.discount.create({data: {id, ...discountData(b, b.lockedToLink ?? false), createdBy: staffOf(res).user.id}}); } catch (e) { if (isUniqueViolation(e)) throw new AppError('CONFLICT', 409, 'That code already exists.'); throw e; }
  await audit(prisma, auditCtx(req, res), 'discount.create', 'discount', id, {code: b.code, rule: b.rule});
  send(res, {id}, 201);
});
route(r, {method: 'put', path: '/discounts/:id', access: 'STAFF:marketing.write', tag: 'Admin marketing', summary: 'Replace a coupon (optimistic version)', body: CouponIn.extend({version: z.number().int().min(0)}), idempotent: false}, staff('marketing.write'), async (req, res) => {
  const b = parse(CouponIn.extend({version: z.number().int().min(0)}), req.body);
  const n = await prisma.discount.updateMany({where: {id: param(req, 'id'), version: b.version}, data: {...discountData(b, b.lockedToLink), version: {increment: 1}}}).catch((e) => { if (isUniqueViolation(e)) throw new AppError('CONFLICT', 409, 'That code already exists.'); throw e; });
  if (n.count !== 1) throw new AppError('STALE_VERSION', 409, 'This coupon changed since you opened it. Reload.');
  await audit(prisma, auditCtx(req, res), 'discount.update', 'discount', param(req, 'id'), {code: b.code, rule: b.rule, active: b.active});
  send(res, {id: param(req, 'id'), version: b.version + 1});
});

// ───────────── Festive / sale campaigns (automatic discount + site decoration)
function campaignData(b: z.infer<typeof C.CampaignUpsert>) {
  if (new Date(b.endsAt) <= new Date(b.startsAt)) throw new AppError('VALIDATION_FAILED', 422, 'The end must be after the start.');
  return {name: b.name, slug: b.slug, storefronts: b.storefronts, startsAt: new Date(b.startsAt), endsAt: new Date(b.endsAt), priority: b.priority, ruleJson: ruleToWire(b.rule), themeJson: b.theme, active: b.active};
}
route(r, {method: 'get', path: '/campaigns', access: 'STAFF:marketing.write', tag: 'Admin marketing', summary: 'Sale campaigns'}, staff('marketing.write'), async (_req, res) => { noStore(res); send(res, await prisma.campaign.findMany({orderBy: {startsAt: 'desc'}})); });
route(r, {method: 'post', path: '/campaigns', access: 'STAFF:marketing.write', tag: 'Admin marketing', summary: 'Create a campaign (e.g. Diwali) with theme', body: C.CampaignUpsert}, staff('marketing.write'), async (req, res) => {
  const b = parse(C.CampaignUpsert, req.body);
  const id = ulid();
  await transaction(async (tx) => {
    await tx.campaign.create({data: {id, ...campaignData(b), createdBy: staffOf(res).user.id}}).catch((e) => { if (isUniqueViolation(e)) throw new AppError('CONFLICT', 409, 'That slug exists.'); throw e; });
    await audit(tx, auditCtx(req, res), 'campaign.create', 'campaign', id, {name: b.name, rule: b.rule});
    await enqueue(tx, 'web.revalidate', {tags: ['campaign', 'catalogue']}, null);
  });
  send(res, {id}, 201);
});
route(r, {method: 'put', path: '/campaigns/:id', access: 'STAFF:marketing.write', tag: 'Admin marketing', summary: 'Edit a campaign', body: C.CampaignUpsert}, staff('marketing.write'), async (req, res) => {
  const b = parse(C.CampaignUpsert, req.body);
  await transaction(async (tx) => {
    const n = await tx.campaign.updateMany({where: {id: param(req, 'id')}, data: campaignData(b)});
    if (n.count !== 1) throw notFound('Campaign');
    await audit(tx, auditCtx(req, res), 'campaign.update', 'campaign', param(req, 'id'), {name: b.name, rule: b.rule, active: b.active});
    await enqueue(tx, 'web.revalidate', {tags: ['campaign', 'catalogue']}, null);
  });
  send(res, {id: param(req, 'id')});
});

// ───────────── Partner programme (affiliates / influencers)
route(r, {method: 'get', path: '/affiliates', access: 'STAFF:marketing.write', tag: 'Admin partners', summary: 'Partners with performance and balances'}, staff('marketing.write'), async (_req, res) => {
  noStore(res);
  const partners = await prisma.affiliate.findMany({orderBy: {createdAt: 'desc'}, include: {links: {include: {discount: {select: {code: true}}, _count: {select: {clicks: true}}}}}});
  const stats = await prisma.affiliateCommission.groupBy({by: ['affiliateId', 'status'], _sum: {amountPaise: true, reversedPaise: true}, _count: true});
  send(res, toPlain(partners.map((a) => ({
    ...a, payoutDetailsEnc: undefined, emailHash: undefined, hasPayoutDetails: Boolean(a.payoutDetailsEnc),
    commissions: Object.fromEntries(stats.filter((s) => s.affiliateId === a.id).map((s) => [s.status, {count: s._count, amountPaise: (s._sum.amountPaise ?? 0n) - (s._sum.reversedPaise ?? 0n)}])),
  }))));
});
const affiliateData = (b: z.infer<typeof C.AffiliateUpsert>) => ({
  name: b.name, email: b.email?.toLowerCase() ?? null, emailHash: b.email ? emailHash(b.email) : null, phone: b.phone ?? null, platform: b.platform ?? null, handle: b.handle ?? null,
  commissionJson: toPlain(b.commission) as object, notes: b.notes, active: b.active, attributionDays: b.attributionDays, canCreateLinks: b.canCreateLinks,
});
route(r, {method: 'post', path: '/affiliates', access: 'STAFF:marketing.write', tag: 'Admin partners', summary: 'Invite a partner (they sign in with their email to the partner portal)', body: C.AffiliateUpsert}, staff('marketing.write'), async (req, res) => {
  const b = parse(C.AffiliateUpsert, req.body);
  if (b.commission.type === 'PERCENT' && (b.commission.percentBp ?? 0) > 3000) throw new AppError('VALIDATION_FAILED', 422, 'Commission above 30% needs the owner to set it directly.');
  const id = ulid();
  await transaction(async (tx) => {
    const existingUser = b.email ? await tx.user.findUnique({where: {email: b.email.toLowerCase()}, select: {id: true}}) : null;
    await tx.affiliate.create({data: {id, ...affiliateData(b), userId: existingUser?.id ?? null, status: 'INVITED', createdBy: staffOf(res).user.id}}).catch((e) => { if (isUniqueViolation(e)) throw new AppError('CONFLICT', 409, 'A partner with that email exists.'); throw e; });
    if (b.email) await enqueue(tx, 'email.partner_invite', {email: b.email}, `partner_invite:${id}`);
    await audit(tx, auditCtx(req, res), 'affiliate.create', 'affiliate', id, {name: b.name, commission: b.commission});
  });
  send(res, {id, status: 'INVITED'}, 201);
});
route(r, {method: 'put', path: '/affiliates/:id', access: 'STAFF:marketing.write', tag: 'Admin partners', summary: 'Edit partner terms', body: C.AffiliateUpsert}, staff('marketing.write'), async (req, res) => {
  const b = parse(C.AffiliateUpsert, req.body);
  if (b.commission.type === 'PERCENT' && (b.commission.percentBp ?? 0) > 3000 && staffOf(res).user.role !== 'OWNER') throw new AppError('FORBIDDEN', 403, 'Commission above 30% needs the owner.');
  const n = await prisma.affiliate.updateMany({where: {id: param(req, 'id')}, data: affiliateData(b)});
  if (n.count !== 1) throw notFound('Partner');
  await audit(prisma, auditCtx(req, res), 'affiliate.update', 'affiliate', param(req, 'id'), {commission: b.commission, active: b.active, attributionDays: b.attributionDays});
  send(res, {id: param(req, 'id')});
});
route(r, {method: 'post', path: '/affiliates/:id/status', access: 'STAFF:marketing.write', tag: 'Admin partners', summary: 'Activate or suspend (suspension stops attribution and holds pending commission)', body: C.AffiliateStatusPatch}, staff('marketing.write'), async (req, res) => {
  const b = parse(C.AffiliateStatusPatch, req.body);
  const n = await prisma.affiliate.updateMany({where: {id: param(req, 'id')}, data: {status: b.status}});
  if (n.count !== 1) throw notFound('Partner');
  await audit(prisma, auditCtx(req, res), `affiliate.${b.status.toLowerCase()}`, 'affiliate', param(req, 'id'), {note: b.note});
  send(res, {id: param(req, 'id'), status: b.status});
});
route(r, {method: 'post', path: '/affiliates/:id/links', access: 'STAFF:marketing.write', tag: 'Admin partners', summary: 'Create a tracked link (unguessable code), optionally with a partner coupon', body: C.AffiliateLinkCreate}, staff('marketing.write'), async (req, res) => {
  const b = parse(C.AffiliateLinkCreate, req.body);
  const a = await prisma.affiliate.findUnique({where: {id: param(req, 'id')}});
  if (!a) throw notFound('Partner');
  if (!(await prisma.storefront.findUnique({where: {id: b.storefront}}))) throw new AppError('VALIDATION_FAILED', 422, 'Unknown storefront.');
  if (b.couponId && !(await prisma.discount.findUnique({where: {id: b.couponId}}))) throw new AppError('VALIDATION_FAILED', 422, 'Unknown coupon.');
  const id = ulid();
  const code = newLinkCode();
  await prisma.affiliateLink.create({data: {id, code, affiliateId: a.id, discountId: b.couponId ?? null, storefrontId: b.storefront, targetPath: b.targetPath, label: b.label}});
  await audit(prisma, auditCtx(req, res), 'affiliate_link.create', 'affiliate', a.id, {linkId: id, targetPath: b.targetPath, couponId: b.couponId});
  send(res, {id, code, shareUrl: `${env().APP_BASE_URL}/r/${code}`}, 201);
});
route(r, {method: 'patch', path: '/affiliate-links/:id', access: 'STAFF:marketing.write', tag: 'Admin partners', summary: 'Disable / re-enable a link', body: z.object({active: z.boolean()})}, staff('marketing.write'), async (req, res) => {
  const {active} = parse(z.object({active: z.boolean()}), req.body);
  const n = await prisma.affiliateLink.updateMany({where: {id: param(req, 'id')}, data: {active}});
  if (n.count !== 1) throw notFound('Link');
  await audit(prisma, auditCtx(req, res), 'affiliate_link.update', 'affiliate_link', param(req, 'id'), {active});
  send(res, {id: param(req, 'id'), active});
});
route(r, {method: 'get', path: '/affiliate-commissions', access: 'STAFF:marketing.write', tag: 'Admin partners', summary: 'Commission ledger and fraud flags'}, staff('marketing.write'), async (req, res) => {
  noStore(res);
  const q = parse(z.object({status: z.enum(['PENDING', 'APPROVED', 'REVERSED', 'REJECTED', 'PAID']).optional(), affiliateId: C.Id.optional(), flagged: z.enum(['true']).optional()}), req.query);
  const rows = await prisma.affiliateCommission.findMany({where: {...(q.status && {status: q.status}), ...(q.affiliateId && {affiliateId: q.affiliateId})}, orderBy: {createdAt: 'desc'}, take: 300, include: {affiliate: {select: {name: true}}}});
  const orders = await prisma.order.findMany({where: {id: {in: rows.map((c) => c.orderId)}}, select: {id: true, publicCode: true, status: true}});
  const out = rows.filter((c) => !q.flagged || (c.flags as string[]).length).map((c) => ({...c, order: orders.find((o) => o.id === c.orderId)}));
  send(res, toPlain(out));
});
route(r, {method: 'post', path: '/affiliate-commissions/:id/decision', access: 'STAFF:marketing.write', tag: 'Admin partners', summary: 'Approve early or reject a pending commission, with a note', body: C.CommissionDecision}, staff('marketing.write'), async (req, res) => {
  const b = parse(C.CommissionDecision, req.body);
  const n = await prisma.affiliateCommission.updateMany({where: {id: param(req, 'id'), status: {in: b.action === 'approve' ? ['PENDING'] : ['PENDING', 'APPROVED']}, payoutId: null}, data: {status: b.action === 'approve' ? 'APPROVED' : 'REJECTED', decidedBy: staffOf(res).user.id, decisionNote: b.note}});
  if (n.count !== 1) throw new AppError('CONFLICT', 409, 'This commission can no longer be changed.');
  await audit(prisma, auditCtx(req, res), `commission.${b.action}`, 'affiliate_commission', param(req, 'id'), {note: b.note});
  send(res, {id: param(req, 'id'), status: b.action === 'approve' ? 'APPROVED' : 'REJECTED'});
});
route(r, {method: 'get', path: '/affiliate-payouts', access: 'STAFF:reports.read', tag: 'Admin partners', summary: 'Payout statements'}, staff('reports.read'), async (_req, res) => {
  noStore(res);
  send(res, toPlain(await prisma.affiliatePayout.findMany({orderBy: {createdAt: 'desc'}, take: 200, include: {affiliate: {select: {name: true, payoutHint: true}}, _count: {select: {commissions: true}}}})));
});
route(r, {method: 'post', path: '/affiliate-payouts', access: 'STAFF:refunds.write', tag: 'Admin partners', summary: 'Create a payout statement from approved commissions (FINANCE)', body: C.PayoutCreate, idempotent: true}, staff('refunds.write'), async (req, res) => {
  const b = parse(C.PayoutCreate, req.body);
  const a = await prisma.affiliate.findUnique({where: {id: b.affiliateId}});
  if (!a) throw notFound('Partner');
  if (!a.payoutDetailsEnc) throw new AppError('CONFLICT', 409, 'The partner has not added payout details yet.');
  const settings = await getSetting('affiliates');
  if (!settings) throw new AppError('CONFLICT', 409, 'Configure the partner programme settings (hold period, minimum payout, tax) first.');
  const out = await transaction(async (tx) => {
    const approved = await tx.affiliateCommission.findMany({where: {affiliateId: a.id, status: 'APPROVED', payoutId: null}});
    const gross = approved.reduce((s, c) => s + c.amountPaise - c.reversedPaise, 0n);
    if (gross <= 0n || gross < BigInt(settings.minPayoutPaise)) throw new AppError('CONFLICT', 409, `Approved balance ${gross} paise is below the minimum payout.`);
    const {tdsPaise, configured} = await payoutTax(a.id, gross);
    if (configured && tdsPaise > 0n && !a.payoutHint?.includes('PAN')) throw new AppError('CONFLICT', 409, 'Tax must be deducted on this payout; the partner needs to add their PAN first.');
    const id = ulid();
    await tx.affiliatePayout.create({data: {id, affiliateId: a.id, grossPaise: gross, tdsPaise, netPaise: gross - tdsPaise, createdBy: staffOf(res).user.id}});
    const n = await tx.affiliateCommission.updateMany({where: {id: {in: approved.map((c) => c.id)}, status: 'APPROVED', payoutId: null}, data: {payoutId: id}});
    if (n.count !== approved.length) throw new AppError('CONFLICT', 409, 'Commissions changed while creating the payout. Try again.');
    await audit(tx, auditCtx(req, res), 'payout.create', 'affiliate', a.id, {payoutId: id, gross, tdsPaise, commissions: approved.length});
    return {id, grossPaise: gross.toString(), tdsPaise: tdsPaise.toString(), netPaise: (gross - tdsPaise).toString(), commissions: approved.length, taxConfigured: configured};
  });
  send(res, out, 201);
});
route(r, {method: 'post', path: '/affiliate-payouts/:id/paid', access: 'STAFF:refunds.write', tag: 'Admin partners', summary: 'Record the bank/UPI transfer reference; commissions become PAID', body: C.PayoutMarkPaid}, staff('refunds.write'), async (req, res) => {
  const b = parse(C.PayoutMarkPaid, req.body);
  const id = param(req, 'id');
  await transaction(async (tx) => {
    const n = await tx.affiliatePayout.updateMany({where: {id, status: 'PENDING'}, data: {status: 'PAID', method: b.method, reference: b.reference, paidAt: new Date()}});
    if (n.count !== 1) throw new AppError('CONFLICT', 409, 'This payout is not pending.');
    await tx.affiliateCommission.updateMany({where: {payoutId: id, status: 'APPROVED'}, data: {status: 'PAID'}});
    await audit(tx, auditCtx(req, res), 'payout.paid', 'affiliate_payout', id, {method: b.method, reference: b.reference});
  });
  send(res, {id, status: 'PAID'});
});
route(r, {method: 'post', path: '/affiliate-payouts/:id/cancel', access: 'STAFF:refunds.write', tag: 'Admin partners', summary: 'Cancel a pending payout; its commissions return to the approved balance'}, staff('refunds.write'), async (req, res) => {
  const id = param(req, 'id');
  await transaction(async (tx) => {
    const n = await tx.affiliatePayout.updateMany({where: {id, status: 'PENDING'}, data: {status: 'CANCELLED'}});
    if (n.count !== 1) throw new AppError('CONFLICT', 409, 'Only pending payouts can be cancelled.');
    await tx.affiliateCommission.updateMany({where: {payoutId: id, status: 'APPROVED'}, data: {payoutId: null}});
    await audit(tx, auditCtx(req, res), 'payout.cancel', 'affiliate_payout', id);
  });
  send(res, {id, status: 'CANCELLED'});
});
