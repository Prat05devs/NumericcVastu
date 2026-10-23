'use client';
import {useRef, useState} from 'react';
import {Play} from 'lucide-react';

/** Self-hosted video from public/videos. Shows its poster and loads nothing until pressed;
 *  starting one pauses any other playing on the page. */
export default function LocalVideo({src, poster, title, label, className = ''}) {
  const ref = useRef(null);
  const [started, setStarted] = useState(false);
  function onPlay() {
    setStarted(true);
    document.querySelectorAll('video.local-video__el').forEach((v) => { if (v !== ref.current) v.pause(); });
  }
  return <div className={`local-video ${className}`}>
    <video ref={ref} className="local-video__el" src={src} poster={poster} controls={started} preload="none" playsInline onPlay={onPlay} aria-label={title}/>
    {!started && <button type="button" className="local-video__start" onClick={() => ref.current?.play()} aria-label={`Play: ${title}`}>
      <span className="local-video__play" aria-hidden="true"><Play size={22} fill="currentColor"/></span>
      {label && <span className="local-video__label">{label}</span>}
    </button>}
  </div>;
}
