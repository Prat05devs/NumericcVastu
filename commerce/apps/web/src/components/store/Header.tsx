import Link from 'next/link';
import {Icon} from './ui';
import {CartLink} from './CartLink';
import {MobileMenu} from './MobileMenu';
import {WishCount} from './Wishlist';
import {NAV} from './nav';



export function Header() {
  return (
    <header className="hdr">
      <div className="w">
        <nav aria-label="Shop by category">{NAV.map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}</nav>
        <MobileMenu />
        <Link href="/" className="logo" aria-label="NumericcVaastu Crystal, home"><b>NumericcVaastu</b><small>Crystal</small></Link>
        <div className="tools">
          <form className="search-pill" action="/search" role="search"><Icon name="search" /><label className="sr" htmlFor="hdr-q">Search the shop</label><input id="hdr-q" name="q" placeholder="Search stones, beads…" autoComplete="off" /></form>
          <Link href="/wishlist" className="ic wish-link" aria-label="Wishlist"><Icon name="heart" /><WishCount /></Link>
          <Link href="/account" className="ic" aria-label="Your account"><Icon name="user" /></Link>
          <CartLink />
        </div>
      </div>
    </header>
  );
}
