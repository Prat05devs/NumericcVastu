'use client';
import Image from 'next/image';
import {useEffect, useState} from 'react';
import {Pause, Play} from 'lucide-react';

const INTERVAL = 5000;

/** Full-bleed crossfading photo panel with a thumbnail strip as its controls. Pauses on hover/focus, has a visible pause button, and never autoplays under reduced motion. */
export default function HeroSlideshow({slides}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing || held) return;
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % slides.length), INTERVAL);
    return () => window.clearTimeout(timer);
  }, [index, playing, held, slides.length]);

  const running = playing && !held;
  return <div className="hv-stage" role="region" aria-roledescription="carousel" aria-label="Moments from Adarshh’s work" onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)} onFocus={() => setHeld(true)} onBlur={() => setHeld(false)}>
    {slides.map((item, i) => <div key={item.src} className={i === index ? 'hv-stage__slide is-active' : 'hv-stage__slide'} aria-hidden={i !== index}>
      <Image src={item.src} alt={item.alt} fill priority={i === 0} sizes="(max-width: 1080px) 100vw, 55vw" style={{objectPosition: item.position}}/>
    </div>)}
    <div className="hv-stage__dock">
      <p className="hv-stage__label" aria-live={running ? 'off' : 'polite'}><span>{String(index + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</span>{slides[index].label}</p>
      <div className="hv-stage__controls">
        <div className="hv-stage__thumbs">
          {slides.map((item, i) => <button key={item.src} type="button" className={i === index ? 'hv-thumb is-active' : 'hv-thumb'} aria-label={`Show photo ${i + 1} of ${slides.length}: ${item.label}`} aria-current={i === index} onClick={() => setIndex(i)}>
            <Image src={item.src} alt="" fill sizes="72px" style={{objectPosition: item.position}}/>
            {i === index && <i className={running ? 'is-running' : ''} style={running ? {animationDuration: `${INTERVAL}ms`} : undefined}/>}
          </button>)}
        </div>
        <button type="button" className="hv-stage__toggle" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}>{playing ? <Pause size={16}/> : <Play size={16}/>}</button>
      </div>
    </div>
  </div>;
}
