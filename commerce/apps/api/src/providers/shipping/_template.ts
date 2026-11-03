/**
 * TEMPLATE — copy to <partner>.ts when the business signs up with a delivery partner, then register it in index.ts.
 * Not registered, never executed. Fill it from the partner's own API documentation and sandbox credentials.
 *
 *   1. Credentials: read them from the encrypted vault (getSecret(`shipping.<partner>.api_key`)), add a back-office
 *      field for them, never hardcode.
 *   2. book(): create the consignment / assign AWB / request pickup; return trackingNo, label URL, expected date.
 *   3. verifyWebhook(): the partner's documented signature or token check over the raw body.
 *   4. parseWebhook()/fetchTracking(): map the partner's status codes onto our states:
 *        picked/manifested → PACKED or SHIPPED · in transit → IN_TRANSIT · out for delivery → OUT_FOR_DELIVERY
 *        delivered → DELIVERED · undelivered/exception → FAILED · RTO delivered → RETURNED
 *      Unknown codes: skip them (log) rather than guess.
 *   5. Tests: a fixture webhook body from the partner's docs → expected TrackingEvent[]; booking against a fake server.
 */
import type {ShippingProviderModule} from './types.js';

export const templatePartner: ShippingProviderModule = {
  id: 'template-partner',
  label: 'Template partner (not active)',
  async trackingUrl() { return null; },
  async verifyWebhook() { return false; },
  parseWebhook() { return []; },
};
