'use client';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {get, post} from '@/lib/client';

type Options = {topics: {id: string; label: string; description: string}[]; note: string};
export default function Consultation() {
  const [opts, setOpts] = useState<Options | null>(null);
  const [f, setF] = useState({topic: '', name: '', email: '', phone: '', message: '', consent: false});
  const [state, setState] = useState('');
  useEffect(() => { void get<Options>('/consultation/options').then((r) => r.ok && setOpts(r.data)); }, []);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const r = await post('/consultation/enquiries', {...f, phone: f.phone || undefined, consentVersion: 'consult-v1'});
    setState(r.ok ? 'sent' : r.error.message);
  }
  if (state === 'sent') return <div className="wrap" style={{marginTop: '2rem'}}><h1>Thank you</h1><p>We have your enquiry and will reply by email.</p></div>;
  return (
    <div className="wrap" style={{marginTop: '2rem', maxWidth: 720}}>
      <h1>Ask for guidance</h1>
      <p>Not sure which rudraksha, gemstone, crystal or yantra suits you? Tell us a little and we will reply.</p>
      {opts && !opts.topics.length ? <div className="alert info">{opts.note}</div> : (
        <form className="card pad" onSubmit={send}>
          <div className="field"><label htmlFor="t">Topic</label><select id="t" value={f.topic} onChange={(e) => setF({...f, topic: e.target.value})} required><option value="">Choose…</option>{opts?.topics.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></div>
          <div className="field"><label htmlFor="n">Name</label><input id="n" value={f.name} onChange={(e) => setF({...f, name: e.target.value})} required /></div>
          <div className="field"><label htmlFor="e">Email</label><input id="e" type="email" value={f.email} onChange={(e) => setF({...f, email: e.target.value})} required /></div>
          <div className="field"><label htmlFor="p">Mobile (optional)</label><input id="p" inputMode="numeric" value={f.phone} onChange={(e) => setF({...f, phone: e.target.value})} /></div>
          <div className="field"><label htmlFor="m">Message</label><textarea id="m" value={f.message} onChange={(e) => setF({...f, message: e.target.value})} required /></div>
          <label className="check"><input type="checkbox" checked={f.consent} onChange={(e) => setF({...f, consent: e.target.checked})} required /> <span>You may contact me about this enquiry (<Link href="/policies/privacy-policy">privacy policy</Link>).</span></label>
          {opts?.note && <p className="small muted">{opts.note}</p>}
          {state && <p className="err">{state}</p>}
          <button className="btn" disabled={!f.consent}>Send</button>
        </form>
      )}
    </div>
  );
}
