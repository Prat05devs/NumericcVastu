import {NextResponse} from 'next/server';
import {CURRENCY_COOKIE, PREVIEW_COOKIE, countryFromHeaders, currencyForCountry} from './lib/currency';

/** Records the visitor's currency (rupees in India, dollars elsewhere) from their country. See lib/currency.js. */
export function proxy(request) {
  // ?currency=USD|INR previews the site in that currency for this browser; ?currency=auto ends the preview.
  const preview = request.nextUrl.searchParams.get('currency')?.toUpperCase();
  if (preview) {
    const url = request.nextUrl.clone();
    url.searchParams.delete('currency');
    const redirect = NextResponse.redirect(url);
    if (preview === 'USD' || preview === 'INR') redirect.cookies.set(PREVIEW_COOKIE, preview, {path: '/', maxAge: 60 * 60 * 24 * 7, sameSite: 'lax'});
    else redirect.cookies.delete(PREVIEW_COOKIE);
    return redirect;
  }
  const response = NextResponse.next();
  const country = countryFromHeaders(request.headers);
  if (!country) return response;
  const currency = currencyForCountry(country);
  if (request.cookies.get(CURRENCY_COOKIE)?.value !== currency) response.cookies.set(CURRENCY_COOKIE, currency, {path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax'});
  return response;
}

export const config = {matcher: ['/((?!api|_next/static|_next/image|images|videos|.*\\.\\w+$).*)']};
