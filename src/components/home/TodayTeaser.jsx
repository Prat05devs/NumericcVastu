import Link from 'next/link';
import {ArrowRight} from 'lucide-react';

const tz = {timeZone: 'Asia/Kolkata'};
const time = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-IN', {...tz, hour: 'numeric', minute: '2-digit'}).toUpperCase() : '—');
const dayTime = (iso) => (iso ? `${new Date(iso).toLocaleDateString('en-IN', {...tz, day: 'numeric', month: 'short'})}, ${time(iso)}` : '—');
const KIND = {festival: 'Festival', ours: 'Event'};

/** Homepage strip for the daily guide: one screen at most, everything links through to /horoscope. */
export default function TodayTeaser({guide}) {
  const p = guide.panchang;
  const dt = new Date(`${guide.date}T12:00:00Z`);
  const upcoming = guide.events.slice(0, 3);
  return <section className="tt" aria-labelledby="tt-title">
    <div className="hv-wrap tt__grid">
      <Link href="/horoscope" className="tt__today">
        <span className="tt__eyebrow">Today · {dt.toLocaleDateString('en-IN', {weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'})}</span>
        <h2 id="tt-title">Your day, <em>by the numbers.</em></h2>
        <div className="tt__num"><b aria-hidden="true">{guide.universal}</b><span>Universal day {guide.universal}<small>Your own number decides how today feels for you.</small></span></div>
        <dl className="tt__pan">
          <div><dt>Tithi</dt><dd>{p.tithi.full}<small>until {dayTime(p.tithi.ends)}</small></dd></div>
          <div><dt>Nakshatra</dt><dd>{p.nakshatra.name}</dd></div>
          {p.rahuKaal && <div><dt>Rahu Kaal</dt><dd>{time(p.rahuKaal.start)} – {time(p.rahuKaal.end)}</dd></div>}
          <div><dt>Sunrise · Sunset</dt><dd>{time(p.sunrise)} · {time(p.sunset)}</dd></div>
        </dl>
      </Link>
      <div className="tt__side">
        <div>
          <h3>Read today for your number</h3>
          <div className="tt__nums">{guide.numbers.map((x) => <Link key={x.n} href={`/horoscope?n=${x.n}#dg-read-title`} aria-label={`Today’s reading for number ${x.n}`}><b>{x.n}</b><small>{x.planet}</small></Link>)}</div>
          <Link className="tt__rashi" href="/horoscope?view=rashi#dg-read-title">Or read by your rashi <ArrowRight size={15}/></Link>
        </div>
        {upcoming.length > 0 && <div>
          <h3>Coming up</h3>
          <ul className="tt__events">{upcoming.map((e) => {
            const d = new Date(`${e.date}T12:00:00Z`);
            return <li key={e.date + e.title}><span className="tt__date"><b>{d.getUTCDate()}</b>{d.toLocaleDateString('en-IN', {month: 'short', timeZone: 'UTC'})}</span><span><small>{KIND[e.kind] || 'Vrat'}</small>{e.title}</span></li>;
          })}</ul>
        </div>}
        <Link href="/horoscope" className="hv-button tt__cta">Read today’s full guide <ArrowRight size={17}/></Link>
      </div>
    </div>
  </section>;
}
