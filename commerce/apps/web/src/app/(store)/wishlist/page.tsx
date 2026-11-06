'use client';
import Link from 'next/link';
import {useWishlist, removeWish} from '@/components/store/Wishlist';
import {Art, artFor} from '@/components/store/ui';
import {inr} from '@/lib/format';

export default function WishlistPage() {
  const items = useWishlist();
  if (items === null) return <div className="w" style={{padding: '40px 0'}}><p className="muted">Loading…</p></div>;
  return (
    <div className="w" style={{paddingTop: 26}}>
      <h1 className="disp" style={{fontSize: 'clamp(32px,4vw,44px)'}}>Your wishlist{items.length ? ` · ${items.length}` : ''}</h1>
      <p className="hint" style={{margin: '6px 0 20px'}}>Saved on this device. Prices may change; the product page always shows the current one.</p>
      {items.length ? (
        <div className="grid4">{items.map((i) => (
          <article key={i.slug} className="pc">
            <Link href={`/products/${i.slug}`} className="pic-link"><div className="pic">{i.image ? <img src={i.image} alt={i.title} loading="lazy" /> : <Art name={artFor(i.category, i.title)} />}</div></Link>
            <button type="button" className="heart" aria-pressed="true" aria-label={`Remove ${i.title} from your wishlist`} onClick={() => removeWish(i.slug)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg></button>
            <Link href={`/products/${i.slug}`} className="m"><b>{i.title}</b><span>{i.subtitle}</span>{i.pricePaise && <span className="price">{inr(i.pricePaise)}</span>}</Link>
          </article>
        ))}</div>
      ) : <div className="card empty"><span className="pic"><Art name="pendant" /></span><h2 className="disp">Nothing saved yet</h2><p className="muted">Tap the heart on any piece to keep it here.</p><Link className="btn" href="/shop">Browse the shop</Link></div>}
    </div>
  );
}
