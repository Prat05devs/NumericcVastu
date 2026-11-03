import Link from 'next/link';
import {apiGet} from '@/lib/server-api';
import {date} from '@/lib/format';

export const metadata = {title: 'Guides', description: 'Guides to choosing and caring for rudraksha, gemstones, crystals and yantras.'};
export default async function Guides() {
  const list = (await apiGet<{slug: string; title: string; summary: string; author: string; publishedAt: string; isDemo: boolean}[]>('/articles', {revalidate: 300, tags: ['cms']}))?.data ?? [];
  return <div className="wrap" style={{marginTop: '2rem'}}><h1>Guides</h1>{list.length ? <div className="grid cards">{list.map((a) => <Link key={a.slug} className="card" href={`/guides/${a.slug}`}><strong>{a.title}</strong><p className="small muted">{a.summary}</p><span className="small">{a.author} · {date(a.publishedAt)}</span></Link>)}</div> : <p className="muted">Guides are on their way.</p>}</div>;
}
