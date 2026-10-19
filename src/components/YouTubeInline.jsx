'use client';
import {useState} from 'react';
import {Play} from 'lucide-react';

/** Local poster that turns into the YouTube player in place when pressed. Nothing loads from YouTube before that. */
export default function YouTubeInline({id, title, poster, tall = false, className = '', label}) {
  const [playing, setPlaying] = useState(false);
  return <div className={`yt-inline ${tall ? 'is-tall' : 'is-wide'} ${className}`}>
    {playing
      ? <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`} title={title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen/>
      : <button type="button" onClick={() => setPlaying(true)} aria-label={`Play: ${title}`}>
        <img src={poster} alt="" loading="lazy"/>
        <span className="yt-inline__play" aria-hidden="true"><Play size={22} fill="currentColor"/></span>
        {label && <span className="yt-inline__label">{label}</span>}
      </button>}
  </div>;
}
