'use client';
import Link from 'next/link';
import {useState} from 'react';
import {Art} from './ui';

/** Traditional associations (same table as numericcvaastu.com): planet, gemstone and supportive pieces per Mulank. */
const NUM: Record<number, [string, string, [string, string, string][]]> = {
  1: ['Sun', 'Ruby (Manik)', [['Ruby', 'Gemstone', 'gem-yellow'], ['Sunstone bracelet', 'Bracelet', 'bracelet-tiger'], ['1 Mukhi Rudraksha', 'Rudraksha', 'rudraksha']]],
  2: ['Moon', 'Pearl (Moti)', [['Moonstone', 'Crystal', 'pendant'], ['Pearl', 'Gemstone', 'bracelet-rose'], ['2 Mukhi Rudraksha', 'Rudraksha', 'rudraksha']]],
  3: ['Jupiter', 'Yellow Sapphire (Pukhraj)', [['Yellow Sapphire', 'Gemstone', 'gem-yellow'], ['Citrine', 'Crystal', 'tower'], ['5 Mukhi Rudraksha', 'Rudraksha', 'rudraksha']]],
  4: ['Rahu', 'Hessonite (Gomed)', [['Hessonite', 'Gemstone', 'gem-yellow'], ['Black onyx bracelet', 'Bracelet', 'bracelet-onyx'], ['8 Mukhi Rudraksha', 'Rudraksha', 'rudraksha']]],
  5: ['Mercury', 'Emerald (Panna)', [['Emerald', 'Gemstone', 'gem-blue'], ['Green aventurine', 'Bracelet', 'bracelet-rose'], ['4 Mukhi Rudraksha', 'Rudraksha', 'rudraksha']]],
  6: ['Venus', 'Diamond or Opal', [['Rose quartz', 'Crystal', 'pendant'], ['Rose quartz bracelet', 'Bracelet', 'bracelet-rose'], ['6 Mukhi Rudraksha', 'Rudraksha', 'rudraksha']]],
  7: ['Ketu', 'Cat’s Eye (Lehsunia)', [['Cat’s Eye', 'Gemstone', 'gem-yellow'], ['Amethyst', 'Crystal', 'cluster'], ['9 Mukhi Rudraksha', 'Rudraksha', 'rudraksha']]],
  8: ['Saturn', 'Blue Sapphire (Neelam)', [['Blue Sapphire', 'Gemstone', 'gem-blue'], ['Black onyx bracelet', 'Bracelet', 'bracelet-onyx'], ['7 Mukhi Rudraksha', 'Rudraksha', 'rudraksha']]],
  9: ['Mars', 'Red Coral (Moonga)', [['Red Coral', 'Gemstone', 'gem-yellow'], ['Carnelian', 'Bracelet', 'bracelet-tiger'], ['3 Mukhi Rudraksha', 'Rudraksha', 'rudraksha']]],
};
const reduce = (n: number) => { while (n > 9) n = String(n).split('').reduce((a, d) => a + Number(d), 0); return n; };
const today = () => new Date().toISOString().slice(0, 10);

export function MulankFinder({mainSite}: {mainSite: string}) {
  const [dob, setDob] = useState('');
  const [day, setDay] = useState<number | null>(null);
  const m = day ? reduce(day) : null;
  const pick = m ? NUM[m]! : null;
  return (
    <div className="finder">
      <div className="intro">
        <div><span className="eyebrow"><span className="no">03</span>Numerology guide</span><h2 className="disp" id="finder-h">Which stone suits<br /><em>your number?</em></h2><p>Your Mulank is the total of the day you were born. Each number is traditionally linked with a planet, a gemstone and supportive crystals.</p></div>
        <form onSubmit={(e) => { e.preventDefault(); if (dob) setDay(Number(dob.slice(8, 10))); }}>
          <label htmlFor="dob">Your date of birth</label>
          <input id="dob" type="date" value={dob} max={today()} onChange={(e) => setDob(e.target.value)} required />
          <button className="btn">Show my stones</button>
        </form>
      </div>
      <div className="result" aria-live="polite">
        {pick && m && day ? <>
          <div className="num"><b>{m}</b><span>Your Mulank · {String(day).split('').join(' + ')}{day > 9 ? ` = ${m}` : ''}<strong>Ruled by {pick[0]}</strong>Traditional gemstone: {pick[1]}</span></div>
          <div className="picks">{pick[2].map(([name, kind, art]) => <Link key={name} className="pick" href={`/search?q=${encodeURIComponent(name.replace(/ bracelet$/i, ''))}`}><span className="pic" style={{display: 'grid'}}><Art name={art} /></span><b>{name}</b><span>{kind}</span></Link>)}</div>
          <div className="row"><Link className="btn" href={`/search?q=${encodeURIComponent(pick[2][0]![0])}`}>Shop for number {m}</Link><a className="btn light" href={`${mainSite}/numerology-calculator`} target="_blank" rel="noopener noreferrer">Get a full reading</a></div>
          <p className="fine">Traditional associations, not a guarantee of results. Check a gemstone against your full chart before buying; Adarshh can review it with you.</p>
        </> : <>
          <div className="num"><b style={{color: 'var(--sand)'}}>?</b><span>Enter your date of birth<strong>See your number and its stones</strong>It takes a few seconds and nothing is stored.</span></div>
          <div className="picks">{[['Rudraksha', 'By mukhi', 'rudraksha'], ['Gemstones', 'By planet', 'gem-yellow'], ['Crystals', 'Everyday wear', 'bracelet-rose']].map(([n, s, a]) => <div key={n} className="pick"><span className="pic" style={{display: 'grid'}}><Art name={a!} /></span><b>{n}</b><span>{s}</span></div>)}</div>
        </>}
      </div>
    </div>
  );
}
