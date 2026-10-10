'use client';
import {useState} from 'react';
import {ArrowUpRight} from 'lucide-react';

/** Traditional Lo Shu magic square: every row, column and diagonal sums to 15. */
const GRID = [4, 9, 2, 3, 5, 7, 8, 1, 6];
const PLANETS = {1: 'Sun', 2: 'Moon', 3: 'Jupiter', 4: 'Rahu', 5: 'Mercury', 6: 'Venus', 7: 'Ketu', 8: 'Saturn', 9: 'Mars'};
const reduce = (n) => { while (n > 9) n = String(n).split('').reduce((sum, d) => sum + Number(d), 0); return n; };

/** Digits of the birth date, plus the conductor number, plus the driver number when the day has two digits. */
export function readNumbers(iso) {
  const [year, month, day] = iso.split('-');
  const digits = `${day}${month}${year}`.split('').map(Number);
  const driver = reduce(Number(day));
  const conductor = reduce(digits.reduce((sum, d) => sum + d, 0));
  const placed = digits.filter(Boolean).concat(conductor, Number(day) > 9 ? [driver] : []);
  const counts = Object.fromEntries(GRID.map((n) => [n, placed.filter((d) => d === n).length]));
  return {driver, conductor, counts, missing: GRID.filter((n) => !counts[n]).sort()};
}

export default function LoShuCalculator({readingHref}) {
  const [result, setResult] = useState(null);
  const today = new Date().toISOString().slice(0, 10);
  // Read the date from the form, not from state, so a date typed before hydration still counts.
  function submit(event) {
    event.preventDefault();
    const date = new FormData(event.currentTarget).get('dob');
    if (date) setResult(readNumbers(String(date)));
  }
  return <div className="hv-loshu">
    <form className="hv-loshu__form" onSubmit={submit}>
      <label htmlFor="hv-dob">Your date of birth</label>
      <div className="hv-loshu__field">
        <input id="hv-dob" name="dob" type="date" required min="1900-01-01" max={today} onChange={() => setResult(null)}/>
        <button type="submit" className="hv-button hv-button--gold">Show my numbers</button>
      </div>
      <p className="hv-loshu__privacy">Calculated in your browser. Nothing is sent or saved.</p>
      <div className="hv-loshu__numbers" aria-live="polite">
        {result ? <>
          <div><small>Driver number · Mulank</small><strong>{result.driver}</strong><span>Ruled by {PLANETS[result.driver]}</span></div>
          <div><small>Conductor number · Bhagyank</small><strong>{result.conductor}</strong><span>Ruled by {PLANETS[result.conductor]}</span></div>
          <p className="hv-loshu__missing">{result.missing.length ? <>Missing from your grid: <b>{result.missing.join(', ')}</b></> : 'Every number from 1 to 9 appears in your grid.'}</p>
          <a className="hv-button" href={readingHref}>Get a full reading <ArrowUpRight size={17}/></a>
        </> : <p className="hv-loshu__hint">Your driver number comes from the day you were born. Your conductor number comes from the full date. Together they fill the grid.</p>}
      </div>
    </form>
    <div className="hv-loshu__grid" role="img" aria-label={result ? `Lo Shu grid. ${GRID.map((n) => `${n}: ${result.counts[n] ? `${result.counts[n]} time${result.counts[n] > 1 ? 's' : ''}` : 'missing'}`).join('; ')}` : 'Empty Lo Shu grid with positions 4 9 2, 3 5 7, 8 1 6'}>
      {GRID.map((n) => {
        const count = result?.counts[n] || 0;
        return <span key={n} className={result ? (count ? 'is-filled' : 'is-missing') : ''}>
          <b>{result ? (count ? String(n).repeat(count) : '·') : n}</b>
          <i>{PLANETS[n]}</i>
        </span>;
      })}
    </div>
  </div>;
}
