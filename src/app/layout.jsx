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
import '../motion.css';
import '../guide.css';
import { ViewTransition } from 'react';
import { SiteHeader } from '../components/SiteChrome';
import Ambient from '../components/Ambient';
import SiteGuide from '../components/SiteGuide';
import CurrencyPreview from '../components/CurrencyPreview';
import {guideEntries, guidePrices} from '../data/guide';
import {currencyScript} from '../lib/currency';
import { contact } from '../data/contact';
export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://numericcvaastu.com'),
  alternates: { canonical: '/' },
  title: 'NumericcVaastu — Learn Numerology with Adarshh Panndey',
  description: 'Explore practical numerology courses with guided learning and personal consultations with Adarshh Panndey. Compare learning paths, course details and fees.',
  icons: { icon: '/images/logo-nv.png' },
  openGraph: { title: 'NumericcVaastu — Learn Numerology with Adarshh Panndey', description: 'Practical numerology learning and personal consultations with Adarshh Panndey.', url: '/', type: 'website', images: ['/images/adarshh/adarshh-pandey-portrait.webp'] },
};
export const viewport = { themeColor: '#4A1F7A' };
export default function RootLayout({ children }) {
  return <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:currencyScript}}/><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Manrope:wght@400;500;600;700;800&family=Noto+Serif+Devanagari:wght@400;500&display=swap" rel="stylesheet"/></head><body><SiteHeader/><ViewTransition default="nv-page">{children}</ViewTransition><Ambient/><SiteGuide entries={guideEntries()} prices={guidePrices()}/><CurrencyPreview/><script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({'@context':'https://schema.org','@graph':[{'@type':'Organization',name:'NumericcVaastu',url:process.env.NEXT_PUBLIC_SITE_URL||'https://numericcvaastu.com',logo:(process.env.NEXT_PUBLIC_SITE_URL||'https://numericcvaastu.com')+'/images/logo-nv.png',founder:{'@type':'Person',name:'Adarshh Panndey'},email:contact.email,telephone:contact.phoneHref.replace('tel:',''),address:{'@type':'PostalAddress',streetAddress:`${contact.address.street}, ${contact.address.locality}`,addressLocality:contact.address.city,addressRegion:contact.address.region,postalCode:contact.address.postalCode,addressCountry:contact.address.country}},{'@type':'WebSite',name:'NumericcVaastu',url:process.env.NEXT_PUBLIC_SITE_URL||'https://numericcvaastu.com'}]}).replace(/</g,'\\u003c')}}/></body></html>;
}
