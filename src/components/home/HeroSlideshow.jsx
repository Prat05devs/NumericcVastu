'use client';
import LocalizedContent from '../../i18n/LocalizedContent';

import Image from 'next/image';
import {useEffect, useState} from 'react';
import {crop} from '../../lib/crop';

const INTERVAL = 4000;

/**
 * Full-bleed photo panel that crossfades to the next photo every few seconds. Shows a still photo under reduced motion.
 * Only the first photo is in the page as sent; the rest load one slide ahead, after the page has finished loading, so
 * they never compete with the first photo (the page's main image) on a slow connection.
 */
export default function HeroSlideshow({slides}) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (document.readyState === 'complete') { setLoaded(true); return; }
    const onLoad = () => setLoaded(true);
    window.addEventListener('load', onLoad, {once: true});
    return () => window.removeEventListener('load', onLoad);
  }, []);

  useEffect(() => {
    if (!loaded || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % slides.length), INTERVAL);
    return () => window.clearInterval(timer);
  }, [loaded, slides.length]);

  // Slides shown so far stay mounted (no reload when the show loops); the next one is mounted ahead of its turn.
  const [reached, setReached] = useState(1);
  useEffect(() => { if (loaded) setReached((r) => Math.max(r, Math.min(slides.length, index + 2))); }, [loaded, index, slides.length]);

  return <LocalizedContent><div className="hv-stage">
    {slides.map((item, i) => <div key={item.src} className={i === index ? 'hv-stage__slide is-active' : 'hv-stage__slide'} aria-hidden={i !== index}>
      {i < reached && <Image src={item.src} alt={item.alt} fill priority={i === 0} sizes="(max-width: 1080px) 100vw, 55vw" style={crop(item.src, 4 / 3)}/>}
    </div>)}
  </div></LocalizedContent>;
}
