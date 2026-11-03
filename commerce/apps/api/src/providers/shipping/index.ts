import {AppError} from '../../lib/errors.js';
import {generic} from './generic.js';
import {manual} from './manual.js';
import type {ShippingProviderModule} from './types.js';

export * from './types.js';

/** The registry: add a delivery partner by implementing ShippingProviderModule (see _template.ts) and listing it here. */
export const SHIPPING_PROVIDERS: Record<string, ShippingProviderModule> = {manual, generic};

export function shippingProvider(id: string): ShippingProviderModule {
  const p = SHIPPING_PROVIDERS[id];
  if (!p) throw new AppError('VALIDATION_FAILED', 422, `Unknown shipping provider "${id}".`);
  return p;
}
