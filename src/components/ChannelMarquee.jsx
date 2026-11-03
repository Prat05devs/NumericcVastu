import LocalizedContent from '../i18n/LocalizedContent';
import Image from 'next/image';
import Link from 'next/link';
import {ArrowUpRight, Instagram, Youtube} from 'lucide-react';
import {appearances, channels as allChannels, featuredChannels} from '../data/podcasts';
import {formatCount, formatTotal} from '../lib/formatCount';
import {MOVE_FROM} from '../data/featured';

const MIN_PER_LOOP = 10; // items per half of the loop: wide enough for the 1400px band

/**
 * YouTube channel and Instagram page logos, like a "trusted by" band. Two rows move in opposite directions; each row is
 * rendered twice for a seamless loop, and the copy is hidden from assistive tech. Logos are muted until hovered
 * (in full colour on touch screens). Motion stops for visitors who prefer reduced motion.
 */
export function ChannelMarquee({channels = featuredChannels, rows: rowCount = 2, size = 'lg'}) {
  const items = channels.map((c) => ({...c, platform: c.platform ?? 'youtube', audience: c.audience ?? c.subscribers ?? c.followers, logo: c.logo ?? `/images/channels/${c.slug}.webp`}));
  // A single short row stays still: a few logos repeating on a loop looks thin.
  const moving = rowCount === 2 || items.length >= MOVE_FROM;
  const item = (c, hidden, key) => {
    const Icon = c.platform === 'instagram' ? Instagram : Youtube;
    return <li key={key} className="ch-item" aria-hidden={hidden ? 'true' : undefined}>
      <span className="ch-mark">
        <span className="ch-logo"><Image src={c.logo} alt="" width={160} height={160} sizes={size === 'lg' ? '104px' : '72px'}/></span>
        <span className={`ch-badge ch-badge--${c.platform}`} aria-hidden="true"><Icon size={size === 'lg' ? 14 : 11} strokeWidth={2.4}/></span>
      </span>
      <span className="ch-name" translate="no">{c.name}<span className="sr-only">{c.platform === 'instagram' ? ' on Instagram' : ' on YouTube'}</span></span>
      <span className="ch-subs">{`${formatCount(c.audience)} ${c.platform === 'instagram' ? 'followers' : 'subscribers'}`}</span>
    </li>;
  };
  const label = 'Channels and pages Adarshh Panndey has been featured on';
  if (!moving) return <LocalizedContent><div className={`ch-band ch-band--${size} is-static`} role="group" aria-label={label}>
    <ul className="ch-list ch-list--static">{items.map((c, i) => item(c, false, i))}</ul>
  </div></LocalizedContent>;
  // Two rows alternate items so both mix the biggest and smaller names.
  const rows = rowCount === 1 ? [items] : [items.filter((_, i) => i % 2 === 0), items.filter((_, i) => i % 2 === 1)];
  // A short row is repeated so each half of the loop is wider than the screen; repeats are hidden from screen readers.
  const half = (row) => Array.from({length: Math.max(1, Math.ceil(MIN_PER_LOOP / row.length))}, () => row).flat();
  return <LocalizedContent><div className={`ch-band ch-band--${size}`} role="group" aria-label={label}>
    {rows.map((row, r) => <div key={r} className={r ? 'ch-row is-reverse' : 'ch-row'}>
      <div className="ch-track">
        <ul className="ch-list">{half(row).map((c, i) => item(c, i >= row.length, i))}</ul>
        <ul className="ch-list" aria-hidden="true">{half(row).map((c, i) => item(c, false, i))}</ul>
      </div>
    </div>)}
  </div></LocalizedContent>;
}

/** Heading, moving band and a short factual summary: used on the home and About pages. */
export default function FeaturedChannels({headingId = 'featured-channels', channels = featuredChannels, rows = 2}) {
  const total = allChannels.reduce((s, c) => s + c.subscribers, 0);
  return <LocalizedContent><section className="ch-section" aria-labelledby={headingId}>
    <div className="ch-head">
      <span className="hv-eyebrow">As heard on</span>
      <h2 id={headingId}>Featured on India’s <em>{channels.some((c) => c.platform === 'instagram') ? 'leading podcasts and pages.' : 'leading podcasts.'}</em></h2>
      <p>{`${appearances.length}+ guest episodes on channels with ${formatTotal(total)} subscribers between them.`}</p>
    </div>
    <ChannelMarquee channels={channels} rows={rows}/>
    <p className="ch-foot"><Link href="/podcasts" className="hv-link">Watch the episodes <ArrowUpRight size={17}/></Link></p>
  </section></LocalizedContent>;
}
