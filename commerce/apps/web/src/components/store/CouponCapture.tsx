'use client';
import {useEffect} from 'react';
/** A partner link can carry a coupon (?code=…): remember it for checkout in this browser session. */
export function CouponCapture() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (code && /^[A-Z0-9_-]{3,32}$/i.test(code)) sessionStorage.setItem('sc_coupon', code.toUpperCase());
  }, []);
  return null;
}
