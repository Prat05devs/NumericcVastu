'use client';
import LocalizedContent from '../../i18n/LocalizedContent';

import {useEffect, useState} from 'react';
import KuaDirections from '../KuaDirections';
import {useLocale} from '../../i18n/LocaleProvider';
import {readProfile} from '../../lib/profileNumbers';
import Link from 'next/link';
import {ArrowUpRight, Compass} from 'lucide-react';
import {COMPAT, GRID, VEDIC_GRID, KUA, MISSING, NUMBERS, PERSONAL_YEAR, REPEATS, readChart, validBirthDate} from '../../lib/numerology';

import {FullReportPreview, LifePeriod, MoreInReport, Remedies, Snapshot} from './ReportExtras';

const SOURCE_LABEL = {date: 'Date of birth', bhagyank: 'Bhagyank', mulank: 'Mulank', kua: 'Kua'};
const RELATION_TEXT = {
  friend: 'are friendly numbers, so your natural nature and your life path support each other.',
  neutral: 'are neutral to each other; your path asks you to adapt your natural style.',
  enemy: 'are enemy numbers to each other; your path may push against your natural style, which builds strength.',
  shortTerm: 'are 4 and 8 together: workable in the short run, but traditionally not good over the long run.',
  double: 'repeat the same number (4-4 or 8-8), a combination traditionally considered not good. Remedies matter more for you.',
};
/** Swatches for the chart's colours. */
const SWATCH = {Red: '#d62d2d', 'Milky white': '#f4efe2', Yellow: '#f2c230', 'Black and dark grey': '#3b3b40', Green: '#2e8b57', White: '#ffffff', 'Black and grey': '#6b6b70', Black: '#15151a', 'Blood red': '#8a0b12'};
const coloursOf = (numbers) => [...new Set(numbers.map((n) => NUMBERS[n].colour))];

function Chips({numbers, kind, short = []}) {
  if (!numbers.length && !short.length) return <LocalizedContent><span className="nv-compat__none">None</span></LocalizedContent>;
  return <LocalizedContent><span className="nv-compat__chips">
    {numbers.map((n) => <i key={n} className={`is-${kind}`}>{n}</i>)}
    {short.map((n) => <i key={`s${n}`} className="is-short" title="Short-term only">{n}*</i>)}
  </span></LocalizedContent>;
}

function CompatRow({label, list}) {
  const short = list.shortTerm || [];
  return <LocalizedContent><tr>
    <th scope="row">{label}</th>
    <td data-label="Friendly"><Chips numbers={list.friend} kind="friend" short={short}/></td>
    <td data-label="Enemy"><Chips numbers={list.enemy} kind="enemy" short={short}/></td>
    <td data-label="Neutral"><Chips numbers={list.neutral} kind="neutral"/></td>
  </tr></LocalizedContent>;
}

function Swatches({colours}) {
  if (!colours.length) return <LocalizedContent>None</LocalizedContent>;
  return <LocalizedContent><span className="nv-swatches">{colours.map((c) => <span key={c}><i style={{'--c': SWATCH[c]}}/>{c}</span>)}</span></LocalizedContent>;
}
const STATUS = {full: 'Complete', partial: 'Partly active', none: 'Missing'};

function Grid({chart, vedic = false}) {
  const {t}=useLocale();
  const layout = vedic ? VEDIC_GRID : GRID;
  const counts = chart && (vedic ? chart.vedicCounts : chart.counts);
  const name = vedic ? 'Vedic grid' : 'Lo Shu grid';
  const description = chart ? `${t(name)}. ${layout.map(n=>`${n}: ${counts[n] ? `${counts[n]} ${t('times')}` : t('Missing')}`).join('; ')}` : `${t('Empty grid')}: ${layout.join(', ')}`;
  return <LocalizedContent><div className="hv-loshu__grid" role="img" aria-label={description}>
    {layout.map((n, idx) => {
      const count = counts?.[n] || 0;
      return <span key={n} className={chart ? (count ? 'is-filled' : 'is-missing') : ''} style={{'--i': idx}}>
        <b>{chart ? (count ? String(n).repeat(count) : '·') : n}</b>
        <i>{NUMBERS[n].planet}</i>
      </span>;
    })}
  </div></LocalizedContent>;
}

function NumberCard({label, value, note}) {
  return <LocalizedContent><div className="nv-num"><small>{label}</small><strong>{value}</strong><span>{note}</span></div></LocalizedContent>;
}

function FullReport({chart, reportChart = chart, gender, readingHref, system = 'loshu'}) {
  const m = NUMBERS[chart.mulank], b = NUMBERS[chart.bhagyank];
  const rel = chart.compat;
  const hasShort = rel.shortTerm.length > 0 || [chart.mulank, chart.bhagyank].some((n) => COMPAT[n].shortTerm);
  return <LocalizedContent><div className="nv-report">
    <Snapshot chart={chart}/>

    <section className="nv-report__block" aria-labelledby="r-core">
      <h3 id="r-core">Your core numbers</h3>
      <div className="nv-report__pair">
        <article><small>Mulank {chart.mulank} · {m.planet} ({m.hindi}) · {m.role}</small><h4>How you are</h4><p>Your nature is shaped by {m.trait}. {m.strengths}</p><p className="nv-watch"><b>Watch for:</b> {m.watch}</p></article>
        <article><small>Bhagyank {chart.bhagyank} · {b.planet} ({b.hindi}) · {b.role}</small><h4>Where life takes you</h4><p>Your life path runs through {b.trait}. {b.strengths}</p><p className="nv-watch"><b>Watch for:</b> {b.watch}</p></article>
      </div>
      <p className="nv-report__note">Mulank {chart.mulank} and Bhagyank {chart.bhagyank} {RELATION_TEXT[chart.pairing]}</p>
    </section>

    <section className="nv-report__block" aria-labelledby="r-planes">
      <h3 id="r-planes">{system === 'vedic' ? 'Vedic planes in your kundli' : 'Planes and yogs in your grid'}</h3>
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

    <Remedies chart={chart}/>

    <section className="nv-report__block" aria-labelledby="r-compat">
      <h3 id="r-compat">Friend and enemy numbers</h3>
      <p className="nv-report__lede">Every number has its own friends, enemies and neutral numbers. Your result puts the lists for your Mulank and Bhagyank together: a number either of them treats as an enemy stays an enemy, and a friend of either becomes your friend.</p>
      <table className="nv-compat">
        <thead><tr><th scope="col"><span className="sr-only">Number</span></th><th scope="col">Friendly</th><th scope="col">Enemy</th><th scope="col">Neutral</th></tr></thead>
        <tbody>
          <CompatRow label={<>Mulank <b>{chart.mulank}</b></>} list={COMPAT[chart.mulank]}/>
          <CompatRow label={<>Bhagyank <b>{chart.bhagyank}</b></>} list={COMPAT[chart.bhagyank]}/>
          <tr className="nv-compat__result"><th scope="row">Your result</th>
            <td data-label="Friendly"><Chips numbers={rel.friend} kind="friend" short={rel.shortTerm}/></td>
            <td data-label="Enemy"><Chips numbers={rel.enemy} kind="enemy" short={rel.shortTerm}/></td>
            <td data-label="Neutral"><Chips numbers={rel.neutral} kind="neutral"/></td>
          </tr>
        </tbody>
      </table>
      {hasShort && <p className="nv-report__fine">* For 4 and 8, the numbers 4 and 8 are both friend and enemy: good for short-term relations, but not for long-term ones. 4-4 and 8-8 coming together is not good.</p>}
    </section>

    <section className="nv-report__block nv-report__split" aria-labelledby="r-lucky">
      <div>
        <h3 id="r-lucky">Lucky day and colours</h3>
        <dl className="nv-facts">
          <div><dt>Lucky day</dt><dd>{m.day}</dd></div>
          <div><dt>Colours to use</dt><dd><Swatches colours={coloursOf(rel.friend)}/></dd></div>
          <div><dt>Colours to avoid</dt><dd><Swatches colours={coloursOf(rel.enemy)}/></dd></div>
        </dl>
        <p className="nv-report__fine">Use the colours of your friendly numbers and avoid the colours of your enemy numbers. For everyone, black is best kept to a minimum.</p>
      </div>
      <div>
        <h3>Your years ahead</h3>
        <ul className="nv-years">
          {chart.years.map(({year, number}) => <li key={year}><span>{year}</span><strong>{number}</strong><p>{PERSONAL_YEAR[number]}</p></li>)}
        </ul>
        <p className="nv-report__fine">Personal year = day + month of birth + the year, reduced to one digit.</p>
        <MoreInReport>Six personal years and practical prompts</MoreInReport>
      </div>
    </section>

    <LifePeriod chart={chart}/>

    {chart.kua && <section className="nv-report__block nv-kua" aria-labelledby="r-kua">
      <Compass size={28} aria-hidden="true"/>
      <div>
        <h3 id="r-kua">Kua {chart.kua} · Four favourable directions</h3>
        <p>Kua group: {KUA[chart.kua].group}. Choose the direction for the purpose you have in mind.</p>
        <KuaDirections kua={chart.kua}/>

      </div>
    </section>}

    <FullReportPreview chart={reportChart} gender={gender} readingHref={readingHref}/>
  </div></LocalizedContent>;
}

function CalculationDetails({chart, system}) {
  const c=chart;
  const relationship={friend:'Friendly',enemy:'Enemy',neutral:'Neutral',shortTerm:'Short-term only'};
  const eligible=c.sources.some(s=>s.from==='mulank');
  return <LocalizedContent><section className="nv-calculations" aria-label="Separate numerology calculations">
    <div className="nv-calculation-card"><h3>Birth-date calculations</h3><dl>
      <div><dt>Mulank</dt><dd>{String(c.day).split('').join(' + ')} = {c.mulank}</dd></div>
      <div><dt>Bhagyank</dt><dd>{c.dateDigits.split('').join(' + ')} → {c.bhagyank}</dd></div>
      <div><dt>Month number</dt><dd>{c.month} → {c.monthNumber}</dd></div>
      <div><dt>Year number</dt><dd>{String(c.year).split('').join(' + ')} → {c.yearNumber}</dd></div>
    </dl></div>
    {system === 'loshu' && <div className="nv-calculation-card"><h3>Kua calculation</h3>{c.kua?<><p>{c.year} · {c.kuaCalculation.digits.join(' + ')} → {c.kuaCalculation.factor}</p><p>{c.kuaCalculation.constant} {c.kuaCalculation.operator} {c.kuaCalculation.factor} = {c.kuaCalculation.raw} → {c.kua}</p><p>Kua uses the last two year digits, the birth-century rule and the selected gender. A result of 5 becomes 2 for male and 8 for female.</p><p>Direction group: {KUA[c.kua].group}</p></>:<p>Choose male or female to calculate Kua. Kua is optional and is used only in the Lo Shu kundli.</p>}</div>}
    {system === 'loshu' && <div className="nv-calculation-card"><h3>Lo Shu calculation</h3><p>Layout: 4-9-2 / 3-5-7 / 8-1-6.</p><p>Non-zero date digits: {c.sources.filter(s=>s.from==='date').map(s=>s.n).join(', ')}</p><p>Added Bhagyank: {c.bhagyank}</p><p>Added Mulank: {eligible?c.mulank:'Already represented in the birth date'}</p><p>Added Kua: {c.kua||'Not included'}</p></div>}
    {system === 'vedic' && <div className="nv-calculation-card"><h3>Vedic calculation</h3><p>Layout: 3-1-9 / 6-7-5 / 2-8-4.</p><p>Uses day, month and the last two year digits, plus Bhagyank and eligible Mulank. The century and Kua are excluded.</p><p>Cells in order: {[3,1,9,6,7,5,2,8,4].map(n=>`${n} × ${c.vedicCounts[n]}`).join(', ')}</p></div>}
    {c.nameAnalysis&&<div className="nv-calculation-card" data-testid="name-analysis"><h3>Name calculation · Chaldean</h3><p translate="no">{c.nameAnalysis.name}</p><p>{c.nameAnalysis.total} → {c.nameAnalysis.number}</p><p>{NUMBERS[c.nameAnalysis.number].strengths}</p><p>First name: {c.nameAnalysis.first.total} → {c.nameAnalysis.first.number}</p><p translate="no">{c.nameAnalysis.words.flatMap(w=>w.letters).map(l=>`${l.letter}=${l.value}`).join(' + ')}</p></div>}
    {c.phoneAnalysis&&<div className="nv-calculation-card" data-testid="phone-analysis"><h3>Phone number evaluation</h3><p translate="no">{c.phoneAnalysis.digits}</p><p>{c.phoneAnalysis.values.join(' + ')} = {c.phoneAnalysis.total} → {c.phoneAnalysis.number}</p><p>With Mulank: {relationship[c.phoneAnalysis.mulank]}</p><p>With Bhagyank: {relationship[c.phoneAnalysis.bhagyank]}</p><p>With name number: {relationship[c.phoneAnalysis.name]}</p><p>{NUMBERS[c.phoneAnalysis.number].strengths}</p><small>This is a digit-total reading using the existing compatibility chart. It does not measure network quality or guarantee outcomes.</small></div>}
  </section></LocalizedContent>;
}

export default function LoShuCalculator({readingHref, full = false, system = 'loshu'}) {
  const [chart, setChart] = useState(null);
  const [gender, setGender] = useState('');
  const [error, setError] = useState('');
  const {t} = useLocale();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  // The full-report page opens with the date passed from the homepage tool.
  useEffect(() => {
    if (!full) return;
    const params = new URLSearchParams(window.location.search);
    const dob = params.get('dob');
    const g = ['male', 'female'].includes(params.get('g')) ? params.get('g') : '';
    if (validBirthDate(dob)) {
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
    setError('');
    try {
      const result = readProfile({dob: date, gender: g, name: String(data.get('name') || ''), phone: String(data.get('phone') || '')});
      setGender(g);
      setChart(result);
    } catch (cause) {setError(cause.message);setChart(null);return;}
    if (full) window.history.replaceState(null, '', `?dob=${date}${g ? `&g=${g}` : ''}`);
  }
  const toolPath = system === 'vedic' ? '/vedic-numerology-calculator' : '/numerology-calculator';
  const reportHref = chart ? `${toolPath}?dob=${chart.year}-${String(chart.month).padStart(2, '0')}-${String(chart.day).padStart(2, '0')}${gender ? `&g=${gender}` : ''}` : toolPath;

  const readingChart = chart && system === 'vedic' ? {...chart, counts: chart.vedicCounts, missing: GRID.filter(n=>!chart.vedicCounts[n]).sort(), present: GRID.filter(n=>chart.vedicCounts[n]).sort(), planes: chart.vedicPlanes, kua: null} : chart;
  return <LocalizedContent><>
    <div className="hv-loshu">
      <form className="hv-loshu__form" onSubmit={submit}>
        <div className="hv-loshu__inputs">
          <div className="hv-loshu__input">
            <label htmlFor="hv-name">Your full name</label>
            <input id="hv-name" name="name" autoComplete="name" required maxLength={120} placeholder={t('e.g. Priya Sharma')} aria-describedby="hv-name-hint" onChange={() => setChart(null)}/>
            <small id="hv-name-hint">Use English letters for the Chaldean name calculation.</small>
          </div>
          <div className="hv-loshu__input">
            <label htmlFor="hv-phone">Phone number</label>
            <input id="hv-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" required maxLength={24} placeholder="9876543210" aria-describedby="hv-phone-hint" onChange={() => setChart(null)}/>
            <small id="hv-phone-hint">National number only, without +91 or another country code. Used for calculation; no call or message is sent.</small>
          </div>
          <div className="hv-loshu__input">
            <label htmlFor="hv-dob">Date of birth</label>
            <input id="hv-dob" name="dob" type="date" required min="1900-01-01" max={today} onChange={() => setChart(null)}/>
          </div>
          <div className="hv-loshu__input">
            <label htmlFor="hv-gender">Gender <span>(for Kua number)</span></label>
            <select id="hv-gender" name="gender" value={gender} onChange={event => {setGender(event.target.value);setChart(null)}}>
              <option value="">Skip Kua</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>
        <button type="submit" className="hv-button hv-button--gold">Show my numbers</button>
        {error && <p role="alert" className="fr-error">{error}</p>}
        <p className="hv-loshu__privacy">Calculated in your browser. Nothing is sent or saved.</p>
        <div className="hv-loshu__numbers" aria-live="polite">
          {chart ? <>
            <NumberCard label="Mulank · driver" value={chart.mulank} note={NUMBERS[chart.mulank].planet}/>
            <NumberCard label="Bhagyank · destiny" value={chart.bhagyank} note={NUMBERS[chart.bhagyank].planet}/>
            {system === 'loshu' && chart.kua ? <NumberCard label="Kua" value={chart.kua} note={`${KUA[chart.kua].group} group · 4 directions`}/> : <NumberCard label={`Personal year ${chart.years[0].year}`} value={chart.years[0].number} note={NUMBERS[chart.years[0].number].planet}/>}
            <div className="hv-loshu__summary">
              {readingChart.planes.filter((p) => p.status === 'full').length > 0 && <p><b>Active:</b> {readingChart.planes.filter((p) => p.status === 'full').map((p) => p.name).join(', ')}</p>}
              <p>{readingChart.missing.length ? <><b>Missing:</b> {readingChart.missing.map((n) => `${n} (${NUMBERS[n].planet})`).join(', ')}</> : 'Every number from 1 to 9 is in your grid.'}</p>
            </div>
            {!full && <div className="hv-loshu__actions">
              <Link className="hv-button" href={reportHref}>See your free report <ArrowUpRight size={17}/></Link>
              <Link className="hv-link" href={readingHref}>Get a personal reading <ArrowUpRight size={16}/></Link>
            </div>}
          </> : <p className="hv-loshu__hint">Mulank comes from the day you were born, Bhagyank from the full date. Every digit of your birth date, plus these numbers, fills the grid.</p>}
        </div>
      </form>
      <div className="nv-kundlis is-single">
        <section className="hv-loshu__gridwrap" aria-labelledby="nv-tool-kundli">
          <h3 id="nv-tool-kundli">{system === 'vedic' ? 'Vedic numerology kundli' : 'Lo Shu kundli'}</h3>
          <p className="nv-kundli-note">{system === 'vedic' ? 'Day + month + last two year digits + Bhagyank + eligible Mulank. No Kua.' : 'Birth-date digits + Bhagyank + eligible Mulank + optional Kua.'}</p>
          <Grid chart={chart} vedic={system === 'vedic'}/>
          {chart && <p className="hv-loshu__built">Built from {(system==='vedic'?chart.vedicSources:chart.sources).map((s,i)=><span key={i} className={`src-${s.from}`} title={SOURCE_LABEL[s.from]}>{s.n}</span>)}</p>}
          {chart && <ul className="hv-loshu__legend">{['date','bhagyank','mulank','kua'].filter(k=>(system==='loshu'||k!=='kua')&&chart.sources.some(s=>s.from===k)).map(k=><li key={k} className={`src-${k}`}>{SOURCE_LABEL[k]}</li>)}</ul>}
        </section>
      </div>
    </div>
    {chart && <CalculationDetails chart={chart} system={system}/>}
    {full && chart && <p className="nv-combined-cta"><a className="hv-button hv-button--gold" href="#full-report">Get the combined full report <ArrowUpRight size={17}/></a><span>Includes both Lo Shu and Vedic. Free during testing.</span></p>}
    {full && chart && <FullReport chart={readingChart} reportChart={chart} gender={gender} system={system} readingHref={readingHref}/>}
  </></LocalizedContent>;
}
