/**
 * The canonical address of the website.
 *
 * The same site is served on www.numericcvaastu.com, www.numericcvaastu.in and www.numericcvaastu.org, and each
 * domain works on its own: a visitor who types .in stays on .in. Every page's canonical link, the XML sitemap,
 * structured data and llms.txt point at this .com origin, so search engines list one address and gather every link,
 * review and mention there instead of treating the three domains as copies competing with each other.
 */
const CANONICAL = 'https://www.numericcvaastu.com';
const configured = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');

// The bare domain only redirects to www, so an older NEXT_PUBLIC_SITE_URL without www would make every
// canonical link point at a redirect. Treat it as the www address.
export const siteUrl = !configured || configured === 'https://numericcvaastu.com' ? CANONICAL : configured;

/** Every domain that serves the site. All three work on their own; only the canonical one is listed in search. */
export const siteDomains = ['www.numericcvaastu.com', 'www.numericcvaastu.in', 'www.numericcvaastu.org'];

export const absoluteUrl = (path = '/') => (path === '/' ? siteUrl : `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`);

/** A JSON-LD script body that is safe to inline. */
export const jsonLdHtml = (object) => ({__html: JSON.stringify(object).replace(/</g, '\\u003c')});
