'use client';
import {useSyncExternalStore} from 'react';

/** A small badge while ?currency=USD|INR preview is on (lib/currency.js), with a way back to automatic. */
const subscribe = () => () => {};
export default function CurrencyPreview() {
  const preview = useSyncExternalStore(subscribe, () => document.documentElement.dataset.currencyPreview || '', () => '');
  if (!preview) return null;
  // Keep the rest of the address (e.g. checkout's ?offer=) when ending the preview.
  const url = new URL(window.location.href);
  url.searchParams.set('currency', 'auto');
  return <p className="currency-preview" role="status">Previewing prices in {preview === 'USD' ? 'US dollars' : 'rupees'} · <a href={url.pathname + url.search}>Back to automatic</a></p>;
}
