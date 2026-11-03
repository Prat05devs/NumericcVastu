import Link from 'next/link';

export function Footer() {
  return (
    <footer className="site">
      <div className="wrap cols">
        <div>
          <strong>NumericcVaastu Crystal</strong>
          <p className="small muted">Products chosen with numerology and Vastu guidance by Adarshh Panndey. Traditional, belief-based guidance — no guaranteed outcomes.</p>
        </div>
        <div><strong>Shop</strong><ul><li><Link href="/rudraksha">Rudraksha</Link></li><li><Link href="/gemstones">Gemstones</Link></li><li><Link href="/crystals">Crystals</Link></li><li><Link href="/yantras">Yantras</Link></li><li><Link href="/custom-wristwatch">Custom wristwatch</Link></li></ul></div>
        <div><strong>Help</strong><ul><li><Link href="/track">Track your order</Link></li><li><Link href="/certificates/verify">Verify a lab report</Link></li><li><Link href="/consultation">Ask for guidance</Link></li><li><Link href="/partner">Partner programme</Link></li></ul></div>
        <div><strong>Policies</strong><ul><li><Link href="/policies/shipping-policy">Shipping</Link></li><li><Link href="/policies/returns-policy">Returns &amp; refunds</Link></li><li><Link href="/policies/privacy-policy">Privacy</Link></li><li><Link href="/policies/terms">Terms</Link></li></ul></div>
      </div>
    </footer>
  );
}
