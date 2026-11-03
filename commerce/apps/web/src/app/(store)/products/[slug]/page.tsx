import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {apiGet} from '@/lib/server-api';
import {inr, date} from '@/lib/format';
import {AddToCart} from '@/components/store/AddToCart';

type Attr = Record<string, {label: string; value: string | null; unit: string | null}>;
type Product = {
  id: string; slug: string; title: string; productType: string; shortDescription: string; body: string; isDemo: boolean; returnEligible: boolean | null;
  seo: {title: string; description: string}; category: {slug: string; title: string}; attributes: Attr;
  media: {url: string; alt: string; width: number | null; height: number | null}[];
  variants: {id: string; sku: string; title: string; pricePaise: string; compareAtPaise: string | null; available: boolean; uniqueSpecimen: boolean; attributes: Attr; certificates: {issuer: string; reportNo: string; reportType: string; issuedOn: string | null; isDemo: boolean}[]}[];
  reviews: {id: string; rating: number; body: string; authorName: string; createdAt: string; verifiedPurchase: boolean}[];
};

const load = async (slug: string) => apiGet<Product>(`/products/${slug}`, {revalidate: 60});

export async function generateMetadata({params}: {params: Promise<{slug: string}>}): Promise<Metadata> {
  const p = (await load((await params).slug))?.data;
  if (!p) return {};
  return {title: p.seo.title, description: p.seo.description, alternates: {canonical: `/products/${p.slug}`}, robots: p.isDemo ? {index: false} : undefined, openGraph: {images: p.media[0] ? [p.media[0].url] : []}};
}

export default async function ProductPage({params}: {params: Promise<{slug: string}>}) {
  const p = (await load((await params).slug))?.data;
  if (!p) notFound();
  const specs = Object.values(p.attributes).filter((a) => a.value);
  const prices = p.variants.map((v) => BigInt(v.pricePaise));
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.title, description: p.seo.description, sku: p.variants[0]?.sku, image: p.media.map((m) => m.url),
    brand: {'@type': 'Brand', name: 'NumericcVaastu Crystal'}, category: p.category.title,
    ...(prices.length && {offers: {'@type': 'AggregateOffer', priceCurrency: 'INR', lowPrice: (Number(prices.reduce((a, b) => (b < a ? b : a))) / 100).toFixed(2), highPrice: (Number(prices.reduce((a, b) => (b > a ? b : a))) / 100).toFixed(2), offerCount: p.variants.length, availability: p.variants.some((v) => v.available) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'}}),
    // Ratings only from moderated reviews; none are invented.
    ...(p.reviews.length && {aggregateRating: {'@type': 'AggregateRating', ratingValue: (p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length).toFixed(1), reviewCount: p.reviews.length}}),
  };
  return (
    <div className="wrap" style={{marginTop: '2rem'}}>
      {!p.isDemo && <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd).replace(/</g, '\\u003c')}} />}
      <nav aria-label="Breadcrumb" className="small muted"><Link href="/">Home</Link> / <Link href={`/${p.category.slug}`}>{p.category.title}</Link></nav>
      {p.isDemo && <div className="alert warn"><strong>Demo listing.</strong> This entry exists only to test the store and is not for sale.</div>}
      <div className="two" style={{marginTop: '1rem'}}>
        <div className="gallery grid">{p.media.length ? p.media.map((m, i) => <img key={m.url} src={m.url} alt={m.alt} width={m.width ?? 800} height={m.height ?? 800} loading={i ? 'lazy' : 'eager'} />) : <div className="card muted">Photos coming soon.</div>}</div>
        <div className="stack">
          <h1>{p.title}</h1>
          <p className="muted">{p.shortDescription}</p>
          {p.productType === 'CUSTOM_REQUEST'
            ? <Link className="btn" href="/custom-wristwatch">Request a quotation</Link>
            : <AddToCart variants={p.variants.map((v) => ({id: v.id, title: v.title, pricePaise: v.pricePaise, compareAtPaise: v.compareAtPaise, available: v.available, uniqueSpecimen: v.uniqueSpecimen}))} />}
          {specs.length > 0 && (
            <table className="specs"><caption className="sr" style={{position: 'absolute', left: '-999px'}}>Specifications</caption><tbody>
              {specs.map((a) => <tr key={a.label}><th scope="row">{a.label}</th><td>{a.value}{a.unit ? ` ${a.unit}` : ''}</td></tr>)}
              <tr><th scope="row">Returns</th><td>{p.returnEligible ? 'Eligible under the returns policy' : 'Not returnable unless damaged in transit'}</td></tr>
            </tbody></table>
          )}
          {p.variants.flatMap((v) => v.certificates).map((c) => (
            <div key={c.reportNo} className="alert good small">Lab report: {c.issuer}, {c.reportType} no. <Link href={`/certificates/verify?reportNo=${encodeURIComponent(c.reportNo)}`}>{c.reportNo}</Link>{c.issuedOn ? `, issued ${date(c.issuedOn)}` : ''}{c.isDemo ? ' (demo)' : ''}</div>
          ))}
        </div>
      </div>
      <section style={{marginTop: '2.5rem', maxWidth: '75ch'}}>
        <h2>About this piece</h2>
        {p.body.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
        <p className="small muted">Guidance about rudraksha, gemstones, crystals and yantras is traditional and belief-based. It is not medical, financial or legal advice, and no outcome is guaranteed.</p>
      </section>
      <section style={{marginTop: '2rem'}}>
        <h2>Reviews</h2>
        {p.reviews.length ? p.reviews.map((r) => (
          <article key={r.id} className="card" style={{marginBottom: '.75rem'}}>
            <strong>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</strong> <span className="small muted">{r.authorName}{r.verifiedPurchase ? ' · Verified purchase' : ''} · {date(r.createdAt)}</span>
            <p>{r.body}</p>
          </article>
        )) : <p className="muted">No reviews yet.</p>}
      </section>
      <p className="small muted">Prices include the amounts shown at checkout; the final total is always calculated by our server. Lowest price {prices.length ? inr(prices.reduce((a, b) => (b < a ? b : a)).toString()) : '—'}.</p>
    </div>
  );
}
