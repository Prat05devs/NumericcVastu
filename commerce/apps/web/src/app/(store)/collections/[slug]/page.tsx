import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {apiGet} from '@/lib/server-api';
import {Listing, type Search} from '@/components/store/Listing';

type C = {title: string; description: string | null; seo: {title: string; description: string | null}};
export async function generateMetadata({params}: {params: Promise<{slug: string}>}): Promise<Metadata> {
  const c = await apiGet<C>(`/collections/${(await params).slug}?limit=1`);
  return c ? {title: c.data.seo.title, description: c.data.seo.description ?? undefined} : {};
}
export default async function CollectionPage({params, searchParams}: {params: Promise<{slug: string}>; searchParams: Promise<Search>}) {
  const {slug} = await params;
  const c = await apiGet<C>(`/collections/${slug}?limit=1`);
  if (!c) notFound();
  return <Listing collection={slug} search={await searchParams} basePath={`/collections/${slug}`} title={c.data.title} />;
}
