import {Lora, Noto_Serif_Display} from 'next/font/google';
import {apiGet} from '@/lib/server-api';
import {Header} from '@/components/store/Header';
import {Footer} from '@/components/store/Footer';
import {CouponCapture} from '@/components/store/CouponCapture';
import {CartDrawer} from '@/components/store/CartDrawer';
import {Ticker, type Offer} from '@/components/store/Ticker';
import './store.css';

const display = Noto_Serif_Display({subsets: ['latin'], weight: ['400', '500', '600', '700'], style: ['normal', 'italic'], variable: '--font-display', display: 'swap'});
const body = Lora({subsets: ['latin'], weight: ['400', '500', '600', '700'], style: ['normal', 'italic'], variable: '--font-body', display: 'swap'});

/** Standing lines in the offers bar, between the advertised codes. */
const MESSAGES = ['Delivery included across India · prepaid orders', 'Every piece listed with its origin, size and treatment', 'Guided by Adarshh Panndey · numerology and Vaastu'];

export default async function StoreLayout({children}: {children: React.ReactNode}) {
  const offers = (await apiGet<Offer[]>('/offers', {revalidate: 60, tags: ['catalogue', 'campaign']}))?.data ?? [];
  return (
    <div className={`cs ${display.variable} ${body.variable}`}>
      <CouponCapture />
      <Ticker offers={offers} messages={MESSAGES} />
      <Header />
      <main id="content">{children}</main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
