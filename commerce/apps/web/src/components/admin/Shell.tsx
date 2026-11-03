'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {get, post} from '@/lib/client';

type Staff = {user: {id: string; email: string; name: string; role: string}; mfaVerified: boolean; permissions: string[]};
const Ctx = createContext<Staff | null>(null);
export const useStaff = () => useContext(Ctx)!;
export const useCan = () => { const s = useContext(Ctx); return (p: string) => Boolean(s?.permissions.includes(p)); };

const NAV: [string, [string, string, string][]][] = [
  ['Sell', [['/admin', 'Overview', 'overview.read'], ['/admin/orders', 'Orders', 'orders.read'], ['/admin/returns', 'Returns', 'orders.read'], ['/admin/delivery', 'Delivery feedback', 'orders.read'], ['/admin/requests', 'Wristwatch requests', 'requests.read'], ['/admin/consultations', 'Consultation enquiries', 'requests.read']]],
  ['Catalogue', [['/admin/products', 'Products', 'catalogue.read'], ['/admin/inventory', 'Stock', 'catalogue.read'], ['/admin/categories', 'Categories & filters', 'catalogue.read'], ['/admin/collections', 'Collections', 'catalogue.read'], ['/admin/certificates', 'Lab reports', 'catalogue.read']]],
  ['Grow', [['/admin/coupons', 'Coupons', 'marketing.write'], ['/admin/campaigns', 'Sales & festive themes', 'marketing.write'], ['/admin/partners', 'Partners (affiliates)', 'marketing.write'], ['/admin/payouts', 'Partner payouts', 'reports.read'], ['/admin/content', 'Pages, guides & reviews', 'cms.write']]],
  ['Run', [['/admin/reports', 'Reports', 'reports.read'], ['/admin/settings', 'Settings', 'settings.read'], ['/admin/payments', 'Payments setup', 'payments.mode'], ['/admin/staff', 'Staff', 'staff.manage'], ['/admin/jobs', 'Jobs & webhooks', 'settings.read'], ['/admin/audit', 'Audit log', 'audit.read']]],
];

export function Shell({children}: {children: React.ReactNode}) {
  const [staff, setStaff] = useState<Staff | null | undefined>(undefined);
  const path = usePathname();
  const load = useCallback(async () => { const r = await get<Staff>('/auth/staff/me'); setStaff(r.ok ? r.data : null); }, []);
  useEffect(() => { void load(); }, [load]);
  if (staff === undefined) return <main className="wrap" style={{marginTop: '3rem'}}><p>Loading…</p></main>;
  if (staff === null) return <main className="wrap" style={{marginTop: '3rem'}}><Login onDone={load} /></main>;
  if (!staff.mfaVerified) return <main className="wrap" style={{marginTop: '3rem'}}><MfaSetup onDone={load} /></main>;
  return (
    <Ctx.Provider value={staff}>
      <div className="console">
        <aside>
          <Link href="/admin" className="brand" style={{color: '#fff', fontSize: '1.05rem'}}>NumericcVaastu <span>Back office</span></Link>
          <nav aria-label="Back office">
            {NAV.map(([group, items]) => {
              const visible = items.filter(([, , perm]) => staff.permissions.includes(perm));
              return visible.length ? <div key={group}><h2>{group}</h2>{visible.map(([href, text]) => <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>{text}</Link>)}</div> : null;
            })}
          </nav>
          <p className="small" style={{marginTop: '1.5rem'}}>{staff.user.name} · {staff.user.role}</p>
          <button className="btn small ghost" style={{color: '#fff', borderColor: '#fff'}} onClick={async () => { await post('/auth/staff/logout'); setStaff(null); }}>Sign out</button>
        </aside>
        <main id="content">{children}</main>
      </div>
    </Ctx.Provider>
  );
}

function Login({onDone}: {onDone: () => void}) {
  const [f, setF] = useState({email: '', password: '', totp: ''});
  const [needTotp, setNeedTotp] = useState(false);
  const [msg, setMsg] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg('');
    const r = await post('/auth/staff/login', {email: f.email, password: f.password, ...(f.totp && {totp: f.totp})});
    if (r.ok) return onDone();
    if (r.error.code === 'MFA_REQUIRED') { setNeedTotp(true); return setMsg('Enter the 6-digit code from your authenticator app.'); }
    setMsg(r.error.message);
  }
  return (
    <form className="card" style={{maxWidth: 420, margin: '0 auto'}} onSubmit={submit}>
      <h1>Back office</h1>
      <div className="field"><label htmlFor="se">Email</label><input id="se" type="email" autoComplete="username" value={f.email} onChange={(e) => setF({...f, email: e.target.value})} required /></div>
      <div className="field"><label htmlFor="sp">Password</label><input id="sp" type="password" autoComplete="current-password" value={f.password} onChange={(e) => setF({...f, password: e.target.value})} required /></div>
      {needTotp && <div className="field"><label htmlFor="st">Authenticator code</label><input id="st" inputMode="numeric" autoComplete="one-time-code" value={f.totp} onChange={(e) => setF({...f, totp: e.target.value})} required /></div>}
      {msg && <p className="err" role="alert">{msg}</p>}
      <button className="btn">Sign in</button>
    </form>
  );
}

function MfaSetup({onDone}: {onDone: () => void}) {
  const [setup, setSetup] = useState<{secret: string; otpauthUri: string} | null>(null);
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (!setup) return;
    void import('qrcode').then((QR) => QR.toDataURL(setup.otpauthUri, {margin: 1, width: 220})).then(setQr).catch(() => setQr(''));
  }, [setup]);
  return (
    <div className="card stack" style={{maxWidth: 560, margin: '0 auto'}}>
      <h1>Set up two-factor authentication</h1>
      <p>The back office requires an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…).</p>
      {!setup ? <button className="btn" onClick={async () => { const r = await post<{secret: string; otpauthUri: string}>('/auth/staff/mfa/setup'); if (r.ok) setSetup(r.data); else setMsg(r.error.message); }}>Start setup</button> : (
        <>
          <p><strong>Easiest:</strong> in Google Authenticator tap <strong>+</strong> → <strong>Scan a QR code</strong> and scan this:</p>
          {qr && <img src={qr} alt="QR code for your authenticator app" width={220} height={220} style={{border: '1px solid var(--line)', borderRadius: 8}}/>}
          <p className="small">Or tap <strong>+</strong> → <strong>Enter a setup key</strong>, choose <strong>Time based</strong>, and type this key. It uses letters A–Z and the digits 2–7 only, so every “O” is the letter O (never zero) and every “I” is the letter I (never one):</p>
          <pre className="code" aria-label="Setup key" style={{fontFamily: 'ui-monospace, Menlo, Consolas, monospace', letterSpacing: '.08em'}}>{setup.secret.match(/.{1,4}/g)?.join(' ')}</pre>
          <form className="row" onSubmit={async (e) => { e.preventDefault(); const r = await post('/auth/staff/mfa/confirm', {code}); if (r.ok) onDone(); else setMsg(r.error.message); }}>
            <input inputMode="numeric" aria-label="6-digit code" placeholder="6-digit code from the app" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} style={{maxWidth: 220}} />
            <button className="btn">Confirm</button>
          </form>
        </>
      )}
      {msg && <p className="err" role="alert">{msg}</p>}
    </div>
  );
}
