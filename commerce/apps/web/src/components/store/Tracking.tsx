'use client';
import {useState} from 'react';
import {post} from '@/lib/client';
import {date, dateTime, label} from '@/lib/format';
import {tokenHeader} from '@/lib/orders';

export type TrackingView = {orderCode: string; status: string; statusLabel: string; items: {title: string; qty: number}[]; steps: {key: string; label: string; at: string | null; done: boolean}[]; shipments: {courier: string; trackingNo: string; status: string; expectedBy: string | null; deliveredAt: string | null; trackingUrl: string | null; scans: {status: string; at: string; location: string | null; description: string | null}[]}[]; feedback: {canGive: boolean; given: {rating: number} | null}};

export function Tracking({t, orderId, token}: {t: TrackingView; orderId?: string; token?: string | null}) {
  return (
    <div className="stack">
      <ol className="steps" aria-label="Order progress">
        {t.steps.map((s) => <li key={s.key} className={s.done ? 'done' : ''}><span className="dot" aria-hidden /> <span>{s.label}{s.at ? <span className="small muted"> · {dateTime(s.at)}</span> : null}</span></li>)}
      </ol>
      {t.shipments.map((s) => (
        <div key={s.trackingNo} className="card pad">
          <div className="row spread"><strong>{s.courier} · {s.trackingNo}</strong><span className="badge">{label(s.status)}</span></div>
          {s.expectedBy && !s.deliveredAt && <p className="small">Expected by {date(s.expectedBy)}</p>}
          {s.trackingUrl && <p><a href={s.trackingUrl} target="_blank" rel="noopener noreferrer">Track on the courier’s website ↗</a></p>}
          <ul className="small" style={{paddingLeft: '1.1rem'}}>{[...s.scans].reverse().map((e, i) => <li key={i}>{dateTime(e.at)} — {label(e.status)}{e.location ? `, ${e.location}` : ''}{e.description ? ` — ${e.description}` : ''}</li>)}</ul>
        </div>
      ))}
      {orderId && t.feedback.canGive && <Feedback orderId={orderId} token={token ?? null} />}
      {t.feedback.given && <p className="ok">Thank you for rating the delivery ({t.feedback.given.rating}/5).</p>}
    </div>
  );
}

function Feedback({orderId, token}: {orderId: string; token: string | null}) {
  const [rating, setRating] = useState(0);
  const [onTime, setOnTime] = useState<boolean | null>(null);
  const [packagingOk, setPackagingOk] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [state, setState] = useState<'idle' | 'sent' | string>('idle');
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const r = await post(`/orders/${orderId}/delivery-feedback`, {rating, ...(onTime !== null && {onTime}), ...(packagingOk !== null && {packagingOk}), ...(comment && {comment})}, tokenHeader(token));
    setState(r.ok ? 'sent' : r.error.message);
  }
  if (state === 'sent') return <p className="ok">Thank you — your feedback helps us choose better delivery partners.</p>;
  return (
    <form className="card pad stack" onSubmit={send}>
      <h3>How was the delivery?</h3>
      <div role="radiogroup" aria-label="Rating" className="row">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" className={`btn small ${rating >= n ? 'gold' : 'ghost'}`} aria-pressed={rating === n} onClick={() => setRating(n)}>{n}★</button>)}</div>
      <div className="row"><span>Arrived on time?</span><button type="button" className={`btn small ${onTime === true ? '' : 'ghost'}`} onClick={() => setOnTime(true)}>Yes</button><button type="button" className={`btn small ${onTime === false ? '' : 'ghost'}`} onClick={() => setOnTime(false)}>No</button></div>
      <div className="row"><span>Packaging intact?</span><button type="button" className={`btn small ${packagingOk === true ? '' : 'ghost'}`} onClick={() => setPackagingOk(true)}>Yes</button><button type="button" className={`btn small ${packagingOk === false ? '' : 'ghost'}`} onClick={() => setPackagingOk(false)}>No</button></div>
      <div className="field"><label htmlFor="fb">Anything else? (optional)</label><textarea id="fb" maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} /></div>
      {state !== 'idle' && <p className="err">{state}</p>}
      <button className="btn" disabled={!rating}>Send feedback</button>
    </form>
  );
}
