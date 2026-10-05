import '../tailwind.css';
import '../styles.css';
import '../multipage.css';
import '../heritage-bands.css';
import '../sales-conversion.css';
import '../course-detail.css';
import '../gallery.css';
import '../catalogue.css';
import '../glass-cards.css';
export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://numericcvaastu.com'),
  alternates: { canonical: '/' },
  title: 'NumericcVaastu — Learn Numerology with Adarshh Pandey',
  description: 'Explore practical numerology courses with guided learning and personal consultations with Adarshh Pandey. Compare learning paths, course details and fees.',
  icons: { icon: '/images/logo.png' },
  openGraph: { title: 'NumericcVaastu — Learn Numerology with Adarshh Pandey', description: 'Practical numerology learning and personal consultations with Adarshh Pandey.', url: '/', type: 'website', images: ['/images/adarshh/adarshh-pandey-portrait.webp'] },
};
export const viewport = { themeColor: '#641E1A' };
export default function RootLayout({ children }) {
  return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Manrope:wght@400;500;600;700;800&family=Noto+Serif+Devanagari:wght@400;500&display=swap" rel="stylesheet"/></head><body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({'@context':'https://schema.org','@graph':[{'@type':'Organization',name:'NumericcVaastu',url:process.env.NEXT_PUBLIC_SITE_URL||'https://numericcvaastu.com',logo:(process.env.NEXT_PUBLIC_SITE_URL||'https://numericcvaastu.com')+'/images/logo.png',founder:{'@type':'Person',name:'Adarshh Pandey'}},{'@type':'WebSite',name:'NumericcVaastu',url:process.env.NEXT_PUBLIC_SITE_URL||'https://numericcvaastu.com'}]}).replace(/</g,'\\u003c')}}/></body></html>;
}
