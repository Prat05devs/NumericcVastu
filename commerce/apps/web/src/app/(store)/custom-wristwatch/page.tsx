'use client';
import Link from 'next/link';
import {useState} from 'react';
import {post} from '@/lib/client';

const BUDGETS = [['UNDER_10K', 'Under ₹10,000'], ['10K_25K', '₹10,000 – ₹25,000'], ['25K_50K', '₹25,000 – ₹50,000'], ['50K_1L', '₹50,000 – ₹1,00,000'], ['ABOVE_1L', 'Above ₹1,00,000'], ['UNSURE', 'Not sure yet']];
const CONSENT = 'watch-v1';

export default function CustomWatch() {
  const [f, setF] = useState({name: '', email: '', phone: '', preferredStyle: '', budgetBand: 'UNSURE', requirements: '', dateOfBirth: '', consent: false});
  const [done, setDone] = useState<{referenceCode: string; accessToken: string} | null>(null);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value});
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    const r = await post<{referenceCode: string; accessToken: string}>('/custom-requests', {requestType: 'WRISTWATCH', ...f, dateOfBirth: f.dateOfBirth || undefined, consentVersion: CONSENT});
    if (r.ok) { localStorage.setItem(`sc_req_${r.data.referenceCode}`, r.data.accessToken); setDone(r.data); } else setErr(r.error.message);
  }
  if (done) return (
    <div className="wrap" style={{marginTop: '2rem', maxWidth: 720}}>
      <h1>Request received</h1>
      <div className="alert good">Your reference is <strong>{done.referenceCode}</strong>. We have emailed it to you.</div>
      <p>We review every request personally and send a written quotation. <Link href={`/custom-wristwatch/status?ref=${done.referenceCode}&t=${encodeURIComponent(done.accessToken)}`}>Check its status here</Link> — keep this link private.</p>
    </div>
  );
  return (
    <div className="wrap two" style={{marginTop: '2rem'}}>
      <section>
        <h1>Numerology wristwatch, made to order</h1>
        <p>Tell us what you would like. We review it, then send a written quotation with price, timeline and terms. Nothing is charged until you accept a quotation.</p>
        <form onSubmit={submit} className="card">
          <div className="field"><label htmlFor="n">Name</label><input id="n" value={f.name} onChange={set('name')} required /></div>
          <div className="field"><label htmlFor="e">Email</label><input id="e" type="email" value={f.email} onChange={set('email')} required /></div>
          <div className="field"><label htmlFor="p">Mobile</label><input id="p" inputMode="numeric" value={f.phone} onChange={set('phone')} required /></div>
          <div className="field"><label htmlFor="s">Preferred style</label><input id="s" placeholder="e.g. steel, minimal dial, leather strap" value={f.preferredStyle} onChange={set('preferredStyle')} required /></div>
          <div className="field"><label htmlFor="b">Budget</label><select id="b" value={f.budgetBand} onChange={set('budgetBand')}>{BUDGETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div className="field"><label htmlFor="r">Your requirements</label><textarea id="r" value={f.requirements} onChange={set('requirements')} required /></div>
          <div className="field"><label htmlFor="d">Date of birth (optional, for numerology)</label><input id="d" type="date" value={f.dateOfBirth} onChange={set('dateOfBirth')} /><div className="hint">Stored encrypted and seen only by the team preparing your quotation.</div></div>
          <label className="check"><input type="checkbox" checked={f.consent} onChange={set('consent')} required /> <span>I agree that NumericcVaastu may use these details to prepare and discuss my quotation (<Link href="/policies/privacy-policy">privacy policy</Link>).</span></label>
          {err && <p className="err" role="alert">{err}</p>}
          <button className="btn" disabled={!f.consent}>Send request</button>
        </form>
      </section>
      <aside className="card"><h2>How it works</h2><ol><li>Send your request.</li><li>We review and send a quotation.</li><li>Accept and pay online.</li><li>We make and ship your watch.</li></ol><p className="small muted">Numerology guidance is traditional and belief-based; it does not guarantee any outcome.</p></aside>
    </div>
  );
}
