'use client';
import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {ArrowLeft, ArrowRight, ArrowUpRight} from 'lucide-react';

const INTERVAL = 7000;
// Order around the centre: left column top→bottom, then right column top→bottom.
const SLOTS = ['l1', 'l2', 'l3', 'r1', 'r2', 'r3'];

/**
 * Consultations hero: one consultation in the centre, six everyday situations around it, each joined to the
 * centre by a connector with an arrowhead. Connectors are measured from the real box positions, so they stay
 * accurate at every width. Autoplays, pauses on hover/focus, and never autoplays under reduced motion.
 */
export default function ConsultScenarios({slides}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true); // false only under reduced motion
  const [held, setHeld] = useState(false);
  const [lines, setLines] = useState([]);
  const stage = useRef(null);
  const centre = useRef(null);
  const boxes = useRef([]);
  const chips = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(false);
  }, []);
  useEffect(() => {
    if (!playing || held) return;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % slides.length), INTERVAL);
    return () => window.clearTimeout(t);
  }, [index, playing, held, slides.length]);
  // Keep the active chip visible in its scrolling row.
  useEffect(() => {
    const row = chips.current, chip = row?.children[index];
    if (row && chip) row.scrollTo({left: chip.offsetLeft - row.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth'});
  }, [index]);

  const measure = useCallback(() => {
    const st = stage.current?.getBoundingClientRect(), cr = centre.current?.getBoundingClientRect();
    if (!st || !cr || window.innerWidth < 900) return setLines([]);
    // Large screens apply CSS zoom to <html>: rects come back zoomed, SVG coordinates are not.
    const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    const scale = (r) => ({left: r.left / z, right: r.right / z, top: r.top / z, bottom: r.bottom / z, width: r.width / z, height: r.height / z});
    const s = scale(st), c = scale(cr);
    setLines(boxes.current.map((el, i) => {
      if (!el) return null;
      const b = scale(el.getBoundingClientRect());
      const left = i < 3;
      const x1 = (left ? b.right : b.left) - s.left, y1 = b.top + b.height / 2 - s.top;
      const x2 = (left ? c.left - 10 : c.right + 10) - s.left;
      // Spread arrow tips down each side of the centre card: top, middle and bottom box → 25%, 50%, 75%.
      const y2 = c.top + c.height * [0.25, 0.5, 0.75][i % 3] - s.top;
      const mx = (x1 + x2) / 2;
      return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
    }).filter(Boolean));
  }, []);
  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (stage.current) ro.observe(stage.current);
    return () => ro.disconnect();
  }, [measure, index]);

  const slide = slides[index];
  const go = (n) => setIndex((n + slides.length) % slides.length);
  return <div className="cs" role="region" aria-roledescription="carousel" aria-label="Which consultation fits your situation" onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)} onFocus={() => setHeld(true)} onBlur={() => setHeld(false)}>
    <div className="cs__bar">
      <div className="cs__chips" ref={chips} role="tablist" aria-label="Consultations">
        {slides.map((s, i) => <button key={s.id} type="button" role="tab" aria-selected={i === index} className={i === index ? 'is-active' : ''} onClick={() => go(i)}>{s.short}</button>)}
      </div>
      <div className="cs__nav">
        <button type="button" className="hv-round" onClick={() => go(index - 1)} aria-label="Previous consultation"><ArrowLeft size={18}/></button>
        <span className="cs__count"><b>{index + 1}</b> / {slides.length}</span>
        <button type="button" className="hv-round" onClick={() => go(index + 1)} aria-label="Next consultation"><ArrowRight size={18}/></button>
      </div>
    </div>

    <div className="cs__stage" ref={stage} key={slide.id} aria-live={playing && !held ? 'off' : 'polite'}>
      <svg className="cs__lines" aria-hidden="true">
        <defs><marker id="cs-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z"/></marker></defs>
        {lines.map((d, i) => <path key={i} d={d} markerEnd="url(#cs-arrow)" style={{animationDelay: `${120 + i * 70}ms`}}/>)}
      </svg>
      {slide.scenarios.slice(0, 6).map((text, i) => <Link key={text} href={`/book-consultation?offer=${slide.id}&s=${i}`} ref={(el) => { boxes.current[i] = el; }} className={`cs__box cs__${SLOTS[i]}`} style={{animationDelay: `${i * 70}ms`}} aria-label={`${text} Book a ${slide.name}`}>{text}</Link>)}
      <div className="cs__centre" ref={centre}>
        <small>{slide.category} consultation</small>
        <h2>{slide.name}</h2>
        <p>{slide.summary}</p>
        <div className="cs__price"><strong>{slide.price}</strong><span>listed fee</span></div>
        <div className="cs__actions">
          <Link className="hv-button hv-button--gold" href={`/checkout?offer=${slide.id}`}>Book this session <ArrowUpRight size={17}/></Link>
          <Link className="hv-link" href={`/consultations/${slide.slug}`}>Details <ArrowRight size={16}/></Link>
        </div>
      </div>
    </div>

  </div>;
}
