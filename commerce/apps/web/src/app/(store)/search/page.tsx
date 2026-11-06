import Link from 'next/link';
import {Listing, type Search} from '@/components/store/Listing';
import {Icon} from '@/components/store/ui';
import {NAV} from '@/components/store/nav';

export const metadata = {title: 'Search', robots: {index: false}};
/** Hindi and common names people search with, mapped to the English names products are listed under. */
const ALIASES: Record<string, string> = {pukhraj: 'yellow sapphire', neelam: 'blue sapphire', manik: 'ruby', panna: 'emerald', moti: 'pearl', moonga: 'red coral', gomed: 'hessonite', lehsunia: "cat's eye", heera: 'diamond', sphatik: 'clear quartz', rudraksh: 'rudraksha', yantra: 'yantra'};

export default async function SearchPage({searchParams}: {searchParams: Promise<Search>}) {
  const s = await searchParams;
  const raw = typeof s['q'] === 'string' ? s['q'].trim() : '';
  const q = ALIASES[raw.toLowerCase()] ?? raw;
  return (
    <>
      <div className="w" style={{paddingTop: 26}}>
        <form className="card" method="get" action="/search" role="search" style={{padding: 6, display: 'flex', alignItems: 'center', gap: 8, maxWidth: 680}}>
          <span className="ic" aria-hidden="true"><Icon name="search" /></span>
          <label className="sr" htmlFor="q">Search the shop</label>
          <input id="q" name="q" className="in" style={{border: 0, height: 44, flex: 1}} defaultValue={raw} placeholder="Rudraksha, amethyst, Pukhraj, Shree Yantra…" autoFocus={!raw} />
          <button className="btn sm">Search</button>
        </form>
        {q !== raw && <p className="hint" style={{marginTop: 8}}>Showing results for “{q}” ({raw}).</p>}
        {!raw && <div style={{marginTop: 22}}><span className="eyebrow">Browse</span><div className="chips" style={{marginTop: 10, flexWrap: 'wrap'}}>{NAV.map((n) => <Link key={n.href} className="pill" href={n.href}>{n.label}</Link>)}</div></div>}
      </div>
      {raw ? <Listing search={{...s, q}} basePath="/search" title={`Results for “${raw}”`} eyebrow="Search" /> : null}
    </>
  );
}
