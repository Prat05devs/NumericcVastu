import {Cormorant_Garamond, Manrope, Noto_Serif_Devanagari} from 'next/font/google';
import '../tailwind.css';
import '../styles.css';
import '../multipage.css';
import '../heritage-bands.css';
import '../sales-conversion.css';
import '../course-detail.css';
import '../gallery.css';
import '../catalogue.css';
import '../glass-cards.css';
import '../home.css';
import '../video-sections.css';
import '../motion.css';
import '../guide.css';
import '../navigation.css';
import '../seo-pages.css';
import {LocaleProvider} from '../i18n/LocaleProvider';
import '../i18n/locale.css';
import { ViewTransition } from 'react';
import { SiteHeader } from '../components/SiteChrome';
import Ambient from '../components/Ambient';
import SiteGuide from '../components/SiteGuide';
import CurrencyPreview from '../components/CurrencyPreview';
import {guideEntries, guidePrices} from '../data/guide';
import {currencyScript} from '../lib/currency';
import {pageMetadata} from '../data/seo';
import {siteUrl, jsonLdHtml} from '../lib/site';
import {siteGraph} from '../lib/schema';
import {getWebsiteSales} from '../lib/sale';
import {SaleProvider} from '../components/SaleProvider';

/**
 * Fonts are downloaded at build time and served from this site (no request to Google while a page loads), with fallback
 * fonts sized to match so text does not jump when the real font arrives. CSS uses the variables below.
 */
const manrope = Manrope({subsets: ['latin'], variable: '--font-manrope', display: 'swap'});
const cormorant = Cormorant_Garamond({subsets: ['latin'], weight: ['400', '500', '600', '700'], style: ['normal', 'italic'], variable: '--font-cormorant', display: 'swap'});
const devanagari = Noto_Serif_Devanagari({subsets: ['devanagari'], weight: ['400', '500'], variable: '--font-devanagari', display: 'swap', preload: false});
const fontVariables = `${manrope.variable} ${cormorant.variable} ${devanagari.variable}`;
// Defaults for every page. No site-wide canonical or og:url: each page sets its own, so a page without one never
// points search engines at the homepage.
const {alternates, openGraph: {url, ...openGraph}, ...defaults} = pageMetadata('/');
export const metadata = {
  metadataBase: new URL(siteUrl),
  ...defaults,
  openGraph,
  applicationName: 'NumericcVaastu',
  authors: [{name: 'Adarshh Panndey', url: `${siteUrl}/about`}],
  creator: 'Adarshh Panndey',
  publisher: 'NumericcVaastu Training and Consultancy LLP',
  category: 'Numerology and Vastu',
  icons: { icon: '/images/logo-nv.png' },
  // Search Console and Bing Webmaster Tools ownership, set in the hosting environment (see .env.example).
  verification: {
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && {google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION}),
    ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION && {other: {'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION}}),
  },
};
export const viewport = { themeColor: '#4A1F7A' };
export default async function RootLayout({ children }) {
  // Running sales (back office → Sales & festive themes) reach every price and the top strip; refreshed each minute.
  const sales = await getWebsiteSales();
  return <html lang="en" className={fontVariables} data-scroll-behavior="smooth" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:currencyScript}}/><link rel="preload" href="/fonts/manrope-latin-variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/></head><body><LocaleProvider><SaleProvider sales={sales}><SiteHeader/><ViewTransition default="nv-page">{children}</ViewTransition><Ambient/><SiteGuide entries={guideEntries()} prices={guidePrices()}/><CurrencyPreview/><script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(siteGraph())}/></SaleProvider></LocaleProvider></body></html>;
}
