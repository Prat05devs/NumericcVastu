
import HomePage from '../HomePage';
import {pageMetadata} from '../data/seo';
export const metadata = pageMetadata('/');
export const revalidate = 60;
export default function Page() { return <HomePage />; }
