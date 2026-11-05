import {courses,consultations} from '../data/offers';
import {posts} from '../data/content';
import {locations} from '../data/locations';
import {siteUrl} from '../lib/site';

/** Date of the last substantial site-wide content update. Change it when page content changes, not on every deploy. */
const UPDATED='2026-11-02';
const portraits=['/images/gallery/media-podcast-studio.webp','/images/gallery/portrait-standing.webp','/images/adarshh/adarshh-pandey-with-book.webp'].map(src=>`${siteUrl}${src}`);

export default function sitemap(){
  const entry=(path,priority,extra={})=>({url:`${siteUrl}${path}`,lastModified:UPDATED,changeFrequency:'monthly',priority,...extra});
  return [
    entry('',1,{changeFrequency:'weekly',images:portraits}),
    entry('/about',0.9,{images:portraits}),
    ...locations.map(l=>entry(`/${l.slug}`,0.9)),
    entry('/consultations',0.9),
    ...consultations.map(x=>entry(`/consultations/${x.slug}`,0.8)),
    entry('/courses',0.9),
    ...courses.map(x=>entry(`/courses/${x.slug}`,0.8)),
    entry('/numerology-calculator',0.8),
    entry('/vedic-numerology-calculator',0.8),
    entry('/book-consultation',0.7),
    entry('/contact',0.8),
    entry('/achievements',0.7),
    entry('/podcasts',0.7,{changeFrequency:'weekly'}),
    entry('/predictions',0.7,{changeFrequency:'weekly'}),
    entry('/testimonials',0.7),
    entry('/gallery',0.6),
    entry('/faq',0.7),
    entry('/blog',0.6),
    ...posts.map(x=>entry(`/blog/${x.slug}`,0.6,{lastModified:x.date})),
    entry('/sitemap',0.3),
  ];
}
