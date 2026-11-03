import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {apiGet} from '@/lib/server-api';
import {date} from '@/lib/format';
import {Blocks, type Block} from '@/components/store/Blocks';

type Page = {title: string; blocks: Block[]; seo: {title: string; description: string | null}; updatedAt: string};
const load = (slug: string) => apiGet<Page>(`/pages/${slug}`, {revalidate: 300, tags: ['cms']});
export async function generateMetadata({params}: {params: Promise<{slug: string}>}): Promise<Metadata> {
  const p = (await load((await params).slug))?.data;
  return p ? {title: p.seo.title, description: p.seo.description ?? undefined} : {title: 'Policy'};
}
export default async function PolicyPage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params;
  const p = (await load(slug))?.data;
  if (!p) notFound(); // policies appear only after legal review and publication in the back office
  return <article className="wrap" style={{marginTop: '2rem', maxWidth: '75ch'}}><h1>{p.title}</h1><Blocks blocks={p.blocks} /><p className="small muted">Last updated {date(p.updatedAt)}</p></article>;
}
