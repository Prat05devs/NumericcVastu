'use client';
import {useEffect, useRef, useState} from 'react';

const group = (n) => n.toLocaleString('en-US');
/** "00001234" → "00,001,234": commas every three digits, keeping leading zeros. */
const groupDigits = (digits) => digits.replace(/\B(?=(\d{3})+$)/g, ',');
const STRIP = [...'0123456789'];

/** "80,000,000+" → {value: 80000000, suffix: '+'}. */
function parse(text) {
  const m = text.match(/^([\d,]+)(.*)$/);
  return m ? {value: Number(m[1].replace(/,/g, '')), suffix: m[2]} : null;
}

/**
 * A number shown like a live subscriber counter: every digit sits on its own rolling strip.
 * It rolls up from zero the first time it scrolls into view, then keeps ticking upwards by a
 * random `step` ([min, max]) every `every` ms while it is on screen.
 * The server renders the plain figure, so the page reads correctly without script or motion.
 */
export default function LiveCount({value, step = [1, 3], every = 2000, className}) {
  const parsed = parse(value);
  const ref = useRef(null);
  const [n, setN] = useState(parsed?.value ?? 0);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!parsed || !el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer = 0, visible = false, started = false;
    const tick = () => setN((v) => v + step[0] + Math.floor(Math.random() * (step[1] - step[0] + 1)));
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      clearInterval(timer);
      if (!visible) return;
      if (!started) {
        started = true;
        // Start from zero in the same digit layout, then roll every strip to the real figure.
        setN(0);
        setLive(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setN(parsed.value)));
      }
      timer = setInterval(tick, every);
    }, {threshold: 0.5});
    io.observe(el);
    return () => { io.disconnect(); clearInterval(timer); };
    // The counter starts once per mount; later prop changes are not expected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!parsed) return <strong className={className}>{value}</strong>;
  if (!live) return <strong ref={ref} className={className}>{value}</strong>;
  // Pad to the real figure's width so the roll-in from zero keeps every strip in place.
  const width = String(Math.max(n, parsed.value)).length;
  const chars = groupDigits(String(n).padStart(width, '0'));
  return <strong ref={ref} className={`${className || ''} live-count`} aria-label={`${group(n)}${parsed.suffix}`}>
    <span aria-hidden="true">
      {[...chars].map((c, i) => /\d/.test(c)
        ? <span key={chars.length - i} className="live-count__digit"><span style={{transform: `translateY(-${Number(c) * 10}%)`}}>{STRIP.map((d) => <span key={d}>{d}</span>)}</span></span>
        : <span key={chars.length - i}>{c}</span>)}
      {parsed.suffix}
    </span>
  </strong>;
}
