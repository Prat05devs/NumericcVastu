'use client';
import {post} from './client';

/** Server pricing for the cart: discounts, coupon verdict, delivery options and the total. */
export type Preview = {breakdown: {subtotalPaise: string; discountPaise: string; shippingPaise: string; taxPaise: string; totalPaise: string; taxMode: string; notices: string[]; warnings: string[]; campaign: {label: string} | null; coupon: {label: string} | null}; coupon: {valid: boolean; message?: string} | null; shippingOptions: {id: string; label: string; feePaise: string; freeAbovePaise: string | null; etaText: string | null}[]; shippingConfigured: boolean; holdMinutes: number; partnerAttributed: boolean};
export const COUPON_KEY = 'sc_coupon';
export const savedCoupon = () => sessionStorage.getItem(COUPON_KEY) ?? '';
export const saveCoupon = (c: string) => (c ? sessionStorage.setItem(COUPON_KEY, c) : sessionStorage.removeItem(COUPON_KEY));
export const preview = (cartId: string, opts: {couponCode?: string; shippingMethodId?: string; postalCode?: string}) =>
  post<Preview>('/checkout/preview', {cartId, ...(opts.couponCode && {couponCode: opts.couponCode}), ...(opts.shippingMethodId && {shippingMethodId: opts.shippingMethodId}), ...(opts.postalCode && /^[1-9]\d{5}$/.test(opts.postalCode) && {postalCode: opts.postalCode})});
