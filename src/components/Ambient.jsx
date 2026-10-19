'use client';
import {useEffect} from 'react';

/** Cards that get a soft glow following the pointer (see motion.css). */
const SPOTLIGHT = '.hv-service, .hv-course, .hv-path, .nv-blog__card, .nv-review, .pc-card, .pr-card, .csd-scenarios a, .csd-related a, .cd-outcomes li, .cd-for__list li, .hv-preds__list a, .hv-ig, .cd-buy__card';
/** Primary buttons that lean a few pixels towards the pointer. */
const MAGNETIC = '.hv-button--gold, .button-gold';

/** "4.7M+" → {prefix:'', value:4.7, decimals:1, suffix:'M+'}; "₹1,500+" → prefix ₹, value 1500, commas. */
function parse(text) {
  const m = text.match(/^([^\d]*)([\d,]+(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  const raw = m[2];
  return {prefix: m[1], value: parseFloat(raw.replace(/,/g, '')), decimals: (raw.split('.')[1] || '').length, commas: raw.includes(','), suffix: m[3]};
}
const format = (p, v) => {
  const fixed = v.toFixed(p.decimals);
  return p.prefix + (p.commas ? Number(fixed).toLocaleString('en-IN', {minimumFractionDigits: p.decimals, maximumFractionDigits: p.decimals}) : fixed) + p.suffix;
};

/**
 * Site-wide micro-interactions that need a little script: pointer-following spotlight on cards,
 * magnetic primary buttons, and numbers that count up the first time they scroll into view.
 * Everything is skipped when the visitor prefers reduced motion, and the page reads correctly without it.
 */
export default function Ambient() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let frame = 0;
    let last = null;

    function onMove(event) {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const card = event.target.closest?.(SPOTLIGHT);
        if (card) {
          const r = card.getBoundingClientRect();
          card.style.setProperty('--mx', `${event.clientX - r.left}px`);
          card.style.setProperty('--my', `${event.clientY - r.top}px`);
        }
        const btn = event.target.closest?.(MAGNETIC);
        if (last && last !== btn) { last.style.removeProperty('--mgx'); last.style.removeProperty('--mgy'); }
        if (btn) {
          const r = btn.getBoundingClientRect();
          const dx = (event.clientX - (r.left + r.width / 2)) / (r.width / 2);
          const dy = (event.clientY - (r.top + r.height / 2)) / (r.height / 2);
          btn.style.setProperty('--mgx', `${(dx * 3).toFixed(2)}px`);
          btn.style.setProperty('--mgy', `${(dy * 2).toFixed(2)}px`);
        }
        last = btn;
      });
    }
    if (fine) document.addEventListener('pointermove', onMove, {passive: true});

    // Count-up: elements marked data-count animate from 0 to their own text once.
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        io.unobserve(el);
        const target = el.dataset.countTo || el.textContent.trim();
        const p = parse(target);
        if (!p || !p.value) continue;
        el.dataset.countTo = target;
        const start = performance.now(), duration = 1400;
        const tick = (now) => {
          const t = Math.min(1, (now - start) / duration);
          el.textContent = format(p, p.value * (1 - Math.pow(1 - t, 3)));
          if (t < 1) requestAnimationFrame(tick); else el.textContent = target;
        };
        requestAnimationFrame(tick);
      }
    }, {threshold: 0.6});
    const watch = () => document.querySelectorAll('[data-count]:not([data-count-to])').forEach((el) => io.observe(el));
    watch();
    // Pages change without a reload; pick up new counters after each navigation.
    const mo = new MutationObserver((records) => { if (records.some((r) => [...r.addedNodes].some((n) => n.nodeType === 1))) watch(); });
    mo.observe(document.body, {childList: true, subtree: true});

    return () => { document.removeEventListener('pointermove', onMove); io.disconnect(); mo.disconnect(); cancelAnimationFrame(frame); };
  }, []);
  return null;
}
