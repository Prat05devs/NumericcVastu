'use client';
import Image from 'next/image';
import {useEffect, useState} from 'react';
import {crop} from '../../lib/crop';

const INTERVAL = 4000;

/** Full-bleed photo panel that crossfades to the next photo every few seconds. Shows a still photo under reduced motion. */
export default function HeroSlideshow({slides}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % slides.length), INTERVAL);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  return <div className="hv-stage">
    {slides.map((item, i) => <div key={item.src} className={i === index ? 'hv-stage__slide is-active' : 'hv-stage__slide'} aria-hidden={i !== index}>
      <Image src={item.src} alt={item.alt} fill priority={i === 0} sizes="(max-width: 1080px) 100vw, 55vw" style={crop(item.src, 4 / 3)}/>
    </div>)}
  </div>;
}
