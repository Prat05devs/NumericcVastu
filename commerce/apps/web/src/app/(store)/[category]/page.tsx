import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {Listing, type Search} from '@/components/store/Listing';

const FAMILIES: Record<string, {title: string; description: string; intro: string}> = {
  rudraksha: {title: 'Rudraksha', description: 'Rudraksha beads, malas and bracelets by mukhi, origin and size, with certification status disclosed for every piece.', intro: 'Beads, malas and bracelets by mukhi, origin and size. Delivery is included in every price.'},
  gemstones: {title: 'Gemstones', description: 'Gemstones with weight, shape, treatment and origin disclosed, and lab reports where available.', intro: 'Each stone lists its weight, origin and treatment. Delivery is included in every price.'},
  crystals: {title: 'Crystals', description: 'Crystal bracelets, towers, clusters, trees and décor, with natural, dyed or stabilised status stated.', intro: 'Bracelets, towers, clusters and raw pieces, with natural, dyed or stabilised status always stated.'},
  yantras: {title: 'Yantras', description: 'Yantras in copper, brass and more, with dimensions and traditional placement guidance.', intro: 'Yantras in copper, brass and more, with size and traditional placement guidance.'},
};

export async function generateMetadata({params}: {params: Promise<{category: string}>}): Promise<Metadata> {
  const {category} = await params;
  const f = FAMILIES[category];
  return f ? {title: f.title, description: f.description, alternates: {canonical: `/${category}`}} : {};
}

export default async function CategoryPage({params, searchParams}: {params: Promise<{category: string}>; searchParams: Promise<Search>}) {
  const {category} = await params;
  const family = FAMILIES[category];
  if (!family) notFound();
  const search = await searchParams;
  const bracelets = category === 'crystals' && String(search['attr_product_form'] ?? '').toLowerCase() === 'bracelet';
  return <Listing category={category} search={search} basePath={`/${category}`} title={bracelets ? 'Bracelets' : family.title} intro={bracelets ? 'Hand-strung bracelets in natural stone, each listed with its bead size, origin and treatment. Delivery is included in every price.' : family.intro} />;
}
