import LocalizedContent from '../i18n/LocalizedContent';
import Image from 'next/image';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import {book, social, stats} from '../data/media';
import {highlights} from '../data/achievements';
import {PODCAST_CONVERSATIONS} from '../data/podcasts';

/**
 * Who stands behind the guidance on this site: Adarshh Panndey's credentials, with links to verify them.
 * Shown on articles (an "experience and expertise" signal for readers and search engines). It does not claim
 * authorship of the article itself.
 */
export default function AuthorBio() {
  const stat = (label) => stats.find((s) => s.label === label)?.value;
  const top = highlights.slice(0, 2).map((h) => `${h.title} (${h.year})`).join(' and ');
  return <LocalizedContent><aside className="author-bio" aria-labelledby="author-bio-name">
    <Image src="/images/gallery/media-podcast-portrait.webp" width={112} height={112} alt="Adarshh Panndey" className="author-bio__photo"/>
    <div>
      <span className="eyebrow">About the numerologist</span>
      <h2 id="author-bio-name" translate="no">Adarshh Panndey</h2>
      <p>{`Numerologist and Vastu consultant in Rohini, Delhi, and founder of NumericcVaastu. ${stat('Years of practice')} years of practice, ${stat('Consultations')} consultations and ${PODCAST_CONVERSATIONS}+ podcast conversations. Author of ${book.title}; recognised with ${top}.`}</p>
      <p className="author-bio__links">
        <Link href="/about">Full profile <ArrowUpRight size={15}/></Link>
        <Link href="/achievements">Awards <ArrowUpRight size={15}/></Link>
        <a href={social.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn <ArrowUpRight size={15}/></a>
        <a href={social.youtube} target="_blank" rel="noopener noreferrer">YouTube <ArrowUpRight size={15}/></a>
      </p>
    </div>
  </aside></LocalizedContent>;
}
