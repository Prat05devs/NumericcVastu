'use client';
import {useState} from 'react';
import {post} from '@/lib/client';

/** Newsletter opt-in (explicit; recorded with the consent wording version). */
export function JoinForm({source = 'home'}: {source?: 'home' | 'footer'}) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | string>('idle');
  async function join(e: React.FormEvent) {
    e.preventDefault();
    setState('busy');
    const r = await post<{message: string}>('/newsletter', {email, source, consentVersion: 'news-v1'});
    setState(r.ok ? 'done' : r.error.message);
  }
  if (state === 'done') return <p className="note ok" role="status" style={{maxWidth: 420, margin: '0 auto'}}>Thank you. You’re on the list.</p>;
  return (
    <form onSubmit={join}>
      <label className="sr" htmlFor={`join-${source}`}>Email</label>
      <input id={`join-${source}`} type="email" placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      <button className="btn" disabled={state === 'busy'}>{state === 'busy' ? 'Joining…' : 'Join the list'}</button>
      {state !== 'idle' && state !== 'busy' && <p className="hint err" role="alert" style={{width: '100%'}}>{state}</p>}
    </form>
  );
}
