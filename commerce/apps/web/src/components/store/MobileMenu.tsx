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
            <nav className="mnav" aria-label="Shop by category">
              {NAV.map((n) => <Link key={n.href} href={n.href}>{n.label}<small>{n.note}</small></Link>)}
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
