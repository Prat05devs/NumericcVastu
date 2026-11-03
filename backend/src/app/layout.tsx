import type {Metadata} from 'next';
import './admin.css';

export const metadata: Metadata = {
  title: {default: 'NumericcVaastu Back Office', template: '%s · NumericcVaastu Back Office'},
  robots: {index: false, follow: false},
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return <html lang="en-IN"><body>{children}</body></html>;
}
