'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight, Briefcase, CalendarRange, Check, Compass, Gem, HeartHandshake, HeartPulse, IndianRupee, ListChecks, Lock, Orbit, PenLine, Sparkles, Sprout, Star} from 'lucide-react';
import WhatsAppIcon from '../WhatsAppIcon';
import {MISSING, NUMBERS, PERIOD_THEME} from '../../lib/numerology';
import {GEMSTONES, MISSING_REMEDIES} from '../../data/remedies';
import {contact} from '../../data/contact';
import {formatDob, whatsappUrl} from '../../lib/whatsapp';

const iso = (c) => `${c.year}-${String(c.month).padStart(2, '0')}-${String(c.day).padStart(2, '0')}`;

/** Small "more in the full report" pointer used under the free sections. */
export function MoreInReport({children}) {
  return <a className="nv-more" href="#full-report"><Lock size={14} aria-hidden="true"/>{children}</a>;
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
  return <section className="nv-report__block nv-snap" aria-labelledby="r-snap">
    <h3 id="r-snap">Your numerology snapshot</h3>
    <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
  </section>;
}

/** Mulank gemstone, with a caution when the Mulank is not a friendly number in the person's own chart. */
export function Gemstone({chart}) {
  const g = GEMSTONES[chart.mulank];
  const m = chart.mulank;
  const fit = chart.compat.enemy.includes(m) ? 'enemy' : chart.compat.shortTerm.includes(m) ? 'short' : 'ok';
  return <div className={`nv-gem is-${fit}`}>
    <Gem size={26} aria-hidden="true"/>
    <div>
      <small>Your Mulank gemstone</small>
      <h4>{g.stone} <span>({g.hindi}) · for {NUMBERS[m].planet}</span></h4>
      {fit === 'ok' && <p>{m} is a friendly number in your chart, so {g.stone.toLowerCase()} sits well with your numbers.</p>}
      {fit === 'enemy' && <p><b>Check before you buy.</b> With Bhagyank {chart.bhagyank}, your own Mulank {m} falls among your enemy numbers, so this stone may not suit you.</p>}
      {fit === 'short' && <p><b>Check before you buy.</b> In your chart, {m} is good only for short spells, not for the long term.</p>}
      <p className="nv-gem__fine">Gemstones are strong. Traditionally they are worn only after the whole chart has been read: the right metal, finger, day and weight matter.</p>
    </div>
  </div>;
}

export function Remedies({chart}) {
  return <section className="nv-report__block" aria-labelledby="r-remedies">
    <h3 id="r-remedies">Remedies to start with</h3>
    <p className="nv-report__lede">{chart.missing.length ? 'Simple, traditional remedies for the numbers missing from your grid, and the stone of your Mulank.' : 'Every number is in your grid, so there is nothing missing to correct. Here is the stone of your Mulank.'}</p>
    {chart.missing.length > 0 && <ul className="nv-remedies">
      {chart.missing.map((n) => <li key={n}>
        <div className="nv-remedies__head"><span>{n}</span><b>Missing {n} · {NUMBERS[n].planet}</b></div>
        <ul>{MISSING_REMEDIES[n].map((r) => <li key={r}><Check size={16} aria-hidden="true"/>{r}</li>)}</ul>
        <MoreInReport>Vastu placements and the rest of the remedies for {n}</MoreInReport>
      </li>)}
    </ul>}
    <Gemstone chart={chart}/>
  </section>;
}

export function LifePeriod({chart}) {
  const {periods, current} = chart.life;
  if (current < 0) return null;
  const now = periods[current];
  const next = periods.slice(current + 1, current + 3);
  return <section className="nv-report__block" aria-labelledby="r-period">
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
  </section>;
}

function chapters(chart) {
  const {mulank: m, bhagyank: b, years, life, planes, counts} = chart;
  const y0 = years[0].year;
  const now = life.periods[life.current];
  const top = [...planes].sort((a, c) => c.have - a.have)[0];
  const combo = counts[1] && counts[8] ? ' Your grid also has the 1-8 combination, linked with authority and property after effort.' : counts[4] && counts[9] ? ' Your grid also has the 4-9 combination, which gives a strong mind.' : '';
  return [
    {icon: Star, title: `Birth number ${m}, in depth`, text: `Your key traits as a ${NUMBERS[m].planet} number, your natural strengths, and the areas to be mindful of.`},
    {icon: Compass, title: `Destiny number ${b}`, text: `What Bhagyank ${b} highlights about your direction in life, its strengths and its challenges.`},
    {icon: PenLine, title: 'Your name number', text: `Is your name in tune with Mulank ${m} and Bhagyank ${b}? Your Chaldean name number and the name numbers that suit you.`},
    {icon: Sprout, title: 'Strengths and areas to improve', text: `Your ${top.name.replace(/ \(.*\)/, '')} is ${Math.round((top.have / 3) * 100)}% complete.${combo} Your four key strengths, and what to practise in three areas.`},
    {icon: Briefcase, title: 'Career and work', text: `The career themes in your numbers and the work environment where Mulank ${m} and Bhagyank ${b} do best.`},
    {icon: IndianRupee, title: 'Business and money', text: `Your business strengths, the themes worth exploring, and when financial success tends to arrive for you.`},
    {icon: HeartHandshake, title: 'Relationships', text: `How you love and communicate, and the partner numbers that suit Mulank ${m} and Bhagyank ${b}.`},
    {icon: HeartPulse, title: 'Health', text: `The areas of health to watch for your numbers, with simple precautions.`},
    {icon: CalendarRange, title: 'Six years ahead', text: `${y0} is a personal year ${years[0].number} for you. Ten or more points for every year from ${y0} to ${y0 + 5}.`},
    {icon: Orbit, title: 'Every life period', text: now ? `You are in your ${NUMBERS[now.n].planet} period until ${now.to}. What each period brings, and how to use it.` : 'What each life period brings, and how to use it.'},
    {icon: Sparkles, title: 'Complete remedies', text: `What to wear, Vastu placements, rituals and donations for Mulank ${m} and for every missing number.`},
    {icon: ListChecks, title: 'Your action plan', text: 'Your top five insights, three big takeaways, and a 7, 30 and 90-day plan to put them to work.'},
  ];
}

const ddmmyyyy = (c) => `${String(c.day).padStart(2, '0')}/${String(c.month).padStart(2, '0')}/${c.year}`;

function reportMessage(chart, name) {
  return ['Namaste Adarshh ji 🙏', '', 'I would like my *full numerology report*.', '',
    `*Full name:* ${name.trim()}`, `*Date of birth:* ${formatDob(iso(chart))}`, `*Mulank:* ${chart.mulank} · *Bhagyank:* ${chart.bhagyank}`, '',
    'Please share the fee and how to proceed.', '', '— Sent from numericcvaastu.com'].join('\n');
}

/** A personalised look at each chapter of the paid report (the team's report template), with the reading held back. */
export function FullReportPreview({chart, readingHref}) {
  const [name, setName] = useState('');
  return <section className="nv-preview" id="full-report" aria-labelledby="r-full">
    <div className="nv-preview__head">
      <span className="hv-eyebrow">Your full report</span>
      <h3 id="r-full">This was the first page. <em>Here is what the rest says about you.</em></h3>
      <p>Your free report reads your date of birth. The full report adds your name, reads every number together and turns it into guidance for your work, money, relationships and years ahead, ending with a plan you can act on. For {formatDob(iso(chart))}, it covers:</p>
    </div>
    <ol className="nv-preview__grid">
      {chapters(chart).map(({icon: Icon, title, text}, i) => <li key={title}>
        <span className="nv-preview__icon"><Icon size={20} aria-hidden="true"/></span>
        <small className="nv-preview__no">{String(i + 1).padStart(2, '0')}</small>
        <b>{title}</b>
        <p>{text}</p>
        <span className="nv-skeleton" aria-hidden="true"><i/><i/><i/></span>
        <span className="nv-preview__lock"><Lock size={13} aria-hidden="true"/>In your full report</span>
      </li>)}
    </ol>
    <div className="nv-unlock">
      <div className="nv-cover" aria-hidden="true">
        <img src="/images/logo-nv.png" alt="" width="44" height="40"/>
        <small>Numerology personal report</small>
        <span>Prepared exclusively for</span>
        <strong className={name.trim() ? '' : 'is-empty'}>{name.trim() || 'Your name'}</strong>
        <dl>
          <div><dt>Date of birth</dt><dd>{ddmmyyyy(chart)}</dd></div>
          <div><dt>Mulank · Bhagyank</dt><dd>{chart.mulank} · {chart.bhagyank}</dd></div>
          <div><dt>Prepared by</dt><dd>Adarshh Panndey</dd></div>
        </dl>
      </div>
      <div className="nv-unlock__body">
        <h4>Your report, <em>made for you.</em></h4>
        <ul>
          {['15–20 pages, prepared by Adarshh for your date of birth and name', 'Birth, destiny and name numbers in depth', 'Career, business, money, relationships and health', 'Six years ahead and every life period', 'Complete remedies and a 7, 30 and 90-day action plan'].map((t) => <li key={t}><Check size={17} aria-hidden="true"/>{t}</li>)}
        </ul>
        <label className="nv-unlock__name" htmlFor="nv-report-name">Your full name <span>(as you write it)</span></label>
        <input id="nv-report-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Sharma"/>
        <a className="hv-button hv-button--gold" href={whatsappUrl(contact.whatsapp, reportMessage(chart, name))} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={18}/>Get my full report</a>
        <small>Opens WhatsApp with your name, date of birth and numbers filled in.</small>
        <Link className="hv-link" href={readingHref}>Or go through it with Adarshh in person <ArrowUpRight size={16}/></Link>
      </div>
    </div>
  </section>;
}
