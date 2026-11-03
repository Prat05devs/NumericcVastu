import Link from 'next/link';
import {inr} from '@/lib/format';

export type Card = {id: string; slug: string; title: string; categoryTitle: string; productType: string; fromPricePaise: string | null; compareAtPaise: string | null; image: {url: string; alt: string; width: number | null; height: number | null} | null; available: boolean; isDemo: boolean; badges: string[]};

export function ProductCard({p}: {p: Card}) {
  return (
    <Link href={`/products/${p.slug}`} className="tile">
      <div className="img">{p.image ? <img src={p.image.url} alt={p.image.alt} width={p.image.width ?? 600} height={p.image.height ?? 600} loading="lazy" /> : null}</div>
      <div className="body">
        <div className="row" style={{gap: '.35rem', marginBottom: '.35rem'}}>{p.badges.map((b) => <span key={b} className={`badge${b === 'DEMO' ? ' demo' : ''}`}>{b}</span>)}</div>
        <h3>{p.title}</h3>
        <div className="small muted">{p.categoryTitle}</div>
        <div className="price">{p.productType === 'CUSTOM_REQUEST' ? 'Made to order' : p.fromPricePaise ? <>From {inr(p.fromPricePaise)}{p.compareAtPaise && <s>{inr(p.compareAtPaise)}</s>}</> : null}</div>
        {!p.available && <div className="small muted">Currently unavailable</div>}
      </div>
    </Link>
  );
}

export function Unavailable() {
  return <div className="alert warn">The shop is temporarily unavailable. Please try again in a few minutes.</div>;
}
