'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {NAV} from './nav';

/** Phone and tablet menu: categories, search, wishlist and account in a side sheet. */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [open]);
  return (
    <>
      <button type="button" className="ic menu-btn" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      {open && createPortal(
        <div className="sheet-bg" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="sheet left" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="sheet-head"><b>Shop</b><button className="x" onClick={() => setOpen(false)} aria-label="Close menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 6l12 12M18 6 6 18" /></svg></button></div>
            <form action="/search" role="search" className="search-pill" style={{display: 'flex'}}><label className="sr" htmlFor="m-q">Search the shop</label><input id="m-q" name="q" placeholder="Search stones, beads…" /></form>
            <nav className="mmenu" aria-label="Shop by category" onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setOpen(false); }}>
              {NAV.map((n) => n.columns ? (
                <details key={n.href}>
                  <summary><span>{n.label}<small>{n.note}</small></span></summary>
                  <div className="mmenu-body">
                    {n.columns.map((c) => <div key={c.title}><h4>{c.title}</h4>{c.links.map((l) => <Link key={l.label} href={l.href}>{l.label}{l.note && <small>{l.note}</small>}</Link>)}</div>)}
                    <Link className="lnk" href={n.href}>Shop all {n.label.toLowerCase()} →</Link>
                  </div>
                </details>
              ) : <Link key={n.href} className="mmenu-top" href={n.href}><span>{n.label}<small>{n.note}</small></span></Link>)}
            </nav>
            <div className="row" style={{marginTop: 8}}><Link className="btn light sm" href="/wishlist">Wishlist</Link><Link className="btn light sm" href="/account">Account</Link><Link className="btn light sm" href="/guides">Guides</Link></div>
          </div>
        </div>,
        // The header's blur creates its own layer, so the sheet is rendered at the shop root to cover the page.
        document.querySelector('.cs') ?? document.body,
      )}
    </>
  );
}
