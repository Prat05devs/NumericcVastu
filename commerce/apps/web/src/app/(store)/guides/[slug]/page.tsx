import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {apiGet} from '@/lib/server-api';
import {date} from '@/lib/format';

type A = {title: string; summary: string; body: string; author: string; publishedAt: string; isDemo: boolean};
const load = (slug: string) => apiGet<A>(`/articles/${slug}`, {revalidate: 300, tags: ['cms']});
export async function generateMetadata({params}: {params: Promise<{slug: string}>}): Promise<Metadata> {
  const a = (await load((await params).slug))?.data;
  return a ? {title: a.title, description: a.summary, robots: a.isDemo ? {index: false} : undefined} : {};
}
export default async function Guide({params}: {params: Promise<{slug: string}>}) {
  const a = (await load((await params).slug))?.data;
  if (!a) notFound();
  return <article className="wrap" style={{marginTop: '2rem', maxWidth: '75ch'}}><h1>{a.title}</h1><p className="small muted">{a.author} · {date(a.publishedAt)}</p>{a.body.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</article>;
}
