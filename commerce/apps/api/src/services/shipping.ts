import {nextShipmentStatus, type ShipmentStatus} from '@sc/contracts';
import {prisma, type Tx} from '../lib/db.js';
import {AppError, notFound} from '../lib/errors.js';
import {ulid} from '../lib/ids.js';
import {enqueue} from '../lib/outbox.js';
import {sha256} from '../lib/redact.js';
import {transaction} from '../lib/tx.js';
import {logger} from '../lib/logger.js';
import {shippingProvider, SHIPPING_PROVIDERS, type TrackingEvent} from '../providers/shipping/index.js';
import {lockOrder, moveOrder} from './orders.js';
import {startCommissionHold} from './affiliates.js';

/**
 * One path for every shipment update — courier webhook, polling job, or a person in the back office:
 * dedupe by provider event id → forward-only status (a late "in transit" never undoes "delivered") → order moves to
 * DELIVERED once → commission hold starts → customer is asked for delivery feedback.
 */
export async function applyTrackingEvent(tx: Tx, shipmentId: string, e: TrackingEvent & {provider: string}, actorId: string | null, digest: string) {
  const dedupe = `${e.provider}:${e.eventId}`.slice(0, 120);
  if (await tx.shipmentEvent.findUnique({where: {providerEventId: dedupe}})) return {applied: false, duplicate: true};
  const s = await tx.shipment.findUniqueOrThrow({where: {id: shipmentId}});
  const next = nextShipmentStatus(s.status as ShipmentStatus, e.status);
  const applied = next !== s.status;
  await tx.shipmentEvent.create({data: {id: ulid(), shipmentId: s.id, providerEventId: dedupe, status: e.status, occurredAt: e.occurredAt, location: e.location ?? null, description: e.description ?? null, payloadDigest: digest, applied}});
  if (e.expectedBy) await tx.shipment.update({where: {id: s.id}, data: {expectedBy: e.expectedBy}});
  if (!applied) return {applied: false, status: s.status};
  await tx.shipment.update({where: {id: s.id}, data: {status: next, ...(next === 'DELIVERED' && {deliveredAt: e.occurredAt})}});
  await lockOrder(tx, s.orderId);
  const order = await tx.order.findUniqueOrThrow({where: {id: s.orderId}});
  if (next === 'DELIVERED' && order.status === 'SHIPPED') {
    const others = await tx.shipment.count({where: {orderId: order.id, id: {not: s.id}, status: {notIn: ['DELIVERED', 'RETURNED']}}});
    if (others === 0) {
      await moveOrder(tx, order.id, 'SHIPPED', 'DELIVERED', actorId, `Delivered (${s.courier})`, {fulfillmentStatus: 'DELIVERED'});
      await startCommissionHold(tx, order.id, e.occurredAt);
      await enqueue(tx, 'email.delivery_feedback_request', {orderId: order.id}, `feedback_request:${order.id}`, new Date(Date.now() + 2 * 3600_000));
    }
  } else if (next === 'OUT_FOR_DELIVERY') {
    await enqueue(tx, 'email.out_for_delivery', {orderId: order.id, courier: s.courier, trackingNo: s.trackingNo}, `ofd:${s.id}`);
  } else if (next === 'FAILED' || next === 'RETURNED') {
    await tx.orderEvent.create({data: {id: ulid(), orderId: order.id, actorId, fromStatus: order.status, toStatus: order.status, reason: `Courier reported ${next}${e.description ? `: ${e.description}` : ''}`}});
    await enqueue(tx, 'finance.alert', {orderId: order.id, kind: `SHIPMENT_${next}`, shipmentId: s.id}, `ship_${next}:${s.id}`);
  }
  return {applied: true, status: next};
}

export async function handleShippingWebhook(providerId: string, raw: Buffer, headers: Record<string, string | undefined>) {
  const provider = SHIPPING_PROVIDERS[providerId];
  if (!provider) throw notFound();
  if (!(await provider.verifyWebhook(raw, headers))) throw new AppError('UNAUTHENTICATED', 401, 'Invalid signature.');
  let events: TrackingEvent[];
  try { events = provider.parseWebhook(raw, headers); } catch { throw new AppError('VALIDATION_FAILED', 400, 'Unreadable event.'); }
  const digest = sha256(raw.toString('base64'));
  const results = [];
  for (const e of events) {
    results.push(await transaction(async (tx) => {
      const s = await tx.shipment.findFirst({where: {trackingNo: e.trackingNo, ...(e.courier ? {courier: e.courier} : {}), ...(providerId !== 'generic' && {provider: providerId})}});
      if (!s) return {eventId: e.eventId, applied: false, reason: 'unknown shipment'};
      return {eventId: e.eventId, ...(await applyTrackingEvent(tx, s.id, {...e, provider: providerId}, null, digest))};
    }));
  }
  return {received: events.length, results};
}

/** Creates the shipment: manual (tracking typed by staff) or booked through an integrated partner (outside the tx). */
export async function shipOrder(orderId: string, input: {provider: string; courier: string; service?: string | undefined; trackingNo?: string | undefined; shippingCostPaise?: string | undefined; expectedBy?: string | undefined}, actorId: string) {
  const provider = shippingProvider(input.provider);
  let booking = input.trackingNo ? {trackingNo: input.trackingNo, courier: input.courier, service: input.service, labelUrl: undefined as string | undefined, expectedBy: input.expectedBy ? new Date(input.expectedBy) : undefined, costPaise: input.shippingCostPaise ? BigInt(input.shippingCostPaise) : undefined} : null;
  if (!booking) {
    if (!provider.book) throw new AppError('VALIDATION_FAILED', 422, 'Enter the tracking number from the courier.');
    const o = await prisma.order.findUniqueOrThrow({where: {id: orderId}, include: {lines: {include: {variant: {select: {weightG: true}}}}, addresses: true}});
    if (!['PAID', 'PROCESSING'].includes(o.status)) throw new AppError('ILLEGAL_TRANSITION', 409, `A ${o.status} order cannot be shipped.`);
    const b = await provider.book({orderId, publicCode: o.publicCode, service: input.service, address: (o.addresses.find((a) => a.type === 'SHIPPING')?.snapshotJson ?? {}) as Record<string, unknown>, lines: o.lines.map((l) => ({sku: l.skuSnapshot, title: l.titleSnapshot, qty: l.qty, unitPricePaise: l.unitPricePaise, weightG: l.variant.weightG})), totalPaise: o.totalPaise, paid: Boolean(o.paidAt)});
    booking = {...b, service: b.service ?? input.service, labelUrl: b.labelUrl, expectedBy: b.expectedBy, costPaise: b.costPaise};
  }
  const bk = booking;
  return transaction(async (tx) => {
    await lockOrder(tx, orderId);
    const o = await tx.order.findUnique({where: {id: orderId}, include: {reservations: true}});
    if (!o) throw notFound('Order');
    if (!['PAID', 'PROCESSING'].includes(o.status)) throw new AppError('ILLEGAL_TRANSITION', 409, `A ${o.status} order cannot be shipped.`);
    if (o.reservations.some((x) => x.status !== 'CONSUMED')) throw new AppError('CONFLICT', 409, 'Stock for this order is not fully allocated.');
    if (o.status === 'PAID') await moveOrder(tx, orderId, 'PAID', 'PROCESSING', actorId, 'Packing started');
    const shipmentId = ulid();
    await tx.shipment.create({data: {id: shipmentId, orderId, provider: provider.id, courier: bk.courier, service: bk.service ?? null, trackingNo: bk.trackingNo, status: 'SHIPPED', shippingCostPaise: bk.costPaise ?? null, labelUrl: bk.labelUrl ?? null, expectedBy: bk.expectedBy ?? null}});
    await tx.shipmentEvent.create({data: {id: ulid(), shipmentId, status: 'SHIPPED', occurredAt: new Date(), description: `Handed to ${bk.courier}`, payloadDigest: '0'.repeat(64), applied: true}});
    await moveOrder(tx, orderId, 'PROCESSING', 'SHIPPED', actorId, `Shipped with ${bk.courier} ${bk.trackingNo}`, {fulfillmentStatus: 'SHIPPED'});
    await enqueue(tx, 'email.order_shipped', {orderId, courier: bk.courier, trackingNo: bk.trackingNo}, `shipped:${shipmentId}`);
    return {id: orderId, status: 'SHIPPED', shipmentId, trackingNo: bk.trackingNo, labelUrl: bk.labelUrl ?? null};
  }).catch((e) => { if (/courier_tracking|Unique|1062/i.test(String(e?.message))) throw new AppError('CONFLICT', 409, 'That tracking number is already used.'); throw e; });
}

/** Polling fallback for partners with a tracking API: finite batch, oldest-synced first. */
export async function syncShipments(now = new Date()) {
  const pollable = Object.values(SHIPPING_PROVIDERS).filter((p) => p.fetchTracking).map((p) => p.id);
  if (!pollable.length) return {polled: 0};
  const due = await prisma.shipment.findMany({where: {provider: {in: pollable}, status: {notIn: ['DELIVERED', 'RETURNED']}, OR: [{lastSyncedAt: null}, {lastSyncedAt: {lt: new Date(now.getTime() - 2 * 3600_000)}}]}, orderBy: {lastSyncedAt: 'asc'}, take: 20});
  let applied = 0;
  for (const s of due) {
    try {
      const events = await SHIPPING_PROVIDERS[s.provider]!.fetchTracking!(s.trackingNo);
      for (const e of events) {
        const r = await transaction((tx) => applyTrackingEvent(tx, s.id, {...e, provider: s.provider}, null, sha256(`${s.provider}:${e.eventId}`)));
        if (r.applied) applied++;
      }
      await prisma.shipment.update({where: {id: s.id}, data: {lastSyncedAt: now}});
    } catch (error) { logger.warn({err: error, shipmentId: s.id}, 'tracking sync failed'); }
  }
  return {polled: due.length, applied};
}

const STEP_OF: Record<string, string> = {AWAITING_PAYMENT: 'Order placed', PAID: 'Payment confirmed', PROCESSING: 'Being packed', SHIPPED: 'Shipped', DELIVERED: 'Delivered', CANCELLED: 'Cancelled', REFUNDED: 'Refunded', RETURN_REQUESTED: 'Return requested', RETURNED: 'Returned', PAID_REVIEW: 'Payment received — under review'};

/** Customer-facing tracking view: progress steps, shipments with courier scans, feedback status. No address or contact data. */
export async function trackingView(orderId: string) {
  const o = await prisma.order.findUniqueOrThrow({where: {id: orderId}, include: {lines: {select: {titleSnapshot: true, qty: true}}, events: {orderBy: {createdAt: 'asc'}}, shipments: {include: {events: {orderBy: {occurredAt: 'asc'}}}}}});
  const feedback = await prisma.deliveryFeedback.findUnique({where: {orderId}, select: {rating: true, createdAt: true}});
  const reached = (s: string) => o.events.find((e) => e.toStatus === s)?.createdAt ?? null;
  const ofd = o.shipments.flatMap((s) => s.events).find((e) => e.status === 'OUT_FOR_DELIVERY' && e.applied)?.occurredAt ?? null;
  const steps = [
    {key: 'placed', label: 'Order placed', at: o.createdAt},
    {key: 'paid', label: 'Payment confirmed', at: o.paidAt},
    {key: 'packed', label: 'Being packed', at: reached('PROCESSING')},
    {key: 'shipped', label: 'Shipped', at: reached('SHIPPED')},
    {key: 'out_for_delivery', label: 'Out for delivery', at: ofd},
    {key: 'delivered', label: 'Delivered', at: reached('DELIVERED')},
  ];
  return {
    orderCode: o.publicCode, status: o.status, statusLabel: STEP_OF[o.status] ?? o.status, placedAt: o.createdAt,
    items: o.lines.map((l) => ({title: l.titleSnapshot, qty: l.qty})),
    steps: steps.map((s) => ({...s, done: Boolean(s.at)})),
    shipments: await Promise.all(o.shipments.map(async (s) => ({
      courier: s.courier, trackingNo: s.trackingNo, status: s.status, expectedBy: s.expectedBy, deliveredAt: s.deliveredAt,
      trackingUrl: await (SHIPPING_PROVIDERS[s.provider] ?? SHIPPING_PROVIDERS['manual']!).trackingUrl(s.courier, s.trackingNo),
      scans: s.events.map((e) => ({status: e.status, at: e.occurredAt, location: e.location, description: e.description})),
    }))),
    feedback: {canGive: o.status === 'DELIVERED' && !feedback, given: feedback},
  };
}
