/**
 * Which currency a visitor sees and pays: rupees in India, US dollars everywhere else.
 *
 * - src/proxy.js reads the visitor's country from the host's IP lookup (Vercel or Cloudflare header) and
 *   stores the currency in the nv-currency cookie.
 * - `currencyScript` runs in <head> before the page paints and sets <html data-currency>. Without the cookie
 *   (local development, or a host without a country header) it falls back to the device time zone.
 * - Every page renders both prices (components/Price.jsx) and CSS shows one, so cached pages suit everyone.
 * - Checkout decides on the server with `requestCurrency`. When the host supplies the country, that wins over
 *   the cookie, so a visitor abroad cannot switch to the lower rupee price by editing a cookie.
 * - Preview: open any page with ?currency=USD (or INR) to see the site in that currency, and ?currency=auto to
 *   go back. Forcing USD also works at checkout, so PayPal can be tested from India; forcing INR never beats a
 *   country outside India at checkout.
 */
export const CURRENCY_COOKIE = 'nv-currency';
export const PREVIEW_COOKIE = 'nv-currency-preview';
export const currencyForCountry = (country) => (country.toUpperCase() === 'IN' ? 'INR' : 'USD');
export const countryFromHeaders = (headers) => headers.get('x-vercel-ip-country') || headers.get('cf-ipcountry') || '';

export function requestCurrency(headers) {
  const cookies = headers.get('cookie') || '';
  if (/(?:^|;\s*)nv-currency-preview=USD/.test(cookies)) return 'USD';
  const country = countryFromHeaders(headers);
  if (country) return currencyForCountry(country);
  return cookies.match(/(?:^|;\s*)nv-currency-preview=(INR|USD)/)?.[1] || cookies.match(/(?:^|;\s*)nv-currency=(INR|USD)/)?.[1] || 'INR';
}

export const currencyScript = `(function(){try{var p=document.cookie.match(/(?:^|; )${PREVIEW_COOKIE}=(INR|USD)/),m=document.cookie.match(/(?:^|; )${CURRENCY_COOKIE}=(INR|USD)/),c=p?p[1]:m&&m[1];if(p)document.documentElement.dataset.currencyPreview=p[1];if(!c){c=/^Asia\\/(Kolkata|Calcutta)$/.test(Intl.DateTimeFormat().resolvedOptions().timeZone)?'INR':'USD';document.cookie='${CURRENCY_COOKIE}='+c+';path=/;max-age=2592000;samesite=lax'}document.documentElement.dataset.currency=c}catch(e){}})()`;
