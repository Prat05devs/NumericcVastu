import Link from 'next/link';
import {apiGet} from '@/lib/server-api';
import {Art, Icon, Pic, ProductCard, SHOP, Unavailable, type Card} from '@/components/store/ui';
import {MulankFinder} from '@/components/store/MulankFinder';
import {JoinForm} from '@/components/store/JoinForm';

export const revalidate = 60;

const FAMILIES: [string, string, string, string][] = [
  ['Rudraksha', 'By mukhi and origin', '/rudraksha', 'rudraksha'],
  ['Gemstones', 'Weight, origin, treatment', '/gemstones', 'gem-blue'],
  ['Crystals', 'Towers, clusters, raw', '/crystals', 'cluster'],
  ['Bracelets', 'Hand-strung beads', '/crystals?attr_product_form=bracelet', 'bracelet-rose'],
  ['Yantras', 'Copper and brass', '/yantras', 'yantra'],
  ['Wristwatch', 'Made to order', '/custom-wristwatch', 'watch'],
];
const Arrow = () => <Icon name="arrow" />;

export default async function Home() {
  const [newest, featured, guides] = await Promise.all([
    apiGet<Card[]>('/products?sort=newest&limit=5'),
    apiGet<Card[]>('/products?sort=featured&limit=8'),
    apiGet<{slug: string; title: string; summary: string}[]>('/articles', {tags: ['cms']}),
  ]);
  const edit = newest?.data ?? [];
  const best = featured?.data ?? [];
  return (
    <>
      <section className="hero2" aria-label="Featured">
        <Link className="panel p1" href="/crystals?attr_product_form=bracelet">
          <div className="bg"><Art name="hero-bracelet" /></div>
          <span className="eyebrow">Bracelets · new this month</span>
          <h1 className="disp">Choose stones<br />with purpose</h1>
          <p>Hand-strung bracelets in natural stone and rudraksha, each listed with its bead size, origin and treatment.</p>
          <span className="btn">Shop bracelets <Arrow /></span>
        </Link>
        <Link className="panel p2" href="#finder">
          <div className="bg"><Art name="hero-crystals" /></div>
          <span className="eyebrow">Not sure what suits you?</span>
          <h2 className="disp">Find your stone<br />by your number</h2>
          <p>Enter your date of birth to see the stones traditionally linked with your Mulank, then shop them in one tap.</p>
          <span className="btn">Find my stone <Arrow /></span>
        </Link>
      </section>

      <div className="w">
        <div className="trust" role="list">
          <div role="listitem"><Icon name="spark" /><span><b>Honest descriptions</b>Origin, treatment and size</span></div>
          <div role="listitem"><Icon name="truck" /><span><b>Delivery included</b>Insured, across India</span></div>
          <div role="listitem"><Icon name="user" /><span><b>Guided by Adarshh</b>Numerology and Vaastu</span></div>
          <div role="listitem"><Icon name="lock" /><span><b>Secure checkout</b>UPI, cards and net banking</span></div>
        </div>

        <section className="section" aria-labelledby="fam-h">
          <div className="head"><div><span className="eyebrow">Shop by family</span><h2 className="disp" id="fam-h">Find what you are looking for</h2></div><Link className="lnk" href="/shop">See everything →</Link></div>
          <div className="cats">{FAMILIES.map(([t, s, href, art]) => <Link key={t} className="cat" href={href}><span className="ring pic"><Art name={art} /></span><b>{t}</b><span>{s}</span></Link>)}</div>
        </section>

        {newest === null ? <section className="section"><Unavailable /></section> : edit.length > 0 && (
          <section className="section" aria-labelledby="edit-h">
            <div className="head"><div><span className="eyebrow">New arrivals</span><h2 className="disp" id="edit-h">This week’s edit</h2></div><Link className="lnk" href="/shop?sort=newest">View all →</Link></div>
            <div className="edit">{edit.map((p, i) => <ProductCard key={p.id} p={p} tall={i === 0 && edit.length >= 5} eager={i < 2} />)}</div>
          </section>
        )}
      </div>

      <section className="curve" aria-labelledby="curve-h">
        <div className="w">
          <span className="eyebrow">Worn with intention</span>
          <h2 className="disp" id="curve-h">Small rituals,<br />carried every day</h2>
          <p>Bracelets and pendants chosen for what they mean to you, made to wear daily and described without exaggeration.</p>
          <Link className="btn light" href="/crystals?attr_product_form=bracelet">Discover the collection <Arrow /></Link>
        </div>
        <div className="arc" aria-hidden="true">{['bracelet-rose', 'pendant', 'bracelet-tiger', 'cluster', 'bracelet-onyx'].map((a) => <Pic key={a} art={a} />)}</div>
      </section>

      <div className="w">
        <section className="section" id="finder" aria-labelledby="finder-h"><MulankFinder mainSite={SHOP.main} /></section>

        <section className="wbanner" aria-labelledby="banner-h">
          <div className="wcopy"><span className="eyebrow">Made to order</span><h2 className="disp" id="banner-h">A wristwatch,<br />aligned to your numbers</h2><p>Dial colour, strap and the day you begin wearing it are chosen from your birth chart. Quoted for you before anything is made.</p><Link className="btn" href="/custom-wristwatch">Request a quote <Arrow /></Link></div>
          <div className="art-wrap"><div className="stripes" /><div className="plinth" /><Art name="watch-big" /></div>
        </section>

        {best.length > 0 && (
          <section className="section" aria-labelledby="best-h">
            <div className="head"><div><span className="eyebrow">Most loved</span><h2 className="disp" id="best-h">Best sellers</h2></div><Link className="lnk" href="/shop">Shop all →</Link></div>
            <div className="grid4">{best.map((p) => <ProductCard key={p.id} p={p} />)}</div>
          </section>
        )}

        {guides?.data.length ? (
          <section className="section" aria-labelledby="journal-h">
            <div className="head"><div><span className="eyebrow">Guides</span><h2 className="disp" id="journal-h">Before you buy</h2></div><Link className="lnk" href="/guides">All guides →</Link></div>
            <div className="journal">{guides.data.slice(0, 3).map((g, i) => <Link key={g.slug} className="post" href={`/guides/${g.slug}`}><Pic art={['rudraksha', 'gem-yellow', 'cluster'][i % 3]!} /><span className="t"><span>Guide</span><b>{g.title}</b></span></Link>)}</div>
          </section>
        ) : null}

        <section className="join" aria-labelledby="join-h">
          <span className="eyebrow">Stay close</span>
          <h2 className="disp" id="join-h">First look at new pieces</h2>
          <p>New arrivals, festival offers and Adarshh’s guides, about twice a month. No spam; leave any time.</p>
          <JoinForm />
        </section>
      </div>
    </>
  );
}
