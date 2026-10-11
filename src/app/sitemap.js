import {courses,consultations} from '../data/offers';
import {posts} from '../data/content';
const origin=process.env.NEXT_PUBLIC_SITE_URL||'https://numericcvaastu.com';
export default function sitemap(){const paths=['','/about','/courses','/consultations','/book-consultation','/numerology-calculator','/gallery','/blog','/contact','/faq','/sitemap',...courses.map(x=>`/courses/${x.slug}`),...consultations.map(x=>`/consultations/${x.slug}`),...posts.map(x=>`/blog/${x.slug}`)];return paths.map(path=>({url:`${origin}${path}`,changeFrequency:'monthly',priority:path===''?1:0.7}))}
