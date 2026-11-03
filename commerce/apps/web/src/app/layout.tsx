import type {Metadata} from 'next';
import './globals.css';

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {default: 'NumericcVaastu Crystal — Rudraksha, Gemstones, Crystals & Yantras', template: '%s · NumericcVaastu Crystal'},
  description: 'Rudraksha, gemstones, crystals and yantras chosen with numerology and Vastu guidance by Adarshh Panndey, plus made-to-order numerology wristwatches.',
  alternates: {canonical: '/'},
  openGraph: {siteName: 'NumericcVaastu Crystal', locale: 'en_IN', type: 'website'},
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en-IN">
      <body>
        <a className="skip" href="#content">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
