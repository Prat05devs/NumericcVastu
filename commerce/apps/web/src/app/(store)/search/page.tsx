import {Listing, type Search} from '@/components/store/Listing';

export const metadata = {title: 'Search', robots: {index: false}};
export default async function SearchPage({searchParams}: {searchParams: Promise<Search>}) {
  const s = await searchParams;
  const q = typeof s['q'] === 'string' ? s['q'] : '';
  return (
    <>
      <form className="wrap row" method="get" action="/search" role="search" style={{marginTop: '2rem'}}>
        <input id="q" name="q" aria-label="Search the shop" defaultValue={q} placeholder="Search rudraksha, amethyst, shree yantra…" style={{flex: 1}} />
        <button className="btn">Search</button>
      </form>
      {q ? <Listing search={s} basePath="/search" title={`Results for “${q}”`} /> : null}
    </>
  );
}
