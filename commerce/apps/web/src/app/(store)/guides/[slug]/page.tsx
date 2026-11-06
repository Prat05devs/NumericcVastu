import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {apiGet} from '@/lib/server-api';
import {date} from '@/lib/format';
import {Art} from '@/components/store/ui';

type A = {title: string; summary: string; body: string; author: string; publishedAt: string; isDemo: boolean};
const load = (slug: string) => apiGet<A>(`/articles/${slug}`, {revalidate: 300, tags: ['cms']});
export async function generateMetadata({params}: {params: Promise<{slug: string}>}): Promise<Metadata> {
  const a = (await load((await params).slug))?.data;
  return a ? {title: a.title, description: a.summary, robots: a.isDemo ? {index: false} : undefined} : {};
}
export default async function Guide({params}: {params: Promise<{slug: string}>}) {
  const a = (await load((await params).slug))?.data;
  if (!a) notFound();
  return (
    <div className="w">
      <div className="crumbs"><Link href="/">Home</Link> / <Link href="/guides">Guides</Link> / <b>{a.title}</b></div>
      <article className="article">
        <span className="eyebrow">Guide</span>
        <h1 className="disp" style={{fontSize: 'clamp(34px,4.6vw,50px)', marginTop: 6}}>{a.title}</h1>
        <p className="hint" style={{marginTop: 10}}>By {a.author} · {date(a.publishedAt)}</p>
        <div className="pic" style={{aspectRatio: '16/9', borderRadius: 18, marginTop: 18}}><Art name="rudraksha" /></div>
        {a.body.split(/\n{2,}/).map((p, i) => (/^#+\s/.test(p) ? <h2 key={i}>{p.replace(/^#+\s/, '')}</h2> : <p key={i}>{p}</p>))}
        <div className="callout">Guidance about rudraksha, gemstones, crystals and yantras is traditional and belief-based. It is not medical, financial or legal advice, and no outcome is guaranteed.</div>
        <div className="row" style={{marginTop: 22}}><Link className="btn" href="/shop">Shop the collection</Link><Link className="btn light" href="/#finder">Find your stone</Link></div>
      </article>
    </div>
  );
}
