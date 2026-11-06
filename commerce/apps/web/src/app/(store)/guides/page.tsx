import Link from 'next/link';
import {apiGet} from '@/lib/server-api';
import {date} from '@/lib/format';
import {Art} from '@/components/store/ui';

export const metadata = {title: 'Guides', description: 'Guides to choosing and caring for rudraksha, gemstones, crystals and yantras.'};
const ARTS = ['rudraksha', 'gem-yellow', 'cluster', 'yantra', 'bracelet-rose', 'gem-blue'];
export default async function Guides() {
  const list = (await apiGet<{slug: string; title: string; summary: string; author: string; publishedAt: string; isDemo: boolean}[]>('/articles', {revalidate: 300, tags: ['cms']}))?.data ?? [];
  return (
    <div className="w" style={{paddingTop: 26}}>
      <div className="lhead"><span className="eyebrow">Guides</span><h1 className="disp">Before you buy</h1><p>Plain guides to choosing, wearing and caring for rudraksha, gemstones, crystals and yantras.</p></div>
      {list.length ? <div className="journal">{list.map((a, i) => <Link key={a.slug} className="post" href={`/guides/${a.slug}`}><div className="pic"><Art name={ARTS[i % ARTS.length]!} /></div><span className="t"><span>{a.author} · {date(a.publishedAt)}</span><b>{a.title}</b><span style={{display: 'block', textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'var(--muted)', fontSize: 14, marginTop: 8}}>{a.summary}</span></span></Link>)}</div>
        : <div className="card empty"><span className="pic"><Art name="rudraksha" /></span><h2 className="disp">Guides are on their way</h2><p className="muted">Adarshh’s first guides are being written.</p></div>}
    </div>
  );
}
