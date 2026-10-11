'use client';
import {useEffect, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, Play} from 'lucide-react';
import {formatCount, formatTotal} from '../../lib/formatCount';

const showPlaceholders = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_SHOW_MEDIA_PLACEHOLDERS === '1';
const instagramCode = (url = '') => url.match(/instagram\.com\/(?:[\w.]+\/)?(?:reel|reels|p)\/([\w-]+)/)?.[1] || '';

function embedFor(item) {
  if (item.youtubeId) return `https://www.youtube-nocookie.com/embed/${item.youtubeId}?autoplay=1&playsinline=1&rel=0`;
  const code = instagramCode(item.instagramUrl);
  return code ? `https://www.instagram.com/reel/${code}/embed/` : '';
}
function watchUrlFor(item) {
  if (item.youtubeId) return `https://www.youtube.com/watch?v=${item.youtubeId}`;
  const code = instagramCode(item.instagramUrl);
  return code ? `https://www.instagram.com/reel/${code}/` : '';
}
const instagramHandle = (url = '') => url.match(/instagram\.com\/([\w.]+)/)?.[1] || '';
const posterFor = (item) => item.poster || (item.youtubeId ? `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg` : '');

const TABS = [
  {key: 'reels', label: 'Instagram Reels', format: 'tall', platform: 'Instagram'},
  {key: 'podcasts', label: 'Podcasts', format: 'wide', platform: 'YouTube'},
  {key: 'shorts', label: 'YouTube Shorts', format: 'tall', platform: 'YouTube'},
];

/** Poster tile that turns into the real player in place when pressed, like an embedded YouTube card.
 *  Nothing from YouTube or Instagram loads until then. Instagram's embed reports its natural height
 *  through postMessage ("MEASURE"), and the card is sized to it so the embed never overlaps or leaves gaps. */
function VideoTile({item, format, platform, playing, onPlay}) {
  // `embed: false` marks a reel Instagram will not play on other sites; its play button opens Instagram instead.
  const playable = Boolean(embedFor(item)) && item.embed !== false;
  const poster = posterFor(item);
  const watchUrl = watchUrlFor(item);
  const instagram = platform === 'Instagram';
  const [height, setHeight] = useState(null);
  useEffect(() => {
    if (!playing || !instagram) return;
    setHeight(null);
    function onMessage(event) {
      if (!/^https:\/\/www\.instagram\.com$/.test(event.origin)) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'MEASURE' && data.details?.height > 0) setHeight(Math.ceil(data.details.height));
      } catch {}
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [playing, instagram]);
  if (playing) return <div className={`hv-video is-${format} is-playing${instagram ? ' is-instagram' : ''}${instagram && !height ? ' is-loading' : ''}`} style={instagram && height ? {height} : undefined}>
    {instagram && !height && <span className="hv-video__loading" aria-live="polite">Loading reel…</span>}
    <iframe src={embedFor(item)} title={`${item.title} on ${platform}`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen scrolling="no"/>
  </div>;
  return <div className={`hv-video is-${format}`}>
    {poster && <img src={poster} alt="" loading="lazy"/>}
    <span className="hv-video__shade" aria-hidden="true"/>
    {watchUrl
      ? <a className="hv-video__platform" href={watchUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${item.title} on ${platform}`}>{platform} <ArrowUpRight size={13} aria-hidden="true"/></a>
      : <span className="hv-video__platform">{platform}</span>}
    {playable
      ? <button type="button" className="hv-video__play" onClick={onPlay} aria-label={`Play ${item.title}`}><Play size={22} fill="currentColor"/></button>
      : watchUrl
        ? <a className="hv-video__play" href={watchUrl} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${item.title} on ${platform}`}><Play size={22} fill="currentColor"/></a>
        : <span className="hv-video__pending">Link to add</span>}
    <div className="hv-video__meta">
      {item.views > 0 && <span className="hv-video__views"><Play size={13} fill="currentColor" aria-hidden="true"/>{formatCount(item.views)} views</span>}
      <p className="hv-video__title">{item.title}{item.with && <small>with {item.with}</small>}</p>
    </div>
  </div>;
}

/** Account snapshot in the style of an Instagram profile header, built from public profile data. */
function InstagramCard({profile, url}) {
  return <div className="hv-ig">
    <a className="hv-ig__avatar" href={url} target="_blank" rel="noopener noreferrer" aria-label={`@${profile.handle} on Instagram`}><img src={profile.avatar} alt="" width="150" height="150"/></a>
    <div className="hv-ig__body">
      <div className="hv-ig__top">
        <a className="hv-ig__handle" href={url} target="_blank" rel="noopener noreferrer">{profile.handle}{profile.verified && <BadgeCheck size={22} aria-label="Verified account"/>}</a>
        <a className="hv-button hv-button--ig" href={url} target="_blank" rel="noopener noreferrer">Follow on Instagram <ArrowUpRight size={16}/></a>
      </div>
      <p className="hv-ig__name">{profile.name}</p>
      <ul className="hv-ig__counts">{profile.counts.map(([value, label]) => <li key={label}><b>{value}</b> {label}</li>)}</ul>
      <p className="hv-ig__category">{profile.category}</p>
      <p className="hv-ig__bio">{profile.bio.map((line) => <span key={line}>{line}</span>)}</p>
      {profile.link && <a className="hv-ig__link" href={profile.link.href} target="_blank" rel="noopener noreferrer">{profile.link.label}</a>}
    </div>
  </div>;
}

export default function MediaWall({videos, social, instagram, children}) {
  const lists = Object.fromEntries(TABS.map(({key}) => [key, (videos[key] || []).filter((item) => showPlaceholders || embedFor(item))]));
  const tabs = TABS.filter(({key}) => lists[key].length);
  const [active, setActive] = useState(tabs[0]?.key);
  const [playing, setPlaying] = useState(null);
  const rail = useRef(null);
  if (!tabs.length) return null;
  const tab = tabs.find(({key}) => key === active) || tabs[0];
  const totalViews = lists[tab.key].reduce((sum, item) => sum + (item.views || 0), 0);
  const scroll = (direction) => rail.current?.scrollBy({left: direction * rail.current.clientWidth * .8, behavior: 'smooth'});
  function onKey(event, i) {
    const next = event.key === 'ArrowRight' ? i + 1 : event.key === 'ArrowLeft' ? i - 1 : null;
    if (next === null) return;
    const target = tabs[(next + tabs.length) % tabs.length];
    setActive(target.key);
    setPlaying(null);
    document.getElementById(`hv-tab-${target.key}`)?.focus();
  }
  return <section className="hv-section hv-watch" id="watch" aria-labelledby="hv-watch-title">
    <div className="hv-wrap">
    {children}
    {instagram && social.instagram && <InstagramCard profile={instagram} url={social.instagram}/>}
    <div className="hv-watch__bar">
      <div className="hv-tabs" role="tablist" aria-label="Video type">
        {tabs.map((item, i) => <button key={item.key} id={`hv-tab-${item.key}`} type="button" role="tab" aria-selected={item.key === tab.key} aria-controls="hv-watch-panel" tabIndex={item.key === tab.key ? 0 : -1} onClick={() => { setActive(item.key); setPlaying(null); }} onKeyDown={(event) => onKey(event, i)}>
          {item.label}<span>{lists[item.key].length}</span>
        </button>)}
      </div>
      {totalViews > 0 && <p className="hv-watch__total"><b>{formatTotal(totalViews)}</b> views across these {lists[tab.key].length} {tab.key === 'reels' ? 'reels' : 'videos'}</p>}
      <div className="hv-watch__arrows">
        <button type="button" className="hv-round" onClick={() => scroll(-1)} aria-label="Scroll videos left"><ArrowLeft size={18}/></button>
        <button type="button" className="hv-round" onClick={() => scroll(1)} aria-label="Scroll videos right"><ArrowRight size={18}/></button>
      </div>
    </div>
    <div id="hv-watch-panel" role="tabpanel" aria-labelledby={`hv-tab-${tab.key}`} className={`hv-watch__rail is-${tab.format}`} ref={rail} key={tab.key}>
      {lists[tab.key].map((item, i) => <VideoTile key={`${tab.key}-${i}`} item={item} format={tab.format} platform={tab.platform} playing={playing === `${tab.key}-${i}`} onPlay={() => setPlaying(`${tab.key}-${i}`)}/>)}
    </div>
    {((social.instagram && !instagram) || social.youtube) && <div className="hv-watch__follow">
      {social.instagram && !instagram && <a className="hv-button hv-button--ghost" href={social.instagram} target="_blank" rel="noopener noreferrer">Follow {instagramHandle(social.instagram) ? `@${instagramHandle(social.instagram)}` : ''} on Instagram <ArrowUpRight size={17}/></a>}
      {social.youtube && <a className="hv-button hv-button--ghost" href={social.youtube} target="_blank" rel="noopener noreferrer">Subscribe on YouTube <ArrowUpRight size={17}/></a>}
    </div>}
    </div>
  </section>;
}
