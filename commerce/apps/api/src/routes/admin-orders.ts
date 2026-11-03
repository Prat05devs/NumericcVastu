import {Router} from 'express';
import {z} from 'zod';
import * as C from '@sc/contracts';
import {nextShipmentStatus, type OrderStatus, type ShipmentStatus} from '@sc/contracts';
import {prisma} from '../lib/db.js';
import {AppError, notFound} from '../lib/errors.js';
import {ulid} from '../lib/ids.js';
import {decrypt} from '../lib/crypto.js';
import {noStore, param, parse, route, send, toPlain, mounted} from '../lib/http.js';
import {audit} from '../lib/audit.js';
import {enqueue} from '../lib/outbox.js';
import {idempotent} from '../lib/idempotency.js';
import {maskEmail} from '../lib/redact.js';
import {transaction, affected} from '../lib/tx.js';
import {auditCtx, requireStaff, staffOf} from '../middleware/auth.js';
import {lockOrder, moveOrder, releaseHolds, restock} from '../services/orders.js';
import {requestRefund} from '../services/refunds.js';
import {applyTrackingEvent, shipOrder} from '../services/shipping.js';
import {reconcilePayment} from '../services/payments.js';

export const adminOrdersRouter = mounted(Router(), '/admin');
const r = adminOrdersRouter;
const staff = requireStaff;
const seesContact = (role: string) => role === 'OWNER' || role === 'FULFILLMENT' || role === 'FINANCE';

// ───────────── Orders
route(r, {method: 'get', path: '/orders', access: 'STAFF:orders.read', tag: 'Admin orders', summary: 'Order list with PII masking'}, staff('orders.read'), async (req, res) => {
  noStore(res);
  const q = parse(z.object({status: z.string().max(30).optional(), q: z.string().max(60).optional(), page: z.coerce.number().int().min(1).max(1000).default(1)}), req.query);
  const where = {...(q.status && {status: q.status}), ...(q.q && {OR: [{publicCode: {contains: q.q.toUpperCase()}}, {email: q.q.toLowerCase()}]})};
  const [rows, total] = await Promise.all([
    prisma.order.findMany({where, orderBy: {createdAt: 'desc'}, skip: (q.page - 1) * 50, take: 50, select: {id: true, publicCode: true, email: true, status: true, paymentStatus: true, fulfillmentStatus: true, totalPaise: true, createdAt: true, storefrontId: true, customRequestId: true, affiliateLinkId: true}}),
    prisma.order.count({where}),
  ]);
  const role = staffOf(res).user.role;
  send(res, toPlain(rows.map((o) => ({...o, email: seesContact(role) ? o.email : maskEmail(o.email)}))), 200, {total});
});
function allowedActions(status: string, paymentStatus: string) {
  return {
    markProcessing: status === 'PAID', fulfill: ['PAID', 'PROCESSING'].includes(status), cancelUnpaid: ['AWAITING_PAYMENT', 'PAYMENT_FAILED'].includes(status),
    refund: ['CAPTURED', 'PARTIALLY_REFUNDED'].includes(paymentStatus), approveReview: status === 'PAID_REVIEW', reconcile: ['AWAITING_PAYMENT', 'PAYMENT_FAILED', 'CANCELLED'].includes(status),
  };
}
route(r, {method: 'get', path: '/orders/:id', access: 'STAFF:orders.read', tag: 'Admin orders', summary: 'Order timeline with action gating'}, staff('orders.read'), async (req, res) => {
  noStore(res);
  const o = await prisma.order.findUnique({where: {id: param(req, 'id')}, include: {lines: true, addresses: true, payments: true, refunds: true, shipments: {include: {events: true}}, events: {orderBy: {createdAt: 'asc'}}, reservations: true, returns: true, redemption: true}});
  if (!o) throw notFound('Order');
  const role = staffOf(res).user.role;
  const contact = seesContact(role);
  const commission = await prisma.affiliateCommission.findUnique({where: {orderId: o.id}, include: {affiliate: {select: {name: true}}}});
  await audit(prisma, auditCtx(req, res), 'order.view', 'order', o.id, {});
  send(res, toPlain({...o, email: contact ? o.email : maskEmail(o.email), addresses: contact ? o.addresses : o.addresses.map((a) => ({type: a.type, snapshotJson: {city: (a.snapshotJson as Record<string, unknown>)['city'], state: (a.snapshotJson as Record<string, unknown>)['state']}})), accessTokenHash: undefined, commission, actions: allowedActions(o.status, o.paymentStatus)}));
});
route(r, {method: 'post', path: '/orders/:id/processing', access: 'STAFF:orders.fulfill', tag: 'Admin orders', summary: 'Start packing a paid order'}, staff('orders.fulfill'), async (req, res) => {
  const id = param(req, 'id');
  await transaction(async (tx) => {
    await lockOrder(tx, id);
    const o = await tx.order.findUnique({where: {id}});
    if (!o) throw notFound('Order');
    await moveOrder(tx, id, o.status as OrderStatus, 'PROCESSING', staffOf(res).user.id, 'Packing started', {fulfillmentStatus: 'PROCESSING'});
    await audit(tx, auditCtx(req, res), 'order.processing', 'order', id);
  });
  send(res, {id, status: 'PROCESSING'});
});
route(r, {method: 'post', path: '/orders/:id/fulfill', access: 'STAFF:orders.fulfill', tag: 'Admin orders', summary: 'Ship: manual tracking entry or booking through a delivery partner', body: C.FulfillOrder}, staff('orders.fulfill'), async (req, res) => {
  const b = parse(C.FulfillOrder, req.body);
  const out = await shipOrder(param(req, 'id'), b, staffOf(res).user.id);
  await audit(prisma, auditCtx(req, res), 'order.fulfill', 'order', param(req, 'id'), {provider: b.provider, courier: b.courier, trackingNo: out.trackingNo});
  send(res, out);
});
const ShipmentPatch = z.object({status: z.enum(C.SHIPMENT_STATUSES), note: z.string().max(300).optional(), location: z.string().max(160).optional()});
route(r, {method: 'patch', path: '/shipments/:id', access: 'STAFF:orders.fulfill', tag: 'Admin orders', summary: 'Manual courier update (forward-only; same path as partner webhooks)', body: ShipmentPatch}, staff('orders.fulfill'), async (req, res) => {
  const b = parse(ShipmentPatch, req.body);
  const out = await transaction(async (tx) => {
    const s = await tx.shipment.findUnique({where: {id: param(req, 'id')}});
    if (!s) throw notFound('Shipment');
    if (nextShipmentStatus(s.status as ShipmentStatus, b.status) === s.status) throw new AppError('ILLEGAL_TRANSITION', 409, `Shipment cannot move from ${s.status} to ${b.status}.`);
    const r = await applyTrackingEvent(tx, s.id, {provider: 'staff', eventId: ulid(), trackingNo: s.trackingNo, status: b.status, occurredAt: new Date(), location: b.location, description: b.note}, staffOf(res).user.id, '0'.repeat(64));
    await audit(tx, auditCtx(req, res), 'shipment.update', 'shipment', s.id, {status: b.status});
    return {id: s.id, ...r};
  });
  send(res, out);
});
route(r, {method: 'get', path: '/delivery-feedback', access: 'STAFF:orders.read', tag: 'Admin orders', summary: 'Delivery ratings with per-courier averages'}, staff('orders.read'), async (_req, res) => {
  noStore(res);
  const rows = await prisma.deliveryFeedback.findMany({orderBy: {createdAt: 'desc'}, take: 200, include: {shipment: {select: {courier: true, trackingNo: true}}}});
  const byCourier: Record<string, {count: number; average: number; onTimeRate: number | null}> = {};
  for (const f of rows) {
    const k = f.shipment?.courier ?? 'unknown';
    const c = byCourier[k] ?? {count: 0, average: 0, onTimeRate: null};
    c.average = (c.average * c.count + f.rating) / (c.count + 1);
    c.count++;
    byCourier[k] = c;
  }
  for (const [k, c] of Object.entries(byCourier)) {
    const answered = rows.filter((f) => (f.shipment?.courier ?? 'unknown') === k && f.onTime !== null);
    c.onTimeRate = answered.length ? answered.filter((f) => f.onTime).length / answered.length : null;
    c.average = Math.round(c.average * 100) / 100;
  }
  const orders = await prisma.order.findMany({where: {id: {in: rows.map((f) => f.orderId)}}, select: {id: true, publicCode: true}});
  send(res, {byCourier, items: rows.map((f) => ({...f, orderCode: orders.find((o) => o.id === f.orderId)?.publicCode}))});
});
route(r, {method: 'patch', path: '/delivery-feedback/:id', access: 'STAFF:orders.read', tag: 'Admin orders', summary: 'Mark feedback reviewed', body: z.object({status: z.enum(['NEW', 'REVIEWED'])})}, staff('orders.read'), async (req, res) => {
  const {status} = parse(z.object({status: z.enum(['NEW', 'REVIEWED'])}), req.body);
  const n = await prisma.deliveryFeedback.updateMany({where: {id: param(req, 'id')}, data: {status}});
  if (n.count !== 1) throw notFound('Feedback');
  send(res, {id: param(req, 'id'), status});
});
route(r, {method: 'post', path: '/orders/:id/refund', access: 'STAFF:refunds.write', tag: 'Admin orders', summary: 'Refund: limit-guarded, idempotent, with reason', body: C.RefundCreate.extend({restock: z.boolean().default(false)}), idempotent: true}, staff('refunds.write'), async (req, res) => {
  const b = parse(C.RefundCreate.extend({restock: z.boolean().default(false)}), req.body);
  const id = param(req, 'id');
  const actorId = staffOf(res).user.id;
  const result = await idempotent(req, 'refund', id, async (idem) => {
    const out = await requestRefund(id, BigInt(b.amountPaise), b.reason, {actorId, restock: b.restock, idem});
    await audit(prisma, auditCtx(req, res), 'order.refund', 'order', id, {amountPaise: b.amountPaise, reason: b.reason, refundId: out.refundId, restock: b.restock});
    return {status: 202, body: out};
  });
  send(res, result.body, result.status);
});
route(r, {method: 'post', path: '/orders/:id/cancel', access: 'STAFF:orders.cancel', tag: 'Admin orders', summary: 'Cancel an unpaid order and release its stock', body: C.CancelOrder}, staff('orders.cancel'), async (req, res) => {
  const {reason} = parse(C.CancelOrder, req.body);
  const id = param(req, 'id');
  await transaction(async (tx) => {
    await lockOrder(tx, id);
    const o = await tx.order.findUnique({where: {id}});
    if (!o) throw notFound('Order');
    if (!['AWAITING_PAYMENT', 'PAYMENT_FAILED'].includes(o.status)) throw new AppError('ILLEGAL_TRANSITION', 409, 'Paid orders are closed through a full refund.');
    await moveOrder(tx, id, o.status as OrderStatus, 'CANCELLED', staffOf(res).user.id, reason ?? 'Cancelled by staff', {cancelledAt: new Date()});
    await releaseHolds(tx, id);
    await audit(tx, auditCtx(req, res), 'order.cancel', 'order', id, {reason});
  });
  send(res, {id, status: 'CANCELLED'});
});
route(r, {method: 'post', path: '/orders/:id/approve-review', access: 'STAFF:orders.cancel', tag: 'Admin orders', summary: 'PAID_REVIEW → PAID only when all stock is actually allocated', body: z.object({note: z.string().trim().min(5).max(500)})}, staff('orders.cancel'), async (req, res) => {
  const {note} = parse(z.object({note: z.string().trim().min(5).max(500)}), req.body);
  const id = param(req, 'id');
  await transaction(async (tx) => {
    await lockOrder(tx, id);
    const o = await tx.order.findUnique({where: {id}, include: {reservations: true}});
    if (!o) throw notFound('Order');
    if (o.status !== 'PAID_REVIEW') throw new AppError('ILLEGAL_TRANSITION', 409, 'Only orders in review can be approved.');
    // Try to allocate anything still missing (stock may have been received since).
    for (const h of o.reservations.filter((x) => x.status !== 'CONSUMED')) {
      const n = await tx.$executeRaw`UPDATE inventory_items SET on_hand_qty=on_hand_qty-${h.qty}, version=version+1 WHERE variant_id=${h.variantId} AND on_hand_qty-reserved_qty>=${h.qty}`;
      if (affected(n) !== 1) throw new AppError('INSUFFICIENT_STOCK', 409, 'Stock is still not available for this order. Refund it instead, or receive stock first.');
      await tx.inventoryReservation.update({where: {id: h.id}, data: {status: 'CONSUMED', consumedAt: new Date()}});
      await tx.inventoryMovement.create({data: {id: ulid(), variantId: h.variantId, kind: 'SALE', qtyDelta: -h.qty, referenceType: 'order', referenceId: id, note: 'Allocated on review approval', actorId: staffOf(res).user.id}});
    }
    const payment = await tx.payment.findFirst({where: {orderId: id, status: 'CAPTURED'}});
    if (!payment || payment.amountPaise !== o.totalPaise || payment.failureReason) throw new AppError('CONFLICT', 409, 'The captured amount does not match; refund instead.');
    await moveOrder(tx, id, 'PAID_REVIEW', 'PAID', staffOf(res).user.id, `Review approved: ${note}`);
    await audit(tx, auditCtx(req, res), 'order.approve_review', 'order', id, {note});
  });
  send(res, {id, status: 'PAID'});
});
route(r, {method: 'post', path: '/orders/:id/reconcile', access: 'STAFF:orders.read', tag: 'Admin orders', summary: 'Ask the payment provider for this order’s payments now'}, staff('orders.read'), async (req, res) => {
  const payments = await prisma.payment.findMany({where: {orderId: param(req, 'id')}});
  const results = [];
  for (const p of payments) results.push({paymentId: p.id, result: await reconcilePayment(p.id).catch((e: Error) => `ERROR: ${e.message}`)});
  send(res, results);
});

// ───────────── Returns
route(r, {method: 'get', path: '/returns', access: 'STAFF:orders.read', tag: 'Admin orders', summary: 'Return requests'}, staff('orders.read'), async (_req, res) => {
  noStore(res);
  send(res, await prisma.returnRequest.findMany({orderBy: {requestedAt: 'desc'}, take: 200, include: {order: {select: {publicCode: true, status: true}}}}));
});
const ReturnDecision = z.object({status: z.enum(['APPROVED', 'REJECTED', 'RECEIVED', 'CLOSED']), restock: z.boolean().default(false), note: z.string().trim().min(3).max(500)});
route(r, {method: 'patch', path: '/returns/:id', access: 'STAFF:returns.write', tag: 'Admin orders', summary: 'Decide / receive a return (refund separately via refund)', body: ReturnDecision}, staff('returns.write'), async (req, res) => {
  const b = parse(ReturnDecision, req.body);
  const out = await transaction(async (tx) => {
    const rr = await tx.returnRequest.findUnique({where: {id: param(req, 'id')}});
    if (!rr) throw notFound('Return');
    C.assertTransition('return', C.RETURN_TRANSITIONS, rr.status as C.ReturnStatus, b.status);
    const n = await tx.returnRequest.updateMany({where: {id: rr.id, status: rr.status}, data: {status: b.status, decisionAt: new Date(), decisionBy: staffOf(res).user.id}});
    if (n.count !== 1) throw new AppError('CONFLICT', 409, 'The return changed; reload.');
    const o = await tx.order.findUniqueOrThrow({where: {id: rr.orderId}});
    if (b.status === 'REJECTED' && o.status === 'RETURN_REQUESTED') await moveOrder(tx, o.id, 'RETURN_REQUESTED', 'DELIVERED', staffOf(res).user.id, `Return rejected: ${b.note}`);
    if (b.status === 'RECEIVED') {
      if (o.status === 'RETURN_REQUESTED') await moveOrder(tx, o.id, 'RETURN_REQUESTED', 'RETURNED', staffOf(res).user.id, `Return received: ${b.note}`);
      if (b.restock) await restock(tx, o.id, staffOf(res).user.id, `Return ${rr.id} received in sellable condition`);
    }
    await audit(tx, auditCtx(req, res), 'return.decision', 'return', rr.id, {status: b.status, restock: b.restock, note: b.note});
    return {id: rr.id, status: b.status};
  });
  send(res, out);
});

// ───────────── Made-to-order wristwatch desk
route(r, {method: 'get', path: '/custom-requests', access: 'STAFF:requests.read', tag: 'Admin requests', summary: 'Request inbox (no private details in the list)'}, staff('requests.read'), async (req, res) => {
  noStore(res);
  const status = typeof req.query['status'] === 'string' ? req.query['status'] : undefined;
  send(res, await prisma.customRequest.findMany({where: status ? {status} : {}, orderBy: {createdAt: 'desc'}, take: 200, select: {id: true, referenceCode: true, requestType: true, status: true, budgetBand: true, createdAt: true, updatedAt: true, _count: {select: {quotations: true}}}}));
});
route(r, {method: 'get', path: '/custom-requests/:id', access: 'STAFF:requests.read', tag: 'Admin requests', summary: 'Request with decrypted details (access is audited)'}, staff('requests.read'), async (req, res) => {
  noStore(res);
  const cr = await prisma.customRequest.findUnique({where: {id: param(req, 'id')}, include: {quotations: {include: {items: true}, orderBy: {version: 'desc'}}}});
  if (!cr) throw notFound('Request');
  await audit(prisma, auditCtx(req, res), 'custom_request.view_private', 'custom_request', cr.id, {});
  send(res, toPlain({...cr, privateDetailsEncrypted: undefined, accessTokenHash: undefined, emailHash: undefined, details: JSON.parse(decrypt(cr.privateDetailsEncrypted))}));
});
route(r, {method: 'post', path: '/custom-requests/:id/quotes', access: 'STAFF:quotes.write', tag: 'Admin requests', summary: 'Create a versioned quotation (supersedes the previous one)', body: C.QuoteCreate}, staff('quotes.write'), async (req, res) => {
  const b = parse(C.QuoteCreate, req.body);
  const out = await transaction(async (tx) => {
    const cr = await tx.customRequest.findUnique({where: {id: param(req, 'id')}});
    if (!cr) throw notFound('Request');
    C.assertTransition('custom request', C.CUSTOM_REQUEST_TRANSITIONS, cr.status as C.CustomRequestStatus, 'QUOTED');
    const last = await tx.quotation.findFirst({where: {requestId: cr.id}, orderBy: {version: 'desc'}});
    await tx.quotation.updateMany({where: {requestId: cr.id, status: 'SENT'}, data: {status: 'SUPERSEDED'}});
    const id = ulid();
    const version = (last?.version ?? 0) + 1;
    const total = b.items.reduce((s, i) => s + BigInt(i.unitPaise) * BigInt(i.qty) + BigInt(i.taxPaise), 0n);
    if (total <= 0n) throw new AppError('VALIDATION_FAILED', 422, 'Quotation total must be positive.');
    await tx.quotation.create({data: {id, requestId: cr.id, version, totalPaise: total, expiresAt: new Date(Date.now() + b.validDays * 86_400_000), termsSnapshot: b.terms, createdBy: staffOf(res).user.id, items: {create: b.items.map((i) => ({id: ulid(), description: i.description, qty: i.qty, unitPaise: BigInt(i.unitPaise), taxPaise: BigInt(i.taxPaise)}))}}});
    const n = await tx.customRequest.updateMany({where: {id: cr.id, status: cr.status}, data: {status: 'QUOTED'}});
    if (n.count !== 1) throw new AppError('CONFLICT', 409, 'The request changed; reload.');
    const details = JSON.parse(decrypt(cr.privateDetailsEncrypted)) as {email: string};
    await enqueue(tx, 'email.quote_sent', {email: details.email, referenceCode: cr.referenceCode}, `quote:${id}`);
    await audit(tx, auditCtx(req, res), 'quote.create', 'custom_request', cr.id, {version, totalPaise: total});
    return {id, version, totalPaise: total.toString()};
  });
  send(res, out, 201);
});
route(r, {method: 'patch', path: '/custom-requests/:id/status', access: 'STAFF:requests.write', tag: 'Admin requests', summary: 'Guarded transitions; audited', body: C.RequestStatusPatch}, staff('requests.write'), async (req, res) => {
  const b = parse(C.RequestStatusPatch, req.body);
  await transaction(async (tx) => {
    const cr = await tx.customRequest.findUnique({where: {id: param(req, 'id')}});
    if (!cr) throw notFound('Request');
    C.assertTransition('custom request', C.CUSTOM_REQUEST_TRANSITIONS, cr.status as C.CustomRequestStatus, b.status);
    const n = await tx.customRequest.updateMany({where: {id: cr.id, status: cr.status}, data: {status: b.status, ...(b.note && {publicNotes: b.note})}});
    if (n.count !== 1) throw new AppError('CONFLICT', 409, 'The request changed; reload.');
    if (b.status === 'COMPLETED') await tx.affiliateCommission.updateMany({where: {orderId: {in: (await tx.order.findMany({where: {customRequestId: cr.id}, select: {id: true}})).map((o) => o.id)}, status: 'PENDING'}, data: {approvableAt: new Date()}});
    await audit(tx, auditCtx(req, res), 'custom_request.status', 'custom_request', cr.id, {from: cr.status, to: b.status});
  });
  send(res, {id: param(req, 'id'), status: b.status});
});

// ───────────── Consultation enquiries
route(r, {method: 'get', path: '/consultation-leads', access: 'STAFF:requests.read', tag: 'Admin requests', summary: 'Consultation enquiries (contact details decrypted on open)'}, staff('requests.read'), async (_req, res) => {
  noStore(res);
  send(res, await prisma.consultationLead.findMany({orderBy: {createdAt: 'desc'}, take: 200, select: {id: true, topic: true, status: true, createdAt: true}}));
});
route(r, {method: 'get', path: '/consultation-leads/:id', access: 'STAFF:requests.read', tag: 'Admin requests', summary: 'Open an enquiry (audited)'}, staff('requests.read'), async (req, res) => {
  noStore(res);
  const l = await prisma.consultationLead.findUnique({where: {id: param(req, 'id')}});
  if (!l) throw notFound('Enquiry');
  await audit(prisma, auditCtx(req, res), 'consultation.view_private', 'consultation_lead', l.id, {});
  send(res, {...l, contactRef: undefined, contact: JSON.parse(decrypt(l.contactRef))});
});
route(r, {method: 'patch', path: '/consultation-leads/:id', access: 'STAFF:requests.write', tag: 'Admin requests', summary: 'Update enquiry status', body: z.object({status: z.enum(['NEW', 'CONTACTED', 'BOOKED', 'CLOSED'])})}, staff('requests.write'), async (req, res) => {
  const {status} = parse(z.object({status: z.enum(['NEW', 'CONTACTED', 'BOOKED', 'CLOSED'])}), req.body);
  const n = await prisma.consultationLead.updateMany({where: {id: param(req, 'id')}, data: {status}});
  if (n.count !== 1) throw notFound('Enquiry');
  await audit(prisma, auditCtx(req, res), 'consultation.status', 'consultation_lead', param(req, 'id'), {status});
  send(res, {id: param(req, 'id'), status});
});

// ───────────── CMS (policies need named legal approval and the OWNER to publish)
route(r, {method: 'get', path: '/cms/pages', access: 'STAFF:cms.write', tag: 'Admin content', summary: 'CMS pages'}, staff('cms.write'), async (_req, res) => {
  noStore(res);
  send(res, await prisma.cmsPage.findMany({orderBy: {slug: 'asc'}}));
});
const PageCreate = z.object({slug: C.Slug, title: z.string().trim().min(2).max(200), kind: z.enum(['PAGE', 'POLICY', 'HOME'])});
route(r, {method: 'post', path: '/cms/pages', access: 'STAFF:cms.write', tag: 'Admin content', summary: 'Create a draft page', body: PageCreate}, staff('cms.write'), async (req, res) => {
  const b = parse(PageCreate, req.body);
  const id = ulid();
  await prisma.cmsPage.create({data: {id, ...b, bodyBlocksJson: [], updatedBy: staffOf(res).user.id}}).catch(() => { throw new AppError('CONFLICT', 409, 'That slug is already used.'); });
  await audit(prisma, auditCtx(req, res), 'cms.create', 'cms_page', id, b);
  send(res, {id, version: 0}, 201);
});
route(r, {method: 'patch', path: '/cms/pages/:id', access: 'STAFF:cms.write', tag: 'Admin content', summary: 'Save revision and optionally publish (policies: owner + legal approval)', body: C.CmsPagePatch}, staff('cms.write'), async (req, res) => {
  const b = parse(C.CmsPagePatch, req.body);
  const id = param(req, 'id');
  const out = await transaction(async (tx) => {
    const page = await tx.cmsPage.findUnique({where: {id}});
    if (!page) throw notFound('Page');
    if (b.status === 'PUBLISHED' && page.kind === 'POLICY') {
      if (staffOf(res).user.role !== 'OWNER') throw new AppError('FORBIDDEN', 403, 'Only the owner can publish a policy.');
      if (!b.legalApprovedBy && !page.legalApprovedBy) throw new AppError('PUBLISH_BLOCKED', 422, 'Policies are published only after legal review: enter who approved this text.');
    }
    const n = await tx.cmsPage.updateMany({where: {id, version: b.version}, data: {
      ...(b.title && {title: b.title}), ...(b.bodyBlocks && {bodyBlocksJson: b.bodyBlocks}), ...(b.seoTitle !== undefined && {seoTitle: b.seoTitle}), ...(b.seoDescription !== undefined && {seoDescription: b.seoDescription}),
      ...(b.legalApprovedBy && {legalApprovedBy: b.legalApprovedBy}), ...(b.status && {status: b.status, ...(b.status === 'PUBLISHED' && {publishedAt: new Date()})}),
      version: {increment: 1}, updatedBy: staffOf(res).user.id,
    }});
    if (n.count !== 1) throw new AppError('STALE_VERSION', 409, 'Someone else saved this page. Reload to see their changes.');
    await audit(tx, auditCtx(req, res), b.status === 'PUBLISHED' ? 'cms.publish' : 'cms.save', 'cms_page', id, {status: b.status, legalApprovedBy: b.legalApprovedBy});
    await enqueue(tx, 'web.revalidate', {paths: [`/${page.slug}`, `/policies/${page.slug}`], tags: ['cms']}, null);
    return {id, version: b.version + 1};
  });
  send(res, out);
});
const ArticleIn = z.object({slug: C.Slug, title: z.string().trim().min(2).max(200), summary: z.string().max(400).default(''), body: z.string().max(50_000), author: z.string().trim().min(2).max(120), status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT')});
route(r, {method: 'get', path: '/articles', access: 'STAFF:cms.write', tag: 'Admin content', summary: 'Guides'}, staff('cms.write'), async (_req, res) => { noStore(res); send(res, await prisma.article.findMany({orderBy: {updatedAt: 'desc'}})); });
route(r, {method: 'post', path: '/articles', access: 'STAFF:cms.write', tag: 'Admin content', summary: 'Create a guide', body: ArticleIn}, staff('cms.write'), async (req, res) => {
  const b = parse(ArticleIn, req.body);
  const id = ulid();
  await prisma.article.create({data: {id, ...b, publishedAt: b.status === 'PUBLISHED' ? new Date() : null}}).catch(() => { throw new AppError('CONFLICT', 409, 'That slug is already used.'); });
  await audit(prisma, auditCtx(req, res), 'article.create', 'article', id, {slug: b.slug, status: b.status});
  send(res, {id}, 201);
});
route(r, {method: 'patch', path: '/articles/:id', access: 'STAFF:cms.write', tag: 'Admin content', summary: 'Edit or publish a guide', body: C.patchOf(ArticleIn)}, staff('cms.write'), async (req, res) => {
  const b = parse(C.patchOf(ArticleIn), req.body);
  const n = await prisma.article.updateMany({where: {id: param(req, 'id')}, data: {...b, ...(b.status === 'PUBLISHED' && {publishedAt: new Date()})}});
  if (n.count !== 1) throw notFound('Article');
  await audit(prisma, auditCtx(req, res), 'article.update', 'article', param(req, 'id'), {fields: Object.keys(b)});
  send(res, {id: param(req, 'id')});
});
route(r, {method: 'get', path: '/reviews', access: 'STAFF:cms.write', tag: 'Admin content', summary: 'Review moderation queue'}, staff('cms.write'), async (_req, res) => {
  noStore(res);
  send(res, await prisma.review.findMany({where: {status: 'PENDING'}, orderBy: {createdAt: 'asc'}, take: 100, include: {product: {select: {title: true}}}}));
});
route(r, {method: 'patch', path: '/reviews/:id', access: 'STAFF:cms.write', tag: 'Admin content', summary: 'Approve or reject a review', body: z.object({status: z.enum(['APPROVED', 'REJECTED']), moderation: z.string().max(500).optional()})}, staff('cms.write'), async (req, res) => {
  const b = parse(z.object({status: z.enum(['APPROVED', 'REJECTED']), moderation: z.string().max(500).optional()}), req.body);
  const n = await prisma.review.updateMany({where: {id: param(req, 'id')}, data: {status: b.status, moderation: b.moderation ?? null}});
  if (n.count !== 1) throw notFound('Review');
  await audit(prisma, auditCtx(req, res), 'review.moderate', 'review', param(req, 'id'), b);
  send(res, {id: param(req, 'id'), status: b.status});
});
