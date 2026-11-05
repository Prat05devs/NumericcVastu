import {Cormorant_Garamond, Manrope} from 'next/font/google';
import {Shell} from '@/components/admin/Shell';
import './shadcn.css';

const manrope = Manrope({subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-manrope', display: 'swap'});
const cormorant = Cormorant_Garamond({subsets: ['latin'], weight: ['600', '700'], variable: '--font-cormorant', display: 'swap'});
export const metadata = {title: 'NumericcVaastu Back office', robots: {index: false, follow: false}};
export const viewport = {themeColor: '#2a1046'};
export default function AdminLayout({children}: {children: React.ReactNode}) {
  return <div className={`${manrope.variable} ${cormorant.variable}`}><Shell>{children}</Shell></div>;
}
