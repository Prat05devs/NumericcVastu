import type {ShipmentStatus} from '@sc/contracts';

/**
 * Shipping provider contract. Today the store ships "manual" (staff book with any courier and type the tracking
 * number) and can receive status updates through the signed "generic" webhook. When the business signs up with a
 * delivery partner or aggregator, add one module implementing ShippingProviderModule and list it in index.ts:
 * booking, label, webhooks and tracking sync then flow through the same order/shipment state machine, customer
 * tracking page, notifications and delivery feedback — nothing else changes. See _template.ts.
 */
export type TrackingEvent = {
  eventId: string; // provider's unique id for this scan/event (dedupe key)
  trackingNo: string;
  courier?: string | undefined;
  status: ShipmentStatus; // mapped to our forward-only shipment states
  occurredAt: Date;
  location?: string | undefined;
  description?: string | undefined;
  expectedBy?: Date | undefined;
};

export type BookingInput = {
  orderId: string; publicCode: string; service?: string | undefined;
  address: Record<string, unknown>; // shipping address snapshot
  lines: {sku: string; title: string; qty: number; unitPricePaise: bigint; weightG: number}[];
  totalPaise: bigint; paid: boolean;
};
export type Booking = {trackingNo: string; courier: string; service?: string | undefined; labelUrl?: string | undefined; expectedBy?: Date | undefined; costPaise?: bigint | undefined};

export type Headers = Record<string, string | undefined>;
export interface ShippingProviderModule {
  readonly id: string;
  readonly label: string;
  /** Book pickup / create the consignment with the partner. Omit for providers where staff book outside the system. */
  book?(input: BookingInput): Promise<Booking>;
  /** Public tracking page for the customer, if the courier has one. */
  trackingUrl(courier: string, trackingNo: string): Promise<string | null>;
  /** Verify a status webhook from raw bytes. Return false for anything not provably from the partner. */
  verifyWebhook(raw: Buffer, headers: Headers): Promise<boolean>;
  parseWebhook(raw: Buffer, headers: Headers): TrackingEvent[];
  /** Optional polling fallback used by the finite cron job when a partner offers a tracking API. */
  fetchTracking?(trackingNo: string): Promise<TrackingEvent[]>;
}
