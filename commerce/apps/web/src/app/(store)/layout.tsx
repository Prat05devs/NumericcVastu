import {Header} from '@/components/store/Header';
import {Footer} from '@/components/store/Footer';
import {CouponCapture} from '@/components/store/CouponCapture';

export default function StoreLayout({children}: {children: React.ReactNode}) {
  return (
    <>
      <CouponCapture />
      <Header />
      <main id="content">{children}</main>
      <Footer />
    </>
  );
}
