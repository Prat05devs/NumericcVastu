import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {Listing, type Search} from '@/components/store/Listing';

const FAMILIES: Record<string, {title: string; description: string}> = {
  rudraksha: {title: 'Rudraksha', description: 'Rudraksha beads, malas and bracelets by mukhi, origin and size, with certification status disclosed for every piece.'},
  gemstones: {title: 'Gemstones', description: 'Gemstones with weight, shape, treatment and origin disclosed, and lab reports where available.'},
  crystals: {title: 'Crystals', description: 'Crystal bracelets, towers, clusters, trees and décor, with natural, dyed or stabilised status stated.'},
  yantras: {title: 'Yantras', description: 'Yantras in copper, brass and more, with dimensions and traditional placement guidance.'},
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
  return <Listing category={category} search={await searchParams} basePath={`/${category}`} title={family.title} />;
}
