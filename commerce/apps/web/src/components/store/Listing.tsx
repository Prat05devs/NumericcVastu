import Link from 'next/link';
import {apiGet} from '@/lib/server-api';
import {ProductCard, Unavailable, type Card} from './ProductCard';

type Filter = {code: string; label: string; type: string; unit: string | null; options: {value: string; label: string}[]};
type Category = {slug: string; title: string; intro: string | null; filters: Filter[]};
export type Search = Record<string, string | string[] | undefined>;

const SORTS = [['featured', 'Featured'], ['newest', 'Newest'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low']] as const;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Server-rendered listing: every filter is a plain GET form, so pages are crawlable and work without JavaScript. */
export async function Listing({category, collection, search, basePath, title}: {category?: string; collection?: string; search: Search; basePath: string; title: string}) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  for (const key of ['q', 'sort', 'minPrice', 'maxPrice', 'inStock', 'cursor']) { const v = one(search[key]); if (v) params.set(key, v); }
  for (const [k, v] of Object.entries(search)) if (k.startsWith('attr_') && one(v)) params.set(k, one(v)!);
  params.set('limit', '24');
  const path = collection ? `/collections/${collection}?${params}` : `/products?${params}`;
  const [res, cats] = await Promise.all([apiGet<Card[] | {products: Card[]}>(path, {revalidate: 30}), apiGet<Category[]>('/categories', {revalidate: 120})]);
  if (!res) return <Unavailable />;
  const items = Array.isArray(res.data) ? res.data : res.data.products;
  const cat = cats?.data.find((c) => c.slug === category);
  const next = res.meta.nextCursor;
  const nextParams = new URLSearchParams(params); nextParams.delete('limit'); nextParams.delete('category');
  if (next) nextParams.set('cursor', next);
  return (
    <div className="wrap" style={{marginTop: '2rem'}}>
      <h1>{title}</h1>
      {cat?.intro && <p className="muted" style={{maxWidth: '70ch'}}>{cat.intro}</p>}
      <div className="layout-list">
        <form className="filters" method="get" action={basePath} aria-label="Filters">
          <fieldset>
            <legend>Sort</legend>
            <select name="sort" defaultValue={one(search['sort']) ?? 'featured'}>{SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </fieldset>
          <fieldset>
            <legend>Price (₹)</legend>
            <div className="row" style={{gap: '.5rem', flexWrap: 'nowrap'}}>
              <input name="minPrice" inputMode="numeric" placeholder="Min (paise)" aria-label="Minimum price in paise" defaultValue={one(search['minPrice'])} />
              <input name="maxPrice" inputMode="numeric" placeholder="Max (paise)" aria-label="Maximum price in paise" defaultValue={one(search['maxPrice'])} />
            </div>
          </fieldset>
          {cat?.filters.filter((f) => f.options.length).map((f) => (
            <fieldset key={f.code}>
              <legend>{f.label}</legend>
              <select name={`attr_${f.code}`} defaultValue={one(search[`attr_${f.code}`]) ?? ''} aria-label={f.label}>
                <option value="">Any</option>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </fieldset>
          ))}
          <label className="check"><input type="checkbox" name="inStock" value="true" defaultChecked={one(search['inStock']) === 'true'} /> In stock only</label>
          <div className="row" style={{marginTop: '1rem'}}><button className="btn small" type="submit">Apply</button><Link href={basePath} className="small">Clear</Link></div>
        </form>
        <section aria-live="polite">
          {items.length ? <div className="grid cards">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div> : <p className="muted">Nothing matches these filters yet.</p>}
          {next && <p style={{marginTop: '1.5rem'}}><Link className="btn ghost" href={`${basePath}?${nextParams}`}>Next page →</Link></p>}
        </section>
      </div>
    </div>
  );
}
