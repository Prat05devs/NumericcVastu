import {Listing, type Search} from '@/components/store/Listing';

export const metadata = {title: 'Shop all', alternates: {canonical: '/shop'}};
export default async function Shop({searchParams}: {searchParams: Promise<Search>}) {
  return <Listing search={await searchParams} basePath="/shop" title="Shop all" />;
}
