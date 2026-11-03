'use client';
import LocalizedContent from '../../i18n/LocalizedContent';

import {Check, Gem, Lock, Orbit} from 'lucide-react';
import {MISSING, NUMBERS, PERIOD_THEME} from '../../lib/numerology';
import {GEMSTONES, MISSING_REMEDIES} from '../../data/remedies';

/** Small "more in the full report" pointer used under the free sections. */
export function MoreInReport({children}) {
  return <LocalizedContent><a className="nv-more" href="#full-report"><Lock size={14} aria-hidden="true"/>{children}</a></LocalizedContent>;
}

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/** The report template's opening page, "Your numerology snapshot", worked out from the date of birth. */
export function Snapshot({chart}) {
  const m = NUMBERS[chart.mulank];
  const gap = chart.planes.find((p) => p.status === 'none');
  const focus = gap ? `${gap.name}. ${gap.none}` : chart.missing.length ? `Missing ${chart.missing[0]} (${NUMBERS[chart.missing[0]].planet}). ${MISSING[chart.missing[0]]}` : 'Every number is present, so the work is in using a full grid with balance.';
  const rows = [
    ['Core number', <><b className="nv-snap__num">{chart.mulank}</b> Mulank · {m.planet}, the {m.role.toLowerCase()}</>],
    ['Key theme', cap(m.trait)],
    ['Primary strength', m.strengths],
    ['Potential challenge', m.watch],
    ['Area to focus on', focus],
  ];
  return <LocalizedContent><section className="nv-report__block nv-snap" aria-labelledby="r-snap">
    <h3 id="r-snap">Your numerology snapshot</h3>
    <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
  </section></LocalizedContent>;
}

/** Mulank gemstone, with a caution when the Mulank is not a friendly number in the person's own chart. */
export function Gemstone({chart}) {
  const g = GEMSTONES[chart.mulank];
  const m = chart.mulank;
  const fit = chart.compat.enemy.includes(m) ? 'enemy' : chart.compat.shortTerm.includes(m) ? 'short' : 'ok';
  return <LocalizedContent><div className={`nv-gem is-${fit}`}>
    <Gem size={26} aria-hidden="true"/>
    <div>
      <small>Your Mulank gemstone</small>
      <h4>{g.stone} <span>({g.hindi}) · for {NUMBERS[m].planet}</span></h4>
      {fit === 'ok' && <p>{m} is a friendly number in your chart, so {g.stone.toLowerCase()} sits well with your numbers.</p>}
      {fit === 'enemy' && <p><b>Check before you buy.</b> With Bhagyank {chart.bhagyank}, your own Mulank {m} falls among your enemy numbers, so this stone may not suit you.</p>}
      {fit === 'short' && <p><b>Check before you buy.</b> In your chart, {m} is good only for short spells, not for the long term.</p>}
      <p className="nv-gem__fine">Gemstones are strong. Traditionally they are worn only after the whole chart has been read: the right metal, finger, day and weight matter.</p>
    </div>
  </div></LocalizedContent>;
}

export function Remedies({chart}) {
  return <LocalizedContent><section className="nv-report__block" aria-labelledby="r-remedies">
    <h3 id="r-remedies">Remedies to start with</h3>
    <p className="nv-report__lede">{chart.missing.length ? 'Simple, traditional remedies for the numbers missing from your grid, and the stone of your Mulank.' : 'Every number is in your grid, so there is nothing missing to correct. Here is the stone of your Mulank.'}</p>
    {chart.missing.length > 0 && <ul className="nv-remedies">
      {chart.missing.map((n) => <li key={n}>
        <div className="nv-remedies__head"><span>{n}</span><b>Missing {n} · {NUMBERS[n].planet}</b></div>
        <ul>{MISSING_REMEDIES[n].map((r) => <li key={r}><Check size={16} aria-hidden="true"/>{r}</li>)}</ul>
        <MoreInReport>Remedies and action planning for {n}</MoreInReport>
      </li>)}
    </ul>}
    <Gemstone chart={chart}/>
  </section></LocalizedContent>;
}

export function LifePeriod({chart}) {
  const {periods, current} = chart.life;
  if (current < 0) return null;
  const now = periods[current];
  const next = periods.slice(current + 1, current + 3);
  return <LocalizedContent><section className="nv-report__block" aria-labelledby="r-period">
    <h3 id="r-period">Your life period right now</h3>
    <p className="nv-report__lede">Numerology reads life in periods, called Maha Dasha. The first belongs to your Mulank and lasts as many years as the number, and then each next number takes its turn.</p>
    <div className="nv-period">
      <div className="nv-period__now">
        <small>Now · {now.from} to {now.to}</small>
        <strong><Orbit size={22} aria-hidden="true"/>{NUMBERS[now.n].planet} period</strong>
        <p>{PERIOD_THEME[now.n]}</p>
      </div>
      <ol className="nv-period__next">
        {next.map((p) => <li key={p.from}>
          <small>Next · {p.from} to {p.to}</small>
          <b>{NUMBERS[p.n].planet} period</b>
          <span className="nv-skeleton" aria-hidden="true"><i/><i/></span>
          <span className="sr-only">Read in your full report.</span>
        </li>)}
      </ol>
    </div>
    <MoreInReport>Every period from {periods[0].from} onwards, read in detail</MoreInReport>
  </section></LocalizedContent>;
}

/** Full report generator, kept under the existing preview export for callers. */
export {default as FullReportPreview} from './FullReportGenerator';
