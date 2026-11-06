import Link from 'next/link';
import {SHOP} from './ui';

export function Footer() {
  return (
    <footer className="ftr">
      <div className="w cols">
        <div>
          <Link className="logo" href="/" style={{textAlign: 'left', display: 'inline-block'}}><b>NumericcVaastu</b><small>Crystal</small></Link>
          <p style={{marginTop: 16}}>Rudraksha, gemstones, crystals and yantras, described honestly and chosen with guidance from Adarshh Panndey. Prices include GST and delivery.</p>
          <p style={{marginTop: 12}}><a href={`https://wa.me/${SHOP.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp {SHOP.phone}</a><a href={`mailto:${SHOP.email}`}>{SHOP.email}</a></p>
        </div>
        <div><h3>Shop</h3><Link href="/rudraksha">Rudraksha</Link><Link href="/gemstones">Gemstones</Link><Link href="/crystals">Crystals</Link><Link href="/crystals?attr_product_form=bracelet">Bracelets</Link><Link href="/yantras">Yantras</Link><Link href="/custom-wristwatch">Custom wristwatch</Link></div>
        <div><h3>Help</h3><Link href="/policies/shipping-policy">Delivery</Link><Link href="/policies/returns-policy">Returns</Link><Link href="/consultation">Ask for guidance</Link><Link href="/guides">Guides</Link><Link href="/account">Your orders</Link></div>
        <div><h3>NumericcVaastu</h3><a href={`${SHOP.main}/consultations`}>Consultations</a><a href={`${SHOP.main}/courses`}>Courses</a><a href={`${SHOP.main}/numerology-calculator`}>Free calculator</a><a href={`${SHOP.main}/about`}>About Adarshh</a></div>
      </div>
      <div className="wordmark" aria-hidden="true">Numericc Crystals</div>
      <div className="legal"><div className="w"><span>© {new Date().getFullYear()} NumericcVaastu Training &amp; Consultancy LLP</span><span><Link href="/policies/privacy-policy">Privacy</Link> · <Link href="/policies/terms">Terms</Link> · <Link href="/policies/returns-policy">Refunds</Link></span></div></div>
    </footer>
  );
}
