import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {apiGet} from '@/lib/server-api';
import {date} from '@/lib/format';
import {Gallery} from '@/components/store/Gallery';
import {ProductBuy} from '@/components/store/ProductBuy';
import {CopyCode, type Offer} from '@/components/store/Ticker';
import {WishButton} from '@/components/store/Wishlist';
import {Icon, ProductCard, artFor, cleanTitle, waLink, WhatsAppIcon, type Card} from '@/components/store/ui';

type Attr = Record<string, {label: string; value: string | null; unit: string | null}>;
type Product = {
  id: string; slug: string; title: string; productType: string; shortDescription: string; body: string; isDemo: boolean; returnEligible: boolean | null;
  seo: {title: string; description: string}; category: {slug: string; title: string}; attributes: Attr;
  media: {url: string; alt: string; width: number | null; height: number | null}[];
  variants: {id: string; sku: string; title: string; options?: Record<string, string>; pricePaise: string; compareAtPaise: string | null; available: boolean; uniqueSpecimen: boolean; attributes: Attr; certificates: {issuer: string; reportNo: string; reportType: string; issuedOn: string | null; isDemo: boolean}[]}[];
  reviews: {id: string; rating: number; body: string; authorName: string; createdAt: string; verifiedPurchase: boolean}[];
};
const FAMILY: Record<string, string> = {rudraksha: 'RUDRAKSHA', gemstones: 'GEMSTONE', crystals: 'CRYSTAL', yantras: 'YANTRA', 'custom-wristwatch': 'WATCH'};
const CARE: Record<string, string> = {
  rudraksha: 'Keep it dry and away from soap and perfume. Wipe with a soft cloth; a drop of natural oil now and then keeps the bead from drying out.',
  gemstones: 'Store it in its pouch, apart from other stones. Clean with lukewarm water and a soft brush; avoid harsh chemicals and ultrasonic cleaners.',
  crystals: 'Dust with a soft dry cloth. Keep softer or dyed crystals out of strong sunlight and water. Re-string bracelets if the elastic loosens.',
  yantras: 'Wipe with a dry cloth. Copper and brass darken naturally; a little lemon and salt restores the shine if you prefer it bright.',
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
  const [offersRes, relatedRes] = await Promise.all([apiGet<Offer[]>('/offers', {revalidate: 60, tags: ['catalogue', 'campaign']}), apiGet<Card[]>(`/products?category=${p.category.slug}&limit=5`, {revalidate: 120})]);
  const family = FAMILY[p.category.slug];
  const offers = (offersRes?.data ?? []).filter((o) => !o.families?.length || (family && o.families.includes(family)));
  const related = (relatedRes?.data ?? []).filter((r) => r.slug !== p.slug).slice(0, 4);
  const title = cleanTitle(p.title);
  const art = artFor(p.category.slug, p.title);
  const facts = Object.values(p.attributes).filter((a) => a.value).slice(0, 6);
  const optionKey = Object.keys(p.variants[0]?.options ?? {})[0];
  const optionLabel = optionKey ? optionKey.charAt(0).toUpperCase() + optionKey.slice(1).replace(/_/g, ' ') : 'Option';
  const hasLab = p.variants.some((v) => v.certificates.length);
  const prices = p.variants.map((v) => BigInt(v.pricePaise));
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product', name: title, description: p.seo.description, sku: p.variants[0]?.sku, image: p.media.map((m) => m.url),
    brand: {'@type': 'Brand', name: 'NumericcVaastu Crystal'}, category: p.category.title,
    ...(prices.length && {offers: {'@type': 'AggregateOffer', priceCurrency: 'INR', lowPrice: (Number(prices.reduce((a, b) => (b < a ? b : a))) / 100).toFixed(2), highPrice: (Number(prices.reduce((a, b) => (b > a ? b : a))) / 100).toFixed(2), offerCount: p.variants.length, availability: p.variants.some((v) => v.available) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'}}),
    ...(p.reviews.length && {aggregateRating: {'@type': 'AggregateRating', ratingValue: (p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length).toFixed(1), reviewCount: p.reviews.length}}),
  };
  return (
    <div className="w">
      {!p.isDemo && <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd).replace(/</g, '\\u003c')}} />}
      <div className="crumbs"><Link href="/">Home</Link> / <Link href={`/${p.category.slug}`}>{p.category.title}</Link> / <b>{title}</b></div>
      {p.isDemo && <p className="note warn" style={{marginBottom: 16}}>Demo listing: it exists only to test the shop and is not for sale.</p>}
      <div className="pdp">
        <div style={{position: 'relative'}}>
          <Gallery media={p.media} art={art} title={title} />
          <WishButton item={{slug: p.slug, title, pricePaise: p.variants[0]?.pricePaise ?? null, image: p.media[0]?.url ?? null, category: p.category.slug, subtitle: p.category.title}} className="heart" />
        </div>
        <div className="buy">
          <div><span className="eyebrow">{p.category.title}</span><h1 className="disp">{title}</h1>{p.shortDescription && !p.isDemo && <p className="meta-line">{p.shortDescription}</p>}</div>
          {p.productType === 'CUSTOM_REQUEST'
            ? <Link className="btn" href="/custom-wristwatch">Request a quotation</Link>
            : <ProductBuy variants={p.variants.map((v) => ({id: v.id, title: v.title, pricePaise: v.pricePaise, compareAtPaise: v.compareAtPaise, available: v.available, uniqueSpecimen: v.uniqueSpecimen}))} title={title} image={p.media[0]?.url ?? null} art={art} optionLabel={optionLabel} />}
          {offers.length > 0 && (
            <div className="offers"><b style={{fontSize: 13}}>Offers for you</b>
              {offers.slice(0, 2).map((o) => <div key={o.code} className="offer"><span><b>{o.code}</b> · {o.title}</span><CopyCode code={o.code} big /></div>)}
              <span className="hint">Apply the code in your cart or at checkout.</span>
            </div>
          )}
          {facts.length > 0 && <div className="facts">{facts.map((a) => <div key={a.label}><span>{a.label}</span>{a.value}{a.unit ? ` ${a.unit}` : ''}</div>)}</div>}
          <div className="numbox"><b>Not sure it suits you?</b> Find your number in seconds on the <Link className="lnk" href="/#finder">stone finder</Link>, or <a className="lnk" href={waLink(`Namaste, does the ${title} suit me?`)} target="_blank" rel="noopener noreferrer">ask Adarshh’s team</a>. Traditional associations only; no outcome is guaranteed.</div>
          <div className="assure"><Icon name="truck" /><span><b style={{color: 'var(--espresso)'}}>Delivery included</b> · insured, across India · prepaid by UPI, cards or net banking</span></div>
          <div className="acc">
            <details open><summary>Description</summary>{p.body.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}</details>
            <details><summary>What’s in the box</summary><p>The piece in a padded box{hasLab ? ', with its printed lab report' : ''}. A GST invoice is emailed with your order.</p></details>
            <details><summary>Delivery and returns</summary><p>Delivery is included in the price and handled by our courier partner; the tracking link is emailed when your order ships. {p.returnEligible ? 'This piece can be returned under our returns policy.' : 'This piece can be returned only if it arrives damaged or is not as described.'} <Link className="lnk" href="/policies/returns-policy">Returns policy</Link></p></details>
            {CARE[p.category.slug] && <details><summary>Care</summary><p>{CARE[p.category.slug]}</p></details>}
          </div>
          <a className="btn light" href={waLink(`Namaste, I have a question about the ${title}.`)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon /> Ask about this piece</a>
        </div>
      </div>

      <section className="section" aria-labelledby="rv-h">
        <div className="between" style={{marginBottom: 14}}><h2 className="disp" id="rv-h" style={{fontSize: 32}}>Reviews</h2></div>
        {p.reviews.length ? <div className="grid3">{p.reviews.map((r) => (
          <article key={r.id} className="card review"><span className="stars" aria-label={`${r.rating} out of 5`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span><p>{r.body}</p><span className="hint">{r.authorName}{r.verifiedPurchase ? ' · verified buyer' : ''} · {date(r.createdAt)}</span></article>
        ))}</div> : <div className="card" style={{padding: 20}}><p className="muted">No reviews yet. Reviews come only from verified buyers.</p></div>}
      </section>

      {related.length > 0 && (
        <section className="section" aria-labelledby="rel-h">
          <h2 className="disp" id="rel-h" style={{fontSize: 32, marginBottom: 16}}>Pairs well with</h2>
          <div className="grid4">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}
    </div>
  );
}
