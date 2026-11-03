/**
 * Commerce state machines (Section 07). Order, payment, reservation, shipment, return, custom request and quotation
 * are separate dimensions. Only the transitions listed here are legal; the API checks them inside the same database
 * transaction that writes the new state (guarded UPDATE ... WHERE status = :from).
 */
export const ORDER_STATUSES = [
  'AWAITING_PAYMENT', 'PAYMENT_FAILED', 'PAID', 'PAID_REVIEW', 'PROCESSING', 'SHIPPED', 'DELIVERED',
  'CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'PARTIALLY_REFUNDED', 'REFUNDED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ['CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const RESERVATION_STATUSES = ['HELD', 'CONSUMED', 'RELEASED'] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const SHIPMENT_STATUSES = ['CREATED', 'PACKED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED'] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const RETURN_STATUSES = ['REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED', 'CLOSED'] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const CUSTOM_REQUEST_STATUSES = [
  'REQUESTED', 'REVIEWING', 'QUOTED', 'ACCEPTED', 'PAYMENT_PENDING', 'IN_PROGRESS', 'COMPLETED',
  'DECLINED', 'EXPIRED', 'CANCELLED', 'REFUND_REVIEW',
] as const;
export type CustomRequestStatus = (typeof CUSTOM_REQUEST_STATUSES)[number];

export const QUOTATION_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'SUPERSEDED', 'EXPIRED', 'WITHDRAWN'] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const REFUND_STATUSES = ['REQUESTED', 'PROCESSING', 'PROCESSED', 'FAILED'] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

type Machine<S extends string> = Readonly<Record<S, readonly S[]>>;

export const ORDER_TRANSITIONS: Machine<OrderStatus> = {
  AWAITING_PAYMENT: ['PAID', 'PAID_REVIEW', 'PAYMENT_FAILED', 'CANCELLED'],
  PAYMENT_FAILED: ['AWAITING_PAYMENT', 'PAID', 'PAID_REVIEW', 'CANCELLED'],
  // Paid after the stock hold lapsed and could not be re-reserved: a person must refund or reallocate.
  PAID_REVIEW: ['PAID', 'REFUNDED', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED'],
  SHIPPED: ['DELIVERED', 'RETURN_REQUESTED', 'PARTIALLY_REFUNDED', 'REFUNDED'],
  DELIVERED: ['RETURN_REQUESTED', 'PARTIALLY_REFUNDED', 'REFUNDED'],
  RETURN_REQUESTED: ['RETURNED', 'DELIVERED', 'PARTIALLY_REFUNDED', 'REFUNDED'],
  RETURNED: ['PARTIALLY_REFUNDED', 'REFUNDED'],
  PARTIALLY_REFUNDED: ['PARTIALLY_REFUNDED', 'REFUNDED', 'PROCESSING', 'SHIPPED', 'DELIVERED'],
  // A capture can still arrive after an unpaid order was cancelled; it needs a person to refund or reallocate.
  CANCELLED: ['PAID_REVIEW', 'REFUNDED'],
  REFUNDED: [],
};

export const PAYMENT_TRANSITIONS: Machine<PaymentStatus> = {
  CREATED: ['AUTHORIZED', 'CAPTURED', 'FAILED'],
  AUTHORIZED: ['CAPTURED', 'FAILED'],
  CAPTURED: ['PARTIALLY_REFUNDED', 'REFUNDED'],
  FAILED: ['CAPTURED'], // a late capture after a reported failure is still money received
  PARTIALLY_REFUNDED: ['PARTIALLY_REFUNDED', 'REFUNDED'],
  REFUNDED: [],
};

export const RESERVATION_TRANSITIONS: Machine<ReservationStatus> = {HELD: ['CONSUMED', 'RELEASED'], CONSUMED: [], RELEASED: []};

/** Shipments move forward only; a late "in transit" event never undoes "delivered". */
export const SHIPMENT_TRANSITIONS: Machine<ShipmentStatus> = {
  CREATED: ['PACKED', 'SHIPPED', 'FAILED'],
  PACKED: ['SHIPPED', 'FAILED'],
  SHIPPED: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  FAILED: ['SHIPPED', 'RETURNED'],
  RETURNED: [],
};

export const RETURN_TRANSITIONS: Machine<ReturnStatus> = {
  REQUESTED: ['APPROVED', 'REJECTED'], APPROVED: ['RECEIVED', 'CLOSED'], RECEIVED: ['REFUNDED', 'CLOSED'], REJECTED: ['CLOSED'], REFUNDED: ['CLOSED'], CLOSED: [],
};

export const CUSTOM_REQUEST_TRANSITIONS: Machine<CustomRequestStatus> = {
  REQUESTED: ['REVIEWING', 'DECLINED', 'CANCELLED'],
  REVIEWING: ['QUOTED', 'DECLINED', 'CANCELLED'],
  QUOTED: ['ACCEPTED', 'QUOTED', 'EXPIRED', 'DECLINED', 'CANCELLED'],
  ACCEPTED: ['PAYMENT_PENDING', 'CANCELLED'],
  PAYMENT_PENDING: ['IN_PROGRESS', 'CANCELLED', 'EXPIRED'],
  IN_PROGRESS: ['COMPLETED', 'REFUND_REVIEW'],
  COMPLETED: [],
  DECLINED: [], EXPIRED: ['REVIEWING'], CANCELLED: [], REFUND_REVIEW: ['CANCELLED', 'IN_PROGRESS'],
};

export const QUOTATION_TRANSITIONS: Machine<QuotationStatus> = {
  DRAFT: ['SENT', 'WITHDRAWN'], SENT: ['ACCEPTED', 'SUPERSEDED', 'EXPIRED', 'WITHDRAWN'], ACCEPTED: [], SUPERSEDED: [], EXPIRED: [], WITHDRAWN: [],
};

export function canTransition<S extends string>(machine: Machine<S>, from: S, to: S): boolean {
  return machine[from]?.includes(to) ?? false;
}

export class TransitionError extends Error {
  constructor(public readonly machine: string, public readonly from: string, public readonly to: string) {
    super(`Illegal ${machine} transition ${from} → ${to}`);
  }
}

export function assertTransition<S extends string>(name: string, machine: Machine<S>, from: S, to: S): void {
  if (!canTransition(machine, from, to)) throw new TransitionError(name, from, to);
}

/** Shipment events can arrive out of order; apply only forward moves and ignore the rest. */
export function nextShipmentStatus(current: ShipmentStatus, incoming: ShipmentStatus): ShipmentStatus {
  return canTransition(SHIPMENT_TRANSITIONS, current, incoming) ? incoming : current;
}
