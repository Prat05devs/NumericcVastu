import Link from 'next/link';
import {can, requireAdmin} from '../../../lib/auth.ts';
import {paypalSettings, razorpaySettings} from '../../../lib/settings.ts';
import {hasEncryptionKey} from '../../../lib/crypto.ts';
import {signOut} from '../login/actions.ts';

export const dynamic = 'force-dynamic';

const NAV: [string, string, keyof typeof can | null][][] = [
  [['Overview', '/admin', null]],
  [['Coupons', '/admin/coupons', 'offers'], ['Affiliates', '/admin/affiliates', 'offers'], ['Sales & festive offers', '/admin/campaigns', 'offers']],
  [['Catalogue', '/admin/catalogue', 'catalogue']],
  [['Payments', '/admin/settings/payments', 'settings'], ['AI models', '/admin/settings/ai', 'settings'], ['Storefronts & API keys', '/admin/settings/storefronts', 'settings'], ['Team', '/admin/team', 'team'], ['Audit log', '/admin/audit', 'audit']],
];
const HEADINGS = [null, 'Marketing', 'Products', 'Settings'];

export default async function PanelLayout({children}: {children: React.ReactNode}) {
  const admin = await requireAdmin();
  const [razorpay, paypal] = await Promise.all([razorpaySettings(), paypalSettings()]);
  return <div className="shell">
    <nav className="side" aria-label="Back office">
      <Link href="/admin" className="brand"><b>NumericcVaastu</b><small>Back office</small></Link>
      {NAV.map((group, i) => {
        const links = group.filter(([, , right]) => !right || can[right].includes(admin.role));
        return links.length ? <div key={i} style={{display: 'contents'}}>{HEADINGS[i] && <h4>{HEADINGS[i]}</h4>}{links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</div> : null;
      })}
      <form action={signOut}><p className="who">{admin.name} · {admin.role}</p><button className="btn small" type="submit">Sign out</button></form>
    </nav>
    <div className="main">
      <div className="modes" aria-label="Payment modes" style={{marginBottom: 14}}>
        <span className={`chip ${razorpay.mode === 'live' ? 'live' : 'warn'}`}>Razorpay: {razorpay.mode === 'live' ? 'LIVE' : 'Test'}</span>
        <span className={`chip ${paypal.mode === 'live' ? 'live' : 'warn'}`}>PayPal: {paypal.mode === 'live' ? 'LIVE' : 'Sandbox'}</span>
        {!hasEncryptionKey() && <span className="chip bad">Encryption key missing: keys cannot be saved</span>}
      </div>
      {children}
    </div>
  </div>;
}
