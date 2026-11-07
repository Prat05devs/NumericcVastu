import {Art, SHOP, WhatsAppIcon} from './ui';
import {JoinForm} from './JoinForm';

/**
 * Shown on every shop page while the crystal shop is being renovated (STORE_OPEN is not "true"). No products,
 * prices or discounts are shown; visitors can join the list or reach the team. The back office is unaffected.
 */
export function Renovation() {
  return (
    <main className="reno" id="content">
      <div className="reno__art" aria-hidden="true"><Art name="cluster" /><Art name="bracelet-rose" /><Art name="rudraksha" /></div>
      <div className="reno__card">
        <span className="eyebrow">NumericcVaastu Crystal</span>
        <h1 className="disp">We’re renovating<br /><em>our crystal shop.</em></h1>
        <p>We’re hand-picking new rudraksha, gemstones, crystals and yantras, and photographing each piece properly. The shop reopens soon.</p>
        <p className="reno__sub">Want to know the moment it opens? Leave your email.</p>
        <div className="join"><JoinForm source="home" /></div>
        <div className="row reno__links">
          <a className="btn light" href={`https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent('Namaste, I am looking for a crystal / rudraksha / gemstone.')}`} target="_blank" rel="noopener noreferrer"><WhatsAppIcon /> Ask on WhatsApp</a>
          <a className="btn" href={SHOP.main}>Visit numericcvaastu.com</a>
        </div>
      </div>
    </main>
  );
}
