'use client';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight, Compass} from 'lucide-react';
import {GRID, KUA, MISSING, NUMBERS, PERSONAL_YEAR, REPEATS, readChart, relationsFor} from '../../lib/numerology';

const SOURCE_LABEL = {date: 'Date of birth', bhagyank: 'Bhagyank', mulank: 'Mulank', kua: 'Kua'};
const RELATION_TEXT = {
  friend: 'are friendly numbers, so your natural nature and your life path support each other.',
  neutral: 'are neutral to each other; your path asks you to adapt your natural style.',
  enemy: 'are traditionally challenging together; your path may push against your natural style, which builds strength.',
};
const STATUS = {full: 'Complete', partial: 'Partly active', none: 'Missing'};

function Grid({chart}) {
  return <div className="hv-loshu__grid" role="img" aria-label={chart ? `Lo Shu grid. ${GRID.map((n) => `${n}: ${chart.counts[n] ? `${chart.counts[n]} time${chart.counts[n] > 1 ? 's' : ''}` : 'missing'}`).join('; ')}` : 'Empty Lo Shu grid with positions 4 9 2, 3 5 7, 8 1 6'}>
    {GRID.map((n) => {
      const count = chart?.counts[n] || 0;
      return <span key={n} className={chart ? (count ? 'is-filled' : 'is-missing') : ''}>
        <b>{chart ? (count ? String(n).repeat(count) : '·') : n}</b>
        <i>{NUMBERS[n].planet}</i>
      </span>;
    })}
  </div>;
}

function NumberCard({label, value, note}) {
  return <div className="nv-num"><small>{label}</small><strong>{value}</strong><span>{note}</span></div>;
}

function FullReport({chart, gender}) {
  const m = NUMBERS[chart.mulank], b = NUMBERS[chart.bhagyank];
  const rel = relationsFor(chart.mulank);
  return <div className="nv-report">
    <section className="nv-report__block" aria-labelledby="r-core">
      <h3 id="r-core">Your core numbers</h3>
      <div className="nv-report__pair">
        <article><small>Mulank {chart.mulank} · {m.planet} ({m.hindi})</small><h4>How you are</h4><p>Your nature is shaped by {m.trait}. {m.strengths}</p><p className="nv-watch"><b>Watch for:</b> {m.watch}</p></article>
        <article><small>Bhagyank {chart.bhagyank} · {b.planet} ({b.hindi})</small><h4>Where life takes you</h4><p>Your life path runs through {b.trait}. {b.strengths}</p><p className="nv-watch"><b>Watch for:</b> {b.watch}</p></article>
      </div>
      <p className="nv-report__note">Mulank {chart.mulank} and Bhagyank {chart.bhagyank} {RELATION_TEXT[chart.pairing]}</p>
    </section>

    <section className="nv-report__block" aria-labelledby="r-planes">
      <h3 id="r-planes">Planes and yogs in your grid</h3>
      <p className="nv-report__lede">Each row, column and diagonal of the grid is a plane. A plane is active when all three of its numbers are present.</p>
      <ul className="nv-planes">
        {chart.planes.map((plane) => <li key={plane.key} className={`is-${plane.status}`}>
          <div className="nv-planes__head"><span className="nv-planes__digits">{plane.digits.map((n) => <i key={n} className={chart.counts[n] ? 'on' : ''}>{n}</i>)}</span><b>{plane.name}</b><em>{STATUS[plane.status]}</em></div>
          <p>{plane.status === 'full' ? plane.full : plane.status === 'none' ? plane.none : <>{plane.have} of 3 numbers present, so this plane is partly active. <span className="nv-planes__when">When complete: {plane.full}</span></>}</p>
        </li>)}
      </ul>
    </section>

    <section className="nv-report__block" aria-labelledby="r-numbers">
      <h3 id="r-numbers">Numbers in your grid</h3>
      <ul className="nv-numbers">
        {chart.present.map((n) => <li key={n}><span className="nv-numbers__digit">{String(n).repeat(chart.counts[n])}</span><div><b>{n} · {NUMBERS[n].planet}{chart.counts[n] > 1 ? ` · appears ${chart.counts[n]} times` : ''}</b><p>{REPEATS[n][Math.min(chart.counts[n], 4) - 1]}</p></div></li>)}
      </ul>
      {chart.missing.length > 0 && <>
        <h4 className="nv-report__sub">Missing numbers</h4>
        <ul className="nv-numbers is-missing">
          {chart.missing.map((n) => <li key={n}><span className="nv-numbers__digit">{n}</span><div><b>{n} · {NUMBERS[n].planet} missing</b><p>{MISSING[n]}</p></div></li>)}
        </ul>
      </>}
    </section>

    <section className="nv-report__block nv-report__split" aria-labelledby="r-lucky">
      <div>
        <h3 id="r-lucky">Lucky numbers, day and colours</h3>
        <dl className="nv-facts">
          <div><dt>Friendly numbers</dt><dd>{rel.friend.join(', ')}</dd></div>
          <div><dt>Neutral numbers</dt><dd>{rel.neutral.join(', ') || 'None'}</dd></div>
          <div><dt>Challenging numbers</dt><dd>{rel.enemy.join(', ') || 'None'}</dd></div>
          <div><dt>Lucky day</dt><dd>{m.day}</dd></div>
          <div><dt>Colours</dt><dd>{m.colours}</dd></div>
        </dl>
        <p className="nv-report__fine">Based on your Mulank’s planet, {m.planet}, and the classical friendships between planets.</p>
      </div>
      <div>
        <h3>Your years ahead</h3>
        <ul className="nv-years">
          {chart.years.map(({year, number}) => <li key={year}><span>{year}</span><strong>{number}</strong><p>{PERSONAL_YEAR[number]}</p></li>)}
        </ul>
        <p className="nv-report__fine">Personal year = day + month of birth + the year, reduced to one digit.</p>
      </div>
    </section>

    {chart.kua && <section className="nv-report__block nv-kua" aria-labelledby="r-kua">
      <Compass size={28} aria-hidden="true"/>
      <div>
        <h3 id="r-kua">Kua {chart.kua}: your best direction is {KUA[chart.kua].best}</h3>
        <p>You belong to the {KUA[chart.kua].group} group. In Vaastu and Feng Shui practice, facing your best direction while working, sleeping with your head towards it or placing your desk accordingly is believed to support success. Calculated for {gender === 'male' ? 'a male' : 'a female'} born in {chart.year}.</p>
      </div>
    </section>}
  </div>;
}

export default function LoShuCalculator({readingHref, full = false}) {
  const [chart, setChart] = useState(null);
  const [gender, setGender] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  // The full-report page opens with the date passed from the homepage tool.
  useEffect(() => {
    if (!full) return;
    const params = new URLSearchParams(window.location.search);
    const dob = params.get('dob');
    const g = ['male', 'female'].includes(params.get('g')) ? params.get('g') : '';
    if (dob && /^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      document.getElementById('hv-dob').value = dob;
      setGender(g);
      setChart(readChart(dob, g));
    }
  }, [full]);

  // Read values from the form, not state, so input typed before hydration still counts.
  function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const date = String(data.get('dob') || '');
    const g = String(data.get('gender') || '');
    if (!date) return;
    setGender(g);
    setChart(readChart(date, g));
    if (full) window.history.replaceState(null, '', `?dob=${date}${g ? `&g=${g}` : ''}`);
  }
  const reportHref = chart ? `/numerology-calculator?dob=${chart.year}-${String(chart.month).padStart(2, '0')}-${String(chart.day).padStart(2, '0')}${gender ? `&g=${gender}` : ''}` : '/numerology-calculator';

  return <>
    <div className="hv-loshu">
      <form className="hv-loshu__form" onSubmit={submit}>
        <div className="hv-loshu__inputs">
          <div className="hv-loshu__input">
            <label htmlFor="hv-dob">Date of birth</label>
            <input id="hv-dob" name="dob" type="date" required min="1900-01-01" max={today} onChange={() => setChart(null)}/>
          </div>
          <div className="hv-loshu__input">
            <label htmlFor="hv-gender">Gender <span>(for Kua number)</span></label>
            <select id="hv-gender" name="gender" defaultValue="" onChange={() => setChart(null)}>
              <option value="">Skip Kua</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>
        <button type="submit" className="hv-button hv-button--gold">Show my numbers</button>
        <p className="hv-loshu__privacy">Calculated in your browser. Nothing is sent or saved.</p>
        <div className="hv-loshu__numbers" aria-live="polite">
          {chart ? <>
            <NumberCard label="Mulank · driver" value={chart.mulank} note={NUMBERS[chart.mulank].planet}/>
            <NumberCard label="Bhagyank · destiny" value={chart.bhagyank} note={NUMBERS[chart.bhagyank].planet}/>
            {chart.kua ? <NumberCard label="Kua" value={chart.kua} note={`Best: ${KUA[chart.kua].best}`}/> : <NumberCard label={`Personal year ${chart.years[0].year}`} value={chart.years[0].number} note={NUMBERS[chart.years[0].number].planet}/>}
            <div className="hv-loshu__summary">
              {chart.planes.filter((p) => p.status === 'full').length > 0 && <p><b>Active:</b> {chart.planes.filter((p) => p.status === 'full').map((p) => p.name).join(', ')}</p>}
              <p>{chart.missing.length ? <><b>Missing:</b> {chart.missing.map((n) => `${n} (${NUMBERS[n].planet})`).join(', ')}</> : 'Every number from 1 to 9 is in your grid.'}</p>
            </div>
            {!full && <div className="hv-loshu__actions">
              <Link className="hv-button" href={reportHref}>See your full report <ArrowUpRight size={17}/></Link>
              <Link className="hv-link" href={readingHref}>Get a personal reading <ArrowUpRight size={16}/></Link>
            </div>}
          </> : <p className="hv-loshu__hint">Mulank comes from the day you were born, Bhagyank from the full date. Every digit of your birth date, plus these numbers, fills the grid.</p>}
        </div>
      </form>
      <div className="hv-loshu__gridwrap">
        <Grid chart={chart}/>
        {chart && <p className="hv-loshu__built">Built from {chart.sources.map((s, i) => <span key={i} className={`src-${s.from}`} title={SOURCE_LABEL[s.from]}>{s.n}</span>)}</p>}
        {chart && <ul className="hv-loshu__legend">{['date', 'bhagyank', 'mulank', 'kua'].filter((k) => chart.sources.some((s) => s.from === k)).map((k) => <li key={k} className={`src-${k}`}>{SOURCE_LABEL[k]}</li>)}</ul>}
      </div>
    </div>
    {full && chart && <FullReport chart={chart} gender={gender}/>}
  </>;
}
