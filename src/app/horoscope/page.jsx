import Link from 'next/link';
import LocalizedContent from '../../i18n/LocalizedContent';
import {SiteFooter} from '../../components/SiteChrome';
import DailyGuide from '../../components/DailyGuide';
import {dailyGuide} from '../../lib/daily';
import {metadataFor} from '../../data/seo';
import {siteUrl, jsonLdHtml} from '../../lib/site';
import '../../horoscope.css';

export const revalidate = 900; // a new day's guide appears within 15 minutes of midnight IST

export const metadata = metadataFor('/horoscope', {
  title: 'Daily Horoscope by Number & Rashi, Panchang and Vrat Calendar | NumericcVaastu',
  description: 'Today’s numerology reading for your number 1–9 and Vedic reading for your rashi, with today’s tithi, nakshatra, Rahu Kaal and the next 30 days of Ekadashi, Purnima, festivals and events.',
  keywords: ['daily horoscope', 'numerology horoscope today', 'rashifal today', 'today panchang', 'ekadashi dates', 'purnima dates', 'vrat calendar'],
});

const tz = {timeZone: 'Asia/Kolkata'};
const time = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-IN', {...tz, hour: 'numeric', minute: '2-digit'}).toUpperCase() : '—');
const dayTime = (iso) => (iso ? `${new Date(iso).toLocaleDateString('en-IN', {...tz, day: 'numeric', month: 'short'})}, ${time(iso)}` : '—');
const longDate = (ymd) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-IN', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
const KIND = {festival: 'Festival', ekadashi: 'Vrat', purnima: 'Vrat', amavasya: 'Vrat', pradosh: 'Vrat', sankashti: 'Vrat', ours: 'NumericcVaastu'};

/** Moon drawn for a phase between 0 (new) and 1: the lit part grows from the right, then shrinks. */
function MoonIcon({phase}) {
  const lit = 1 - Math.abs(phase * 2 - 1); // 0 new → 1 full
  const waxing = phase < 0.5;
  const rx = Math.abs(1 - lit * 2) * 9;
  const sweepOuter = waxing ? 1 : 0;
  const d = `M12 3 A9 9 0 0 ${sweepOuter} 12 21 A${rx} 9 0 0 ${lit > 0.5 === waxing ? 1 : 0} 12 3`;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" className="dg-moon-dark"/>{lit > 0.02 && <path d={d} className="dg-moon-lit"/>}</svg>;
}

export default async function HoroscopePage() {
  const g = await dailyGuide();
  const p = g.panchang;
  const goodTime = p.abhijit ? `${time(p.abhijit.start)} – ${time(p.abhijit.end)}` : null;
  const byDate = g.events.reduce((m, e) => ((m[e.date] ||= []).push(e), m), {});
  // Quick answers: visible on the page and mirrored in FAQPage data, rewritten every day, so search engines and AI
  // assistants can quote today's facts exactly.
  const next = (kind) => g.events.find((e) => e.kind === kind || (kind === 'ekadashi' && /ekadashi/i.test(e.title)) || (kind === 'purnima' && /purnima/i.test(e.title)));
  const nextEk = next('ekadashi');
  const nextPurnima = next('purnima');
  const nextFest = g.events.find((e) => e.kind === 'festival' && e.date >= g.date);
  const pretty = (ymd) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-IN', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'});
  const answers = [
    ['What is today’s tithi?', `On ${pretty(g.date)} the tithi in New Delhi is ${p.tithi.full}, until ${dayTime(p.tithi.ends)}. The nakshatra is ${p.nakshatra.name} and the Moon is in ${p.moon.hindi} (${p.moon.name}).`],
    ['What is Rahu Kaal today?', p.rahuKaal ? `Rahu Kaal in New Delhi today is ${time(p.rahuKaal.start)} to ${time(p.rahuKaal.end)}. Sunrise is at ${time(p.sunrise)} and sunset at ${time(p.sunset)}.` : 'Rahu Kaal could not be worked out for today.'],
    nextEk && ['When is the next Ekadashi?', `The next Ekadashi is on ${pretty(nextEk.date)}${nextEk.window ? `, with the tithi from ${dayTime(nextEk.window.start)} to ${dayTime(nextEk.window.end)} (New Delhi)` : ''}.`],
    nextPurnima && ['When is the next Purnima?', `The next Purnima is on ${pretty(nextPurnima.date)}${nextPurnima.window ? `, with the tithi from ${dayTime(nextPurnima.window.start)} to ${dayTime(nextPurnima.window.end)}` : ''}.`],
    nextFest && ['What is the next Hindu festival?', `${nextFest.title}, on ${pretty(nextFest.date)} (New Delhi, as listed by Drik Panchang).`],
    ['What is today’s universal day number?', `${g.universal}. It is the sum of the digits of today’s date reduced to one digit. Combined with your Mulank (birth number) it sets the theme of your day in numerology.`],
  ].filter(Boolean);
  const ld = {'@context': 'https://schema.org', '@graph': [
    {'@type': 'WebPage', '@id': `${siteUrl}/horoscope`, url: `${siteUrl}/horoscope`, name: 'Daily horoscope by number and rashi, panchang and vrat calendar', dateModified: new Date().toISOString(), inLanguage: 'en-IN', isPartOf: {'@id': `${siteUrl}/#website`}, about: ['Numerology', 'Panchang', 'Rashifal', 'Hindu festivals']},
    {'@type': 'FAQPage', mainEntity: answers.map(([q, a]) => ({'@type': 'Question', name: q, acceptedAnswer: {'@type': 'Answer', text: a}}))},
    {'@type': 'ItemList', name: 'Upcoming festivals and vrat days (New Delhi)', itemListElement: g.events.filter((e) => e.kind !== 'ours').map((e, i) => ({'@type': 'ListItem', position: i + 1, name: `${e.title} · ${pretty(e.date)}`}))},
    ...g.events.filter((e) => e.kind === 'ours').map((e) => ({'@type': 'Event', name: e.title, startDate: e.date, description: e.detail || e.title, eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode', location: {'@type': 'VirtualLocation', url: e.link || `${siteUrl}/horoscope`}, organizer: {'@type': 'Person', name: 'Adarshh Panndey', url: `${siteUrl}/about`}})),
  ]};
  return <LocalizedContent><>
    <main id="main" className="dg">
      <section className="dg-hero" aria-labelledby="dg-title">
        <div className="dg-wrap dg-hero__grid">
          <div className="dg-today">
            <span className="dg-eyebrow"><span className="dg-no">01</span>{longDate(g.date)}</span>
            <h1 id="dg-title">Today, read <em>by the numbers.</em></h1>
            <div className="dg-universal">
              <span className="dg-universal__n" aria-hidden="true">{g.universal}</span>
              <p><b>Universal day {g.universal}</b>The sum of today’s date, reduced to one digit. It colours the day for everyone; your own number decides how it feels for you.</p>
            </div>
          </div>
          <aside className="dg-sky" aria-label="Today’s panchang for New Delhi">
            <h2>Today’s panchang <small>New Delhi</small></h2>
            <dl>
              <div><dt>Tithi</dt><dd><b>{p.tithi.full}</b><span>until {dayTime(p.tithi.ends)}</span></dd></div>
              <div><dt>Nakshatra</dt><dd><b>{p.nakshatra.name}</b><span>until {dayTime(p.nakshatra.ends)}</span></dd></div>
              <div><dt>Moon in</dt><dd><b>{p.moon.hindi} ({p.moon.name})</b><span>until {dayTime(p.moon.until)}</span></dd></div>
              <div className="dg-sky__pair"><dt>Sunrise · Sunset</dt><dd><b>{time(p.sunrise)} · {time(p.sunset)}</b></dd></div>
              {p.rahuKaal && <div><dt>Rahu Kaal</dt><dd><b>{time(p.rahuKaal.start)} – {time(p.rahuKaal.end)}</b><span>avoid new beginnings</span></dd></div>}
              {p.abhijit && <div><dt>Abhijit muhurat</dt><dd><b>{goodTime}</b><span>the day’s auspicious window</span></dd></div>}
            </dl>
          </aside>
        </div>
      </section>

      <DailyGuide numbers={g.numbers} signs={g.signs} goodTime={goodTime}/>

      <section className="dg-cal" aria-labelledby="dg-cal-title">
        <div className="dg-wrap">
          <span className="dg-eyebrow"><span className="dg-no">03</span>The next 30 days</span>
          <h2 id="dg-cal-title">Festivals, vrat days <em>and our events.</em></h2>
          <ol className="dg-strip" aria-label="Moon phases for the next 30 days">
            {g.days.map((d) => {
              const dt = new Date(`${d.date}T12:00:00Z`);
              return <li key={d.date} className={`${d.events.length ? 'has' : ''} ${d.date === g.date ? 'today' : ''}`}>
                <a href={d.events.length ? `#d-${d.date}` : undefined}>
                  <small>{dt.toLocaleDateString('en-IN', {weekday: 'short', timeZone: 'UTC'})}</small>
                  <MoonIcon phase={d.phase}/>
                  <b>{dt.getUTCDate()}</b>
                  <span className="dg-dots">{[...new Set(d.events)].map((k) => <i key={k} className={`k-${KIND[k] === 'Vrat' ? 'vrat' : k}`}/>)}</span>
                </a>
              </li>;
            })}
          </ol>
          <div className="dg-legend"><span><i className="k-festival"/>Festival</span><span><i className="k-vrat"/>Vrat day</span><span><i className="k-ours"/>NumericcVaastu event</span></div>
          <div className="dg-events">
            {Object.entries(byDate).map(([date, list]) => {
              const dt = new Date(`${date}T12:00:00Z`);
              return <div key={date} id={`d-${date}`} className="dg-day">
                <div className="dg-day__date"><b>{dt.getUTCDate()}</b><span>{dt.toLocaleDateString('en-IN', {month: 'short', timeZone: 'UTC'})}</span><small>{dt.toLocaleDateString('en-IN', {weekday: 'short', timeZone: 'UTC'})}</small></div>
                <ul>{list.map((e) => <li key={e.title} className={`dg-ev k-${KIND[e.kind] === 'Vrat' ? 'vrat' : e.kind}`}>
                  <span className="dg-ev__tag">{KIND[e.kind]}</span>
                  <b>{e.title}</b>
                  {e.window && <span className="dg-ev__meta">Tithi {dayTime(e.window.start)} → {dayTime(e.window.end)}</span>}
                  {e.kind === 'ours' && <span className="dg-ev__meta">{[e.time, e.detail].filter(Boolean).join(' · ')}</span>}
                  {e.kind === 'ours' && e.link && <a className="dg-ev__link" href={e.link} target="_blank" rel="noopener noreferrer">Join or register →</a>}
                </li>)}</ul>
              </div>;
            })}
          </div>
          <p className="dg-note">Panchang worked out for New Delhi from the Sun’s and Moon’s positions (Lahiri ayanamsa); festival dates as listed by Drik Panchang. Vrat dates follow sunrise, sunset or moonrise in New Delhi, so a local panchang may differ by a day; the tithi times shown let you check. Readings are traditional guidance, not a guarantee.</p>
          <section className="dg-faq" aria-labelledby="dg-faq-title">
            <h2 id="dg-faq-title">Quick answers <em>for today</em></h2>
            <dl>{answers.map(([q, a]) => <div key={q}><dt>{q}</dt><dd>{a}</dd></div>)}</dl>
          </section>
          <div className="dg-final"><b>Want this for your own chart?</b><span>The complete report reads your name, birth date and phone number together.</span><Link className="dg-btn" href="/numerology-calculator">Get my report</Link><Link className="dg-btn dg-btn--ghost" href="/consultations">Book a consultation</Link></div>
        </div>
      </section>
    </main>
    <SiteFooter/>
    <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(ld)}/>
  </></LocalizedContent>;
}
