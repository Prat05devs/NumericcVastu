'use client';
import {useEffect, useRef, useState} from 'react';

/**
 * A silent, endlessly looping background film. Files live in /public/videos/bg as
 * `<name>-1600.mp4` (desktop), `<name>-854.mp4` (phones) and `<name>-poster.jpg`; all are
 * encoded without an audio track, so nothing can ever play sound.
 *
 * - No controls, no pause: it is decoration, hidden from assistive technology.
 * - Sections further down the page only start downloading when they come near the screen.
 * - Visitors who ask their device for reduced motion see the still poster instead.
 */
export default function VideoBackdrop({name, eager = false, className = ''}) {
  const ref = useRef(null);
  const [load, setLoad] = useState(eager);

  useEffect(() => {
    if (load) return;
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) { setLoad(true); return; }
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setLoad(true); io.disconnect(); } }, {rootMargin: '600px 0px'});
    io.observe(el);
    return () => io.disconnect();
  }, [load]);

  useEffect(() => {
    const video = ref.current;
    if (!video || !load) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    // React does not write the `muted` attribute into server HTML, and browsers only autoplay muted video.
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute('muted', '');
    video.load();
    const play = () => video.play().catch(() => {});
    play();
    // Some phones pause background video when the tab is hidden; resume when it returns.
    const resume = () => { if (!document.hidden && video.paused) play(); };
    document.addEventListener('visibilitychange', resume);
    return () => document.removeEventListener('visibilitychange', resume);
  }, [load]);

  const base = `/videos/bg/${name}`;
  return <video
    ref={ref}
    className={`vb-video ${className}`}
    poster={`${base}-poster.jpg`}
    muted
    loop
    playsInline
    autoPlay
    preload={eager ? 'auto' : 'none'}
    disablePictureInPicture
    disableRemotePlayback
    controls={false}
    tabIndex={-1}
    aria-hidden="true"
  >
    {load && <>
      <source src={`${base}-854.mp4`} type="video/mp4" media="(max-width: 800px)"/>
      <source src={`${base}-1600.mp4`} type="video/mp4"/>
    </>}
  </video>;
}
