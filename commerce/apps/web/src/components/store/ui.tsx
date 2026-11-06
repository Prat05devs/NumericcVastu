import Link from 'next/link';
import {ART} from './art';
import {inr} from '@/lib/format';
import {WishButton} from './Wishlist';

/** Shop contact details (same as numericcvaastu.com). */
export const SHOP = {
  whatsapp: '919870197315',
  phone: '+91 98701 97315',
  email: 'numericcvaastu@gmail.com',
  main: 'https://www.numericcvaastu.com',
};
export const waLink = (text: string) => `https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(text)}`;

const PATHS: Record<string, string> = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  bag: '<path d="M6 7h12l1 14H5z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  truck: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  tag: '<path d="M20 12 12 20 3 11V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
};
export function Icon({name, size}: {name: keyof typeof PATHS | string; size?: number}) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{__html: PATHS[name] ?? ''}} />;
}
export function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 13.9c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3z" /></svg>;
}

/** Which drawing stands in for a product until its photo is uploaded. */
export function artFor(category: string | undefined, title = ''): string {
  const t = title.toLowerCase();
  if (/bracelet|mala/.test(t)) return /onyx|black/.test(t) ? 'bracelet-onyx' : /tiger|citrine|sun/.test(t) ? 'bracelet-tiger' : 'bracelet-rose';
  if (/pendant/.test(t)) return 'pendant';
  if (/tower|point/.test(t)) return 'tower';
  if (/watch/.test(t)) return 'watch';
  if (/blue|neelam|emerald|panna/.test(t)) return 'gem-blue';
  switch (category) {
    case 'rudraksha': return 'rudraksha';
    case 'gemstones': return 'gem-yellow';
    case 'crystals': return 'cluster';
    case 'yantras': return 'yantra';
    case 'custom-wristwatch': return 'watch';
    default: return 'cluster';
  }
}
export function Art({name, className = 'art'}: {name: string; className?: string}) {
  return <span className={className} aria-hidden="true" dangerouslySetInnerHTML={{__html: ART[name] ?? ART['cluster']!}} />;
}

type Img = {url: string; alt: string; width: number | null; height: number | null} | null | undefined;
/** A photo when there is one, otherwise the matching drawing on a warm ground (never an empty box). */
export function Pic({img, art, className = '', eager = false, sizes}: {img?: Img; art: string; className?: string; eager?: boolean; sizes?: string}) {
  return <div className={`pic ${className}`}>
    {img ? <img src={img.url} alt={img.alt} width={img.width ?? 800} height={img.height ?? 800} loading={eager ? 'eager' : 'lazy'} sizes={sizes} /> : <Art name={art} />}
  </div>;
}

export type Card = {id: string; slug: string; title: string; category?: string; categoryTitle: string; productType: string; shortDescription?: string; fromPricePaise: string | null; compareAtPaise: string | null; image: {url: string; alt: string; width: number | null; height: number | null} | null; available: boolean; isDemo: boolean; badges: string[]};

export const cleanTitle = (t: string) => t.replace(/^DEMO\s*[—-]\s*/, '');

export function ProductCard({p, tall = false, eager = false}: {p: Card; tall?: boolean; eager?: boolean}) {
  const badge = !p.available ? 'Sold out' : p.badges.includes('DEMO') ? 'Demo' : p.badges.find((b) => b !== 'DEMO');
  const price = p.productType === 'CUSTOM_REQUEST' ? 'Made to order' : p.fromPricePaise ? inr(p.fromPricePaise) : '';
  return (
    <article className={`pc${tall ? ' tall' : ''}${p.available ? '' : ' out'}`}>
      <Link href={`/products/${p.slug}`} className="pic-link" aria-label={`${cleanTitle(p.title)}${price ? `, ${price}` : ''}`}>
        <Pic img={p.image} art={artFor(p.category, p.title)} eager={eager} />
      </Link>
      {badge && <span className={`pill tag ${badge === 'Sold out' ? '' : badge === 'Demo' ? 'warn' : 'dark'}`}>{badge}</span>}
      <WishButton item={{slug: p.slug, title: cleanTitle(p.title), pricePaise: p.fromPricePaise, image: p.image?.url ?? null, category: p.category ?? '', subtitle: p.categoryTitle}} />
      <Link href={`/products/${p.slug}`} className="m" tabIndex={-1}>
        <b>{cleanTitle(p.title)}</b>
        <span>{p.categoryTitle}</span>
        <span className="price">{price}{p.compareAtPaise && <s className="strike">{inr(p.compareAtPaise)}</s>}</span>
      </Link>
    </article>
  );
}

export function Unavailable() {
  return <div className="card empty"><Pic art="cluster" /><h2 className="disp">The shop is resting for a moment</h2><p className="muted">We couldn’t load the pieces just now. Please try again in a minute.</p></div>;
}
