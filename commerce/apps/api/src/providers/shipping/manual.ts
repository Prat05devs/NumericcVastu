import {getSetting} from '../../lib/settings.js';
import type {ShippingProviderModule} from './types.js';

/** Staff book with any courier and enter the tracking number; the customer gets the courier's tracking link. */
export async function courierTrackingUrl(courier: string, trackingNo: string) {
  const couriers = (await getSetting('shipping'))?.couriers ?? [];
  const c = couriers.find((x) => x.id === courier || x.name.toLowerCase() === courier.toLowerCase());
  return c?.trackingUrlTemplate ? c.trackingUrlTemplate.replace('{tracking}', encodeURIComponent(trackingNo)) : null;
}

export const manual: ShippingProviderModule = {
  id: 'manual',
  label: 'Manual (staff enter courier and tracking number)',
  trackingUrl: courierTrackingUrl,
  async verifyWebhook() { return false; }, // manual shipments are updated from the back office
  parseWebhook() { return []; },
};
