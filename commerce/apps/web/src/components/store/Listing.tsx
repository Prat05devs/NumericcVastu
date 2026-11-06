import Link from 'next/link';
import {apiGet} from '@/lib/server-api';
import {ProductCard, Unavailable, Pic, SHOP, waLink, WhatsAppIcon, type Card} from './ui';
import {SortSelect} from './SortSelect';

type Filter = {code: string; label: string; type: string; unit: string | null; options: {value: string; label: string}[]};
type Category = {slug: string; title: string; intro: string | null; filters: Filter[]};
export type Search = Record<string, string | string[] | undefined>;

const SORTS = [['featured', 'Sort: Featured'], ['newest', 'Sort: Newest'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low']] as const;
/** The filter shown as quick chips above the grid, per family. */
const CHIP_FILTER: Record<string, string> = {rudraksha: 'bead_type', crystals: 'product_form', yantras: 'material', gemstones: 'treatment'};
const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? v.split(',') : []).filter(Boolean);
const one = (v: string | string[] | undefined) => all(v)[0];
const rupeeToPaise = (v: string | undefined) => (v && /^\d{1,9}$/.test(v.trim()) ? `${Number(v.trim()) * 100}` : undefined);

/** Server-rendered listing: every filter is a plain GET form, so pages are crawlable and work without JavaScript. */
export async function Listing({category, collection, search, basePath, title, intro, eyebrow}: {category?: string; collection?: string; search: Search; basePath: string; title: string; intro?: string; eyebrow?: string}) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  for (const key of ['q', 'sort', 'cursor']) { const v = one(search[key]); if (v) params.set(key, v); }
  if (one(search['inStock']) === 'true') params.set('inStock', 'true');
  const min = rupeeToPaise(one(search['min'])); const max = rupeeToPaise(one(search['max']));
  if (min) params.set('minPrice', min);
  if (max) params.set('maxPrice', max);
  for (const [k, v] of Object.entries(search)) if (k.startsWith('attr_') && all(v).length) params.set(k, all(v).join(','));
  params.set('limit', '24');
  const path = collection ? `/collections/${collection}?${params}` : `/products?${params}`;
  const [res, cats] = await Promise.all([apiGet<Card[] | {products: Card[]}>(path, {revalidate: 30}), apiGet<Category[]>('/categories', {revalidate: 120})]);
  const cat = cats?.data.find((c) => c.slug === category);
  const filters = cat?.filters.filter((f) => f.options.length) ?? [];
  const chipFilter = category ? filters.find((f) => f.code === CHIP_FILTER[category]) : undefined;
  const chipKey = chipFilter ? `attr_${chipFilter.code}` : '';
  const chipOn = chipKey ? all(search[chipKey]) : [];
  const active = [...filters.flatMap((f) => all(search[`attr_${f.code}`]).map((v) => f.options.find((o) => o.value === v)?.label ?? v)), ...(min || max ? [`₹${one(search['min']) ?? 0} – ${one(search['max']) ? `₹${one(search['max'])}` : 'any'}`] : []), ...(params.get('inStock') ? ['In stock'] : [])];

  // Links that keep the other choices but change one filter value.
  const linkWith = (key: string, value: string | null) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(search)) if (k !== key && k !== 'cursor' && v !== undefined) all(v).forEach((x) => q.append(k, x));
    if (value) q.set(key, value);
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const filterForm = (id: string) => (
    <form id={id} className="fl-form" method="get" action={basePath} aria-label="Filters" style={{display: 'grid', gap: 14}}>
      {one(search['q']) && <input type="hidden" name="q" value={one(search['q'])} />}
      <div className="fg"><h4>Price (₹)</h4><div className="g2"><label><span className="sr">Minimum price in rupees</span><input className="in" name="min" inputMode="numeric" placeholder="Min" defaultValue={one(search['min'])} /></label><label><span className="sr">Maximum price in rupees</span><input className="in" name="max" inputMode="numeric" placeholder="Max" defaultValue={one(search['max'])} /></label></div></div>
      {filters.map((f) => (
        <div className="fg" key={f.code}><h4>{f.label}</h4>
          {f.options.map((o) => <label key={o.value} className="tick"><input type="checkbox" name={`attr_${f.code}`} value={o.value} defaultChecked={all(search[`attr_${f.code}`]).includes(o.value)} />{o.label}</label>)}
        </div>
      ))}
      <div className="fg"><h4>Availability</h4><label className="tick"><input type="checkbox" name="inStock" value="true" defaultChecked={one(search['inStock']) === 'true'} />In stock only</label></div>
      <input type="hidden" name="sort" value={one(search['sort']) ?? 'featured'} />
      <div className="row"><button className="btn sm" type="submit">Show results</button><Link href={basePath} className="lnk">Clear all</Link></div>
    </form>
  );

  if (!res) return <div className="w" style={{paddingTop: 30}}><Unavailable /></div>;
  const items = Array.isArray(res.data) ? res.data : res.data.products;
  const next = res.meta.nextCursor;
  const nextParams = new URLSearchParams();
  for (const [k, v] of Object.entries(search)) if (k !== 'cursor' && v !== undefined) all(v).forEach((x) => nextParams.append(k, x));
  if (next) nextParams.set('cursor', next);
  return (
    <div className="w">
      <div className="crumbs"><Link href="/">Home</Link> / <b>{title}</b></div>
      <div className="lhead"><span className="eyebrow">{eyebrow ?? `${title} · ${items.length}${next ? '+' : ''} piece${items.length === 1 ? '' : 's'}`}</span><h1 className="disp">{title}</h1>{(intro || cat?.intro) && <p>{intro ?? cat?.intro}</p>}</div>
      {chipFilter && (
        <nav className="chips" aria-label={chipFilter.label}>
          <Link className={`pill${chipOn.length ? '' : ' on'}`} href={linkWith(chipKey, null)}>All</Link>
          {chipFilter.options.map((o) => <Link key={o.value} className={`pill${chipOn.length === 1 && chipOn[0] === o.value ? ' on' : ''}`} href={linkWith(chipKey, o.value)}>{o.label}</Link>)}
        </nav>
      )}
      <div className="lay">
        <aside className="fl">{filterForm('filters')}</aside>
        <section aria-live="polite">
          <div className="toolbar">
            <span><b style={{color: 'var(--espresso)'}}>{items.length}{next ? '+' : ''} result{items.length === 1 ? '' : 's'}</b>{active.length ? ` · ${active.join(' · ')}` : ''}{active.length > 0 && <> <Link className="lnk" href={basePath} style={{marginLeft: 6}}>Clear</Link></>}</span>
            <span className="row">
              <details className="mf mfilter"><summary className="btn light sm">Filters{active.length ? ` · ${active.length}` : ''}</summary><div className="card" style={{position: 'absolute', zIndex: 15, left: 14, right: 14, marginTop: 8, padding: 18, maxHeight: '70vh', overflow: 'auto'}}>{filterForm('filters-m')}</div></details>
              <SortSelect value={one(search['sort']) ?? 'featured'} options={SORTS} form="filters" />
            </span>
          </div>
          {items.length ? <div className="grid4">{items.map((p, i) => <ProductCard key={p.id} p={p} eager={i < 4} />)}</div> : (
            <div className="card empty"><Pic art="cluster" /><h2 className="disp">No pieces match {active.length ? 'these filters' : 'yet'}</h2><p className="muted">{active.length ? 'Try removing a filter, or ask Adarshh’s team what would suit you.' : 'New pieces are being photographed and listed. Ask us if you are looking for something specific.'}</p><div className="row" style={{justifyContent: 'center'}}>{active.length > 0 && <Link className="btn sm" href={basePath}>Clear filters</Link>}<a className="btn light sm" href={waLink(`Namaste, I am looking for ${title.toLowerCase()} on the crystal shop.`)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon /> Ask on WhatsApp</a></div></div>
          )}
          {(next || one(search['cursor'])) && <div className="pager">{one(search['cursor']) && <Link className="btn light sm" href={basePath}>← First page</Link>}{next && <Link className="btn light sm" href={`${basePath}?${nextParams}`}>Next page →</Link>}</div>}
        </section>
      </div>
      <p className="fine" style={{marginTop: 26}}>Prices include GST and insured delivery across India. Questions? <a className="lnk" href={`https://wa.me/${SHOP.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp us</a>.</p>
    </div>
  );
}
