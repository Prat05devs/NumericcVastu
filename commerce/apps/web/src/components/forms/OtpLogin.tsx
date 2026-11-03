'use client';
import {useState} from 'react';
import {post} from '@/lib/client';

/** Email one-time-code sign-in, shared by the customer account and the partner portal. */
export function OtpLogin({onSignedIn, title = 'Sign in'}: {onSignedIn: () => void; title?: string}) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState('');
  async function request(e: React.FormEvent) {
    e.preventDefault(); setMsg('');
    const r = await post<{message: string}>('/auth/otp/request', {email});
    if (r.ok) { setSent(true); setMsg(r.data.message); } else setMsg(r.error.message);
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const r = await post('/auth/otp/verify', {email, code});
    if (r.ok) onSignedIn(); else setMsg(r.error.message);
  }
  return (
    <form className="card" style={{maxWidth: 440}} onSubmit={sent ? verify : request}>
      <h2>{title}</h2>
      <p className="small muted">We email you a 6-digit code — no password needed.</p>
      <div className="field"><label htmlFor="otp-email">Email</label><input id="otp-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={sent} /></div>
      {sent && <div className="field"><label htmlFor="otp-code">6-digit code</label><input id="otp-code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" value={code} onChange={(e) => setCode(e.target.value)} required /></div>}
      {msg && <p className="small" role="status">{msg}</p>}
      <div className="row"><button className="btn">{sent ? 'Sign in' : 'Email me a code'}</button>{sent && <button type="button" className="btn ghost small" onClick={() => { setSent(false); setCode(''); }}>Use another email</button>}</div>
    </form>
  );
}
