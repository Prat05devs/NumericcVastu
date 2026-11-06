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
  const [offerRes, campaignRes] = await Promise.all([
    apiGet<Offer[]>('/offers', {revalidate: 60, tags: ['catalogue', 'campaign']}),
    apiGet<{name: string; endsAt: string; theme: {bannerText?: string; showCountdown?: boolean}}[]>('/campaigns/active', {revalidate: 60, tags: ['campaign']}),
  ]);
  const offers = offerRes?.data ?? [];
  // A running sale (back office → Sales & festive themes) leads the bar with its banner text and end date.
  const sales = (campaignRes?.data ?? []).filter((c) => c.theme?.bannerText).map((c) => `${c.theme.bannerText}${c.theme.showCountdown ? ` · ends ${new Date(c.endsAt).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata'})}` : ''}`);
  return (
    <div className={`cs ${display.variable} ${body.variable}`}>
      <CouponCapture />
      <Ticker offers={offers} messages={MESSAGES} lead={sales} />
      <Header />
      <main id="content">{children}</main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
