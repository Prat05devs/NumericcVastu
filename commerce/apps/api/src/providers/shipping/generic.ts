import {z} from 'zod';
import {SHIPMENT_STATUSES} from '@sc/contracts';
import {env} from '../../config/env.js';
import {hmacHex, safeEqual} from '../../lib/crypto.js';
import {courierTrackingUrl} from './manual.js';
import type {ShippingProviderModule} from './types.js';

/**
 * Generic signed webhook: any courier, aggregator or integration tool (e.g. an automation service) can POST status
 * updates in this documented format, signed with SHIPPING_WEBHOOK_SECRET:
 *   POST /api/v1/webhooks/shipping/generic   X-Signature: hex HMAC-SHA256 of the raw body
 *   {"eventId":"…","trackingNo":"…","courier":"delhivery","status":"IN_TRANSIT","occurredAt":"2026-11-03T10:00:00Z",
 *    "location":"Delhi hub","description":"Arrived at hub","expectedBy":"2026-11-05T18:00:00Z"}
 * A JSON array of such events is accepted too.
 */
const Event = z.object({eventId: z.string().min(1).max(120), trackingNo: z.string().min(1).max(80), courier: z.string().max(80).optional(), status: z.enum(SHIPMENT_STATUSES), occurredAt: z.string().datetime(), location: z.string().max(160).optional(), description: z.string().max(300).optional(), expectedBy: z.string().datetime().optional()});

export const generic: ShippingProviderModule = {
  id: 'generic',
  label: 'Signed status webhook (any courier or integration)',
  trackingUrl: courierTrackingUrl,
  async verifyWebhook(raw, headers) {
    const secret = env().SHIPPING_WEBHOOK_SECRET;
    return Boolean(secret && headers['x-signature'] && safeEqual(hmacHex(secret, raw), headers['x-signature']));
  },
  parseWebhook(raw) {
    const json = JSON.parse(raw.toString('utf8')) as unknown;
    return z.array(Event).max(100).parse(Array.isArray(json) ? json : [json]).map((e) => ({
      ...e, occurredAt: new Date(e.occurredAt), expectedBy: e.expectedBy ? new Date(e.expectedBy) : undefined,
    }));
  },
};
