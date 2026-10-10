'use client';
import {useRef, useState} from 'react';
import {ArrowLeft, ArrowRight, ArrowUpRight, Play} from 'lucide-react';

const showPlaceholders = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_SHOW_MEDIA_PLACEHOLDERS === '1';
const instagramCode = (url = '') => url.match(/instagram\.com\/(?:reel|reels|p)\/([\w-]+)/)?.[1] || '';

function embedFor(item) {
  if (item.youtubeId) return `https://www.youtube-nocookie.com/embed/${item.youtubeId}?autoplay=1&playsinline=1&rel=0`;
  const code = instagramCode(item.instagramUrl);
  return code ? `https://www.instagram.com/reel/${code}/embed/` : '';
}
const posterFor = (item) => item.poster || (item.youtubeId ? `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg` : '');

const TABS = [
  {key: 'podcasts', label: 'Podcasts', format: 'wide', platform: 'YouTube'},
  {key: 'shorts', label: 'YouTube Shorts', format: 'tall', platform: 'YouTube'},
  {key: 'reels', label: 'Instagram Reels', format: 'tall', platform: 'Instagram'},
];

/** Poster tiles that load the real YouTube or Instagram player only when pressed, so nothing third-party loads until a visitor asks for it. */
function VideoTile({item, format, platform}) {
  const [playing, setPlaying] = useState(false);
  const src = embedFor(item);
  const poster = posterFor(item);
  if (playing && src) return <div className={`hv-video is-${format} is-playing`}>
    <iframe src={src} title={`${item.title} on ${platform}`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy"/>
  </div>;
  return <div className={`hv-video is-${format}`}>
    {poster && <img src={poster} alt="" loading="lazy"/>}
    <span className="hv-video__shade" aria-hidden="true"/>
    <span className="hv-video__platform">{platform}</span>
    {src
      ? <button type="button" className="hv-video__play" onClick={() => setPlaying(true)} aria-label={`Play ${item.title} on ${platform}`}><Play size={22} fill="currentColor"/></button>
      : <span className="hv-video__pending">Link to add</span>}
    <p className="hv-video__title">{item.title}</p>
  </div>;
}

export default function MediaWall({videos, social, children}) {
  const lists = Object.fromEntries(TABS.map(({key}) => [key, (videos[key] || []).filter((item) => showPlaceholders || embedFor(item))]));
  const tabs = TABS.filter(({key}) => lists[key].length);
  const [active, setActive] = useState(tabs[0]?.key);
  const rail = useRef(null);
  if (!tabs.length) return null;
  const tab = tabs.find(({key}) => key === active) || tabs[0];
  const scroll = (direction) => rail.current?.scrollBy({left: direction * rail.current.clientWidth * .8, behavior: 'smooth'});
  function onKey(event, i) {
    const next = event.key === 'ArrowRight' ? i + 1 : event.key === 'ArrowLeft' ? i - 1 : null;
    if (next === null) return;
    const target = tabs[(next + tabs.length) % tabs.length];
    setActive(target.key);
    document.getElementById(`hv-tab-${target.key}`)?.focus();
  }
  return <section className="hv-section hv-watch" id="watch" aria-labelledby="hv-watch-title">
    <div className="hv-wrap">
    {children}
    <div className="hv-watch__bar">
      <div className="hv-tabs" role="tablist" aria-label="Video type">
        {tabs.map((item, i) => <button key={item.key} id={`hv-tab-${item.key}`} type="button" role="tab" aria-selected={item.key === tab.key} aria-controls="hv-watch-panel" tabIndex={item.key === tab.key ? 0 : -1} onClick={() => setActive(item.key)} onKeyDown={(event) => onKey(event, i)}>
          {item.label}<span>{lists[item.key].length}</span>
        </button>)}
      </div>
      <div className="hv-watch__arrows">
        <button type="button" className="hv-round" onClick={() => scroll(-1)} aria-label="Scroll videos left"><ArrowLeft size={18}/></button>
        <button type="button" className="hv-round" onClick={() => scroll(1)} aria-label="Scroll videos right"><ArrowRight size={18}/></button>
      </div>
    </div>
    <div id="hv-watch-panel" role="tabpanel" aria-labelledby={`hv-tab-${tab.key}`} className={`hv-watch__rail is-${tab.format}`} ref={rail} key={tab.key}>
      {lists[tab.key].map((item, i) => <VideoTile key={`${tab.key}-${i}`} item={item} format={tab.format} platform={tab.platform}/>)}
    </div>
    {(social.instagram || social.youtube) && <div className="hv-watch__follow">
      {social.instagram && <a className="hv-button hv-button--ghost" href={social.instagram} target="_blank" rel="noopener noreferrer">Follow on Instagram <ArrowUpRight size={17}/></a>}
      {social.youtube && <a className="hv-button hv-button--ghost" href={social.youtube} target="_blank" rel="noopener noreferrer">Subscribe on YouTube <ArrowUpRight size={17}/></a>}
    </div>}
    </div>
  </section>;
}
