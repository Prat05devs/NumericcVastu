import Link from 'next/link';
import {apiGet} from '@/lib/server-api';
import {ProductCard, type Card} from '@/components/store/ProductCard';

export const revalidate = 60;

export default async function Home() {
  const featured = await apiGet<Card[]>('/products?sort=featured&limit=8');
  const guides = await apiGet<{slug: string; title: string; summary: string}[]>('/articles', {tags: ['cms']});
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>Rudraksha, gemstones, crystals &amp; yantras — chosen with purpose</h1>
          <p>Every piece is described honestly — origin, treatment, size and lab report where one exists — with guidance rooted in numerology and Vastu from Adarshh Panndey.</p>
          <div className="row"><Link className="btn gold" href="/shop">Shop all</Link><Link className="btn ghost" style={{color: '#fff', borderColor: '#fff'}} href="/consultation">Not sure what suits you?</Link></div>
        </div>
      </section>
      <div className="wrap stack" style={{marginTop: '2.5rem'}}>
        <section aria-labelledby="cats">
          <h2 id="cats">Shop by family</h2>
          <div className="cat-tiles">
            <Link href="/rudraksha"><strong>Rudraksha</strong><span className="small muted">By mukhi, origin and size</span></Link>
            <Link href="/gemstones"><strong>Gemstones</strong><span className="small muted">Weight, treatment and lab reports disclosed</span></Link>
            <Link href="/crystals"><strong>Crystals</strong><span className="small muted">Bracelets, towers, clusters and more</span></Link>
            <Link href="/yantras"><strong>Yantras</strong><span className="small muted">Material, size and traditional placement</span></Link>
            <Link href="/custom-wristwatch"><strong>Numerology wristwatch</strong><span className="small muted">Made to order, quoted for you</span></Link>
          </div>
        </section>
        <section aria-labelledby="featured">
          <div className="row spread"><h2 id="featured">Featured</h2><Link href="/shop">See everything →</Link></div>
          {featured ? (featured.data.length ? <div className="grid cards">{featured.data.map((p) => <ProductCard key={p.id} p={p} />)}</div> : <p className="muted">New pieces are being photographed and listed. Please check back soon.</p>) : <div className="alert warn">The shop is temporarily unavailable.</div>}
        </section>
        {guides?.data.length ? (
          <section aria-labelledby="guides">
            <h2 id="guides">Guides</h2>
            <div className="grid cards">{guides.data.slice(0, 3).map((g) => <Link key={g.slug} className="card" href={`/guides/${g.slug}`}><strong>{g.title}</strong><p className="small muted">{g.summary}</p></Link>)}</div>
          </section>
        ) : null}
      </div>
    </>
  );
}
