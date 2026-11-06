import Link from 'next/link';
import {Icon} from './ui';
import {CartLink} from './CartLink';
import {MobileMenu} from './MobileMenu';
import {WishCount} from './Wishlist';
import {HeaderScroll, MegaNav} from './MegaNav';

/** Two-tier luxury header: search · logo · account tools, then the centred category row with mega-menu panels. */
export function Header() {
  return (
    <header className="hdr">
      <HeaderScroll />
      <div className="w hdr-top">
        <div className="hdr-left">
          <MobileMenu />
          <form className="search-pill" action="/search" role="search"><Icon name="search" /><label className="sr" htmlFor="hdr-q">Search the shop</label><input id="hdr-q" name="q" placeholder="Search rudraksha, gems, crystals…" autoComplete="off" /></form>
        </div>
        <Link href="/" className="logo" aria-label="NumericcVaastu Crystal, home"><b>NumericcVaastu</b><small>Crystal</small></Link>
        <div className="tools">
          <Link href="/wishlist" className="ic wish-link" aria-label="Wishlist"><Icon name="heart" /><WishCount /></Link>
          <Link href="/account" className="ic" aria-label="Your account"><Icon name="user" /></Link>
          <CartLink />
        </div>
      </div>
      <MegaNav />
    </header>
  );
}
