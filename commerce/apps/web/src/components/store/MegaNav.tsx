'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useCallback, useEffect, useRef, useState} from 'react';
import {NAV, type NavItem} from './nav';
import {Art} from './ui';

/** Is this nav item the shop section the visitor is in? (Shown with the gold underline.) */
function isCurrent(item: NavItem, path: string, search: string) {
  const [base, query] = item.href.split('?');
  if (base !== path) return false;
  if (query) return search.includes(query);
  return !NAV.some((o) => o !== item && o.href.startsWith(`${base}?`) && search.includes(o.href.split('?')[1]!));
}

/**
 * Desktop category row with mega-menu panels. Hover opens after a short pause and closes after a grace period (no
 * flicker when the pointer crosses a gap); the chevron button opens it from the keyboard; Escape closes and returns focus.
 */
export function MegaNav() {
  const path = usePathname();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => { setSearch(window.location.search); setOpen(null); }, [path]);
  const clear = () => { if (timer.current) clearTimeout(timer.current); };
  const openSoon = (i: number) => { clear(); timer.current = setTimeout(() => setOpen(i), open === null ? 140 : 0); };
  const closeSoon = () => { clear(); timer.current = setTimeout(() => setOpen(null), 260); };
  const close = useCallback((focus?: number) => { clear(); setOpen(null); if (focus !== undefined) triggers.current[focus]?.focus(); }, []);
  useEffect(() => {
    if (open === null) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(open); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [open, close]);
  useEffect(() => () => clear(), []);

  return (
    <nav className="mnav-row" aria-label="Shop by category" onMouseLeave={closeSoon}>
      <ul className="w">
        {NAV.map((item, i) => {
          const current = isCurrent(item, path, search);
          const panel = Boolean(item.columns);
          return (
            <li key={item.label} onMouseEnter={() => (panel ? openSoon(i) : closeSoon())} className={open === i ? 'is-open' : undefined}>
              <Link href={item.href} className="mnav-link" aria-current={current ? 'page' : undefined} onClick={() => close()}>{item.label}</Link>
              {panel && (
                <button type="button" className="mnav-caret" ref={(el) => { triggers.current[i] = el; }} aria-expanded={open === i} aria-controls={`mnav-${i}`} aria-label={`${item.label} menu`} onClick={() => (open === i ? close() : setOpen(i))}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                </button>
              )}
              {panel && open === i && (
                <div className="mnav-panel" id={`mnav-${i}`} onMouseEnter={clear}>
                  <div className="w mnav-grid">
                    {item.columns!.map((col) => (
                      <div key={col.title} className={col.grid ? 'mnav-col wide' : 'mnav-col'}>
                        <h3>{col.title}</h3>
                        <ul className={col.grid ? 'mnav-list grid' : 'mnav-list'}>
                          {col.links.map((l) => <li key={l.label}><Link href={l.href} onClick={() => close()}>{l.label}{l.note && <small>{l.note}</small>}</Link></li>)}
                        </ul>
                      </div>
                    ))}
                    <Link href={item.href} className="mnav-all" onClick={() => close()}>Shop all {item.label.toLowerCase()} →</Link>
                    {item.feature && (
                      <Link href={item.feature.href} className="mnav-feature" onClick={() => close()}>
                        <span className="pic"><Art name={item.feature.art} /></span>
                        <span className="eyebrow">{item.feature.eyebrow}</span>
                        <b>{item.feature.title}</b>
                        <span className="t">{item.feature.text}</span>
                        <span className="lnk">{item.feature.cta} →</span>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Slims the header once the page scrolls, so it takes less room while browsing. */
export function HeaderScroll() {
  useEffect(() => {
    const hdr = document.querySelector('.cs .hdr');
    if (!hdr) return;
    const on = () => hdr.classList.toggle('slim', window.scrollY > 60);
    on();
    window.addEventListener('scroll', on, {passive: true});
    return () => window.removeEventListener('scroll', on);
  }, []);
  return null;
}
