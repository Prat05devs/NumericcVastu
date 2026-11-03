import type {MetadataRoute} from 'next';
import {apiGet} from '@/lib/server-api';

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed = ['', '/shop', '/rudraksha', '/gemstones', '/crystals', '/yantras', '/custom-wristwatch', '/guides', '/consultation', '/track'].map((p) => ({url: `${site}${p}`, changeFrequency: 'daily' as const}));
  const products: {slug: string; isDemo: boolean}[] = [];
  let cursor: string | null | undefined;
  for (let i = 0; i < 40; i++) {
    const page = await apiGet<{slug: string; isDemo: boolean}[]>(`/products?limit=50${cursor ? `&cursor=${cursor}` : ''}`, {revalidate: 3600});
    if (!page) break;
    products.push(...page.data);
    cursor = page.meta.nextCursor;
    if (!cursor) break;
  }
  const guides = (await apiGet<{slug: string; isDemo: boolean}[]>('/articles', {revalidate: 3600}))?.data ?? [];
  return [...fixed, ...products.filter((p) => !p.isDemo).map((p) => ({url: `${site}/products/${p.slug}`})), ...guides.filter((g) => !g.isDemo).map((g) => ({url: `${site}/guides/${g.slug}`}))];
}
