import Link from 'next/link';
import {apiGet} from '@/lib/server-api';
import {CartLink} from './CartLink';

type Nav = {categories: {slug: string; title: string; kind: string}[]; highlights: {label: string; href: string}[]; campaign: {name: string; theme: {bannerText?: string; bannerLink?: string}} | null};

const HREF: Record<string, string> = {'custom-wristwatch': '/custom-wristwatch'};

export async function Header() {
  const nav = (await apiGet<Nav>('/navigation', {revalidate: 60, tags: ['catalogue', 'campaign']}))?.data;
  const categories = nav?.categories ?? [
    {slug: 'rudraksha', title: 'Rudraksha', kind: 'RUDRAKSHA'}, {slug: 'gemstones', title: 'Gemstones', kind: 'GEMSTONE'},
    {slug: 'crystals', title: 'Crystals', kind: 'CRYSTAL'}, {slug: 'yantras', title: 'Yantras', kind: 'YANTRA'},
    {slug: 'custom-wristwatch', title: 'Numerology wristwatch (made to order)', kind: 'WATCH'},
  ];
  const banner = nav?.campaign?.theme.bannerText;
  return (
    <>
      {banner && <div className="banner" role="note">{nav?.campaign?.theme.bannerLink ? <Link href={nav.campaign.theme.bannerLink}>{banner}</Link> : banner}</div>}
      <header className="site">
        <div className="wrap">
          <Link href="/" className="brand">NumericcVaastu <span>Crystal</span></Link>
          <nav className="main" aria-label="Shop by category">
            {categories.map((c) => <Link key={c.slug} href={HREF[c.slug] ?? `/${c.slug}`}>{c.kind === 'WATCH' ? 'Custom wristwatch' : c.title}</Link>)}
            <Link href="/guides">Guides</Link>
          </nav>
          <div className="tools">
            <Link href="/search" aria-label="Search">Search</Link>
            <Link href="/track">Track order</Link>
            <Link href="/account">Account</Link>
            <CartLink />
          </div>
        </div>
      </header>
    </>
  );
}
