
import LocalizedContent from '../../i18n/LocalizedContent';
import Breadcrumbs from '../../components/Breadcrumbs';
import Link from 'next/link';
import {ArrowUpRight, Mic} from 'lucide-react';
import {SiteFooter} from '../../components/SiteChrome';
import PodcastList from '../../components/PodcastList';
import {ChannelMarquee} from '../../components/ChannelMarquee';
import YouTubeInline from '../../components/YouTubeInline';
import WhatsAppIcon from '../../components/WhatsAppIcon';
import FloatingNumbers from '../../components/FloatingNumbers';
import {appearances, ownShow, TOPICS, PODCAST_CONVERSATIONS} from '../../data/podcasts';
import {contact} from '../../data/contact';
import {formatCount, formatTotal} from '../../lib/formatCount';
import {pageMetadata} from '../../data/seo';

import {siteUrl as origin} from '../../lib/site';
const featured = appearances[0];
const totalViews = appearances.reduce((s, e) => s + e.views, 0);
const hours = Math.round((appearances.reduce((s, e) => s + e.minutes, 0) + ownShow.reduce((s, e) => s + e.minutes, 0)) / 60);
const shows = [...new Set(appearances.map((e) => e.show))];
const invite = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent('Namaste Adarshh ji 🙏\n\nWe would love to invite you as a guest on our podcast.\n\n*Show:* \n*Host:* \n*Topic idea:* \n*Preferred dates:* \n\n— Sent from numericcvaastu.com')}`;

export const metadata = pageMetadata('/podcasts', {description: `Watch numerologist Adarshh Panndey on ${shows.length} podcasts, including Podcast Baba, RSR Podcast and Kadak Chai Show: mobile numbers, names and predictions.`});

export default function Page() {
  const ld = {'@context': 'https://schema.org', '@type': 'ItemList', name: 'Podcasts featuring Adarshh Panndey', itemListElement: appearances.map((e, i) => ({'@type': 'ListItem', position: i + 1, item: {'@type': 'VideoObject', name: `${e.title} | ${e.show}`, description: e.points[0], thumbnailUrl: `${origin}/images/podcasts/${e.id}.webp`, uploadDate: e.date, embedUrl: `https://www.youtube.com/embed/${e.id}`, url: `https://www.youtube.com/watch?v=${e.id}`}}))};
  return <LocalizedContent><>
    <main id="main" className="hv pc-page">
      <section className="pc-hero">
        <div className="hv-wrap"><Breadcrumbs className="breadcrumbs hv-crumbs" items={[["Podcasts","/podcasts"]]}/></div>
        <div className="hv-wrap pc-hero__grid">
          <div className="pc-hero__copy">
            <span className="hv-eyebrow">As heard on</span>
            <h1>Adarshh Panndey, <em>on India’s podcasts.</em></h1>
            <p>Conversations on numerology, mobile numbers, names, remedies and the predictions people keep coming back to, with hosts across India.</p>
            <ul className="pc-stats">
              <li><strong data-count>{PODCAST_CONVERSATIONS}+</strong>podcast conversations</li>
              <li><strong data-count>{formatTotal(totalViews)}</strong>views on guest episodes</li>
              <li><strong data-count>{hours}+</strong>hours on record</li>
            </ul>
          </div>
          <figure className="pc-featured">
            <YouTubeInline id={featured.id} title={`${featured.title} — ${featured.show}`} poster={`/images/podcasts/${featured.id}.webp`} label={`${formatCount(featured.views)} views`}/>
            <figcaption><b>Most watched · {featured.show}</b>{featured.title}</figcaption>
          </figure>
        </div>
        <div className="pc-shows"><ChannelMarquee size="sm"/></div>
      </section>

      <section className="hv-section hv-wrap" aria-labelledby="pc-all">
        <div className="hv-head"><div><span className="hv-eyebrow">Guest appearances</span><h2 id="pc-all">Every episode, <em>and what he shared.</em></h2></div><div className="hv-head__aside"><p>Press play to watch here, or filter by what you want to learn about.</p></div></div>
        <PodcastList episodes={appearances} topics={TOPICS}/>
      </section>

      <section className="hv-section hv-tint" aria-labelledby="pc-own">
        <div className="hv-wrap">
          <div className="hv-head"><div><span className="hv-eyebrow">His own show</span><h2 id="pc-own">Conversations <em>he hosts.</em></h2></div><div className="hv-head__aside"><p>On his channel, Adarshh talks to actors, healers, astrologers and coaches.</p><a className="hv-link" href="https://www.youtube.com/@Numerologistadarshpandey/podcasts" target="_blank" rel="noopener noreferrer">All episodes on YouTube <ArrowUpRight size={16}/></a></div></div>
          <ul className="pc-own">
            {ownShow.map((e) => <li key={e.id}>
              <YouTubeInline id={e.id} title={`${e.title} with ${e.guest}`} poster={`/images/podcasts/${e.id}.webp`}/>
              <p className="pc-own__guest"><Mic size={14} aria-hidden="true"/>with {e.guest}</p>
              <h3>{e.title}</h3>
              <p className="pc-own__meta">{e.minutes} min{e.views >= 1000 ? ` · ${formatCount(e.views)} views` : ''}</p>
            </li>)}
          </ul>
        </div>
      </section>

      <section className="pc-invite">
        <FloatingNumbers/>
        <div className="hv-wrap pc-invite__inner">
          <div>
            <span className="hv-eyebrow">For hosts</span>
            <h2>Invite Adarshh <em>on your podcast.</em></h2>
            <p>Numerology for your audience: birth dates, names, mobile numbers, the year ahead, and live readings of your guests or celebrities.</p>
          </div>
          <div className="hv-actions">
            <a className="hv-button hv-button--whatsapp" href={invite} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={20}/> Send an invitation</a>
            <Link className="hv-button hv-button--light" href="/book-consultation">Book a consultation <ArrowUpRight size={18}/></Link>
          </div>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(ld).replace(/</g, '\\u003c')}}/>
    </main>
    <SiteFooter/>
  </></LocalizedContent>;
}
