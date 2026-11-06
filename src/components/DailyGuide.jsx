'use client';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import LocalizedContent from '../i18n/LocalizedContent';

const KEY = 'nv-daily-pick';
const reduce = (n) => { while (n > 9) n = String(n).split('').reduce((s, d) => s + Number(d), 0); return n; };
const Moon = ({full}) => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" className={full ? 'dg-m-on' : 'dg-m-off'}/><circle cx="16" cy="9" r="8" className="dg-m-cut"/></svg>;
const ICONS = {
  work: <path d="M4 8h16v11H4zM9 8V5h6v3"/>,
  money: <><circle cx="12" cy="12" r="8"/><path d="M9.5 9h5M9.5 12h5M11 9c2 0 3 1 3 2.5S12.5 14 11 14l3.5 3"/></>,
  love: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>,
  wellbeing: <><circle cx="12" cy="6" r="2.5"/><path d="M5 11c2 1 4.5 1.5 7 1.5S17 12 19 11M12 12.5V17l-3 4M12 17l3 4"/></>,
};
const Ic = ({name}) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>;

/**
 * Pick a number or a rashi and read today's guidance. The choice is remembered on this device. Readings arrive
 * already worked out for today from the server, so nothing here depends on the visitor's clock.
 */
export default function DailyGuide({numbers, signs, goodTime}) {
  const [mode, setMode] = useState('number');
  const [pick, setPick] = useState({number: null, sign: null});
  const [dob, setDob] = useState('');
  useEffect(() => {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch {}
    const q = new URLSearchParams(window.location.search);
    const n = Number(q.get('n'));
    if (n >= 1 && n <= 9) { choose({mode: 'number', pick: {number: n, sign: saved?.sign ?? null}}); return; } // from the homepage
    if (q.get('view') === 'rashi') { setMode('sign'); if (saved) setPick({number: saved.number ?? null, sign: saved.sign ?? null}); return; }
    if (saved) { setPick({number: saved.number ?? null, sign: saved.sign ?? null}); if (saved.mode) setMode(saved.mode); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const choose = (next) => { setPick(next.pick); setMode(next.mode); try { localStorage.setItem(KEY, JSON.stringify({...next.pick, mode: next.mode})); } catch {} };
  const current = mode === 'number' ? numbers.find((x) => x.n === pick.number) : signs.find((x) => x.index === pick.sign);
  const r = current?.reading;
  const energy = mode === 'number' ? current?.tone.energy : r?.energy;
  const toneLabel = mode === 'number' ? current?.tone.label : (energy >= 4 ? 'Favourable' : energy === 3 ? 'Mixed' : energy === 2 ? 'Take care' : 'Go slowly');

  return <LocalizedContent><section className="dg-read" aria-labelledby="dg-read-title">
    <div className="dg-wrap">
      <div className="dg-read__head">
        <div><span className="dg-eyebrow"><span className="dg-no">02</span>Your reading</span><h2 id="dg-read-title">Choose your number <em>or your rashi.</em></h2></div>
        <div className="dg-switch" role="tablist" aria-label="Read by">
          <button role="tab" aria-selected={mode === 'number'} onClick={() => setMode('number')}>By number</button>
          <button role="tab" aria-selected={mode === 'sign'} onClick={() => setMode('sign')}>By rashi</button>
        </div>
      </div>

      {mode === 'number' ? <div className="dg-pickers">
        <div className="dg-ring dg-ring--9" role="group" aria-label="Your Mulank (birth number)">
          {numbers.map((x) => <button key={x.n} type="button" aria-pressed={pick.number === x.n} onClick={() => choose({mode: 'number', pick: {...pick, number: x.n}})}><b>{x.n}</b><small>{x.planet}</small></button>)}
        </div>
        <form className="dg-dob" onSubmit={(e) => { e.preventDefault(); if (dob) choose({mode: 'number', pick: {...pick, number: reduce(Number(dob.slice(8, 10)))}}); }}>
          <label htmlFor="dg-dob">Don’t know your number? Enter your date of birth</label>
          <div><input id="dg-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required/><button className="dg-btn">Find it</button></div>
        </form>
      </div> : <div className="dg-pickers">
        <div className="dg-ring dg-ring--12" role="group" aria-label="Your rashi (Moon sign)">
          {signs.map((x) => <button key={x.key} type="button" aria-pressed={pick.sign === x.index} onClick={() => choose({mode: 'sign', pick: {...pick, sign: x.index}})}><b>{x.hindi}</b><small>{x.name}</small></button>)}
        </div>
        <p className="dg-hint">Your rashi is the sign the Moon was in when you were born (Vedic), which can differ from your Western sun sign.</p>
      </div>}

      {!current ? <div className="dg-empty"><p>{mode === 'number' ? 'Tap your number above to read today’s guidance.' : 'Tap your rashi above to read today’s guidance.'}</p></div> : <article className="dg-card" aria-live="polite">
        <div className="dg-card__id">
          <span className={`dg-big${mode === 'sign' ? ' dg-big--word' : ''}`}>{mode === 'number' ? current.n : current.hindi}</span>
          <span className="dg-who">{mode === 'number' ? `Mulank ${current.n} · ${current.planet}` : `${current.name} · ${current.reading.theme}`}</span>
          <div className="dg-energy" aria-label={`Energy today: ${energy} of 5, ${toneLabel}`}>
            <span className="dg-moons">{[1, 2, 3, 4, 5].map((i) => <Moon key={i} full={i <= energy}/>)}</span>
            <b>{toneLabel}</b>
          </div>
          {mode === 'number' && <p className="dg-tone">{current.tone.note}</p>}
        </div>
        <div className="dg-card__body">
          <h3>{mode === 'number' ? r.theme : r.theme}</h3>
          <p className="dg-line">{r.line}</p>
          <div className="dg-tiles">
            <div><Ic name="work"/><b>Work</b><p>{r.work}</p></div>
            <div><Ic name="money"/><b>Money</b><p>{r.money}</p></div>
            <div><Ic name="love"/><b>Relationships</b><p>{r.love}</p></div>
            {r.wellbeing && <div><Ic name="wellbeing"/><b>Wellbeing</b><p>{r.wellbeing}</p></div>}
          </div>
          <div className="dg-doavoid"><div className="dg-do"><span>Do</span>{r.do}</div><div className="dg-avoid"><span>Avoid</span>{r.avoid}</div></div>
          <ul className="dg-lucky">
            <li><span>Lucky number</span><b className="dg-lucky__n">{current.lucky}</b></li>
            <li><span>Lucky colour</span><b><i style={{background: current.colour[1]}} aria-hidden="true"/>{current.colour[0]}</b></li>
            {goodTime && <li><span>Good time</span><b>{goodTime}</b></li>}
            <li><span>Mantra</span><b className="dg-mantra">{current.mantra}</b></li>
          </ul>
        </div>
        {mode === 'number' && r.affirmation && <blockquote className="dg-affirm">“{r.affirmation}”</blockquote>}
      </article>}
      <p className="dg-cta">This is the day’s pattern for everyone who shares your {mode === 'number' ? 'number' : 'rashi'}. For your full chart, <Link href="/numerology-calculator">get the complete report</Link> or <Link href="/consultations">talk to Adarshh</Link>.</p>
    </div>
  </section></LocalizedContent>;
}
