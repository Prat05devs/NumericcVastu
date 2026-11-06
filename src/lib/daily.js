import 'server-only';
import {COMPAT, NUMBERS, reduce, relation} from './numerology';
import {RASHIS, dayPanchang, istDate, moonNow, moonPhase, vratDays} from './panchang';
import {COLOUR_SWATCH, DAY_ENERGY, FESTIVALS, GOCHAR, MANTRA, TONE} from '../data/dailyReadings';

/**
 * Today's guide for numericcvaastu.com/horoscope, worked out on the server for the date in India (IST):
 *   by number: day energy = Mulank + the date's universal number (reduced); tone from the NumericcVaastu
 *   compatibility chart; lucky number rotates through the Mulank's friendly numbers.
 *   by rashi: Chandra gochar, the house the Moon is in today counted from the rashi.
 * Plus the panchang and a 30-day calendar of vrat days (computed), festivals (Drik Panchang list) and events.
 */
const apiUrl = () => (process.env.COMMERCE_API_URL || 'https://api.numericcvaastu.com').replace(/\/+$/, '');
async function ownEvents() {
  try {
    const res = await fetch(`${apiUrl()}/api/v1/site/events`, {next: {revalidate: 300, tags: ['site-events']}, signal: AbortSignal.timeout(5000)});
    if (!res.ok) return [];
    const body = await res.json();
    return Array.isArray(body?.data) ? body.data : [];
  } catch { return []; }
}
const addDays = (ymd, n) => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);
const iso = (d) => (d ? d.toISOString() : null);

/**
 * Worked out once per Indian day and kept in memory: the first request after midnight IST calculates the day,
 * every later request that day reuses it. Only our own events (back office) are fetched fresh, every 5 minutes.
 */
const dayCache = new Map();
export async function dailyGuide(now = new Date()) {
  const ymd = istDate(now);
  if (!dayCache.has(ymd)) {
    dayCache.clear(); // keep only today
    dayCache.set(ymd, computeDay(now, ymd));
  }
  const base = dayCache.get(ymd);
  const end = addDays(ymd, 30);
  const ours = (await ownEvents()).filter((e) => e.date >= ymd && e.date < end).map((e) => ({date: e.date, title: e.title, kind: 'ours', time: e.time, detail: e.detail, link: e.link}));
  const events = [...base.events, ...ours].sort((a, b) => a.date.localeCompare(b.date) || (a.kind === 'ours' ? 1 : 0) - (b.kind === 'ours' ? 1 : 0));
  const days = base.days.map((d) => ({...d, events: events.filter((e) => e.date === d.date).map((e) => e.kind)}));
  return {...base, events, days};
}

function computeDay(now, ymd) {
  const universal = reduce(ymd.replace(/-/g, '').split('').reduce((s, d) => s + Number(d), 0));
  const dayOfYear = Math.floor((Date.parse(`${ymd}T00:00:00Z`) - Date.parse(`${ymd.slice(0, 4)}-01-01T00:00:00Z`)) / 86400_000);
  const p = dayPanchang(ymd);
  const moon = moonNow(now);

  const numbers = Array.from({length: 9}, (_, i) => {
    const n = i + 1;
    const energyNo = reduce(n + universal);
    const tone = TONE[relation(n, universal) || 'neutral'];
    const friends = COMPAT[n].friend.filter((f) => f !== n);
    const lucky = friends[dayOfYear % friends.length] ?? n;
    return {n, planet: NUMBERS[n].planet, hindi: NUMBERS[n].hindi, energyNo, tone, reading: DAY_ENERGY[energyNo], lucky, colour: COLOUR_SWATCH[lucky], mantra: MANTRA[n]};
  });
  const signs = RASHIS.map((r, i) => {
    const house = ((moon.index - i + 12) % 12) + 1;
    const g = GOCHAR[house];
    return {...r, index: i, house, reading: g, lucky: r.lord, colour: COLOUR_SWATCH[r.lord], mantra: MANTRA[r.lord]};
  });

  const end = addDays(ymd, 30);
  const vrats = vratDays(ymd, 31).map((v) => ({date: v.date, title: v.name, kind: v.type, window: {start: iso(v.tithi.start), end: iso(v.tithi.end)}}));
  const fest = FESTIVALS.filter(([d]) => d >= ymd && d < end).map(([date, title]) => ({date, title, kind: 'festival'}));
  // A festival that is itself the vrat (e.g. Dev Uthani Ekadashi, Kartika Purnima) replaces the generic vrat entry but keeps its tithi window.
  const events = [...fest.map((f) => {
    const v = vrats.find((x) => x.date === f.date && f.title.toLowerCase().includes(x.kind === 'purnima' ? 'purnima' : x.kind));
    return v ? {...f, window: v.window} : f;
  }), ...vrats.filter((v) => !fest.some((f) => f.date === v.date && f.title.toLowerCase().includes(v.kind === 'purnima' ? 'purnima' : v.kind)))]
    .sort((a, b) => a.date.localeCompare(b.date));
  const days = Array.from({length: 30}, (_, i) => { const d = addDays(ymd, i); return {date: d, phase: moonPhase(d), events: []}; });

  return {
    date: ymd, universal,
    panchang: {
      tithi: {...p.tithi, ends: iso(p.tithi.ends)}, nakshatra: {...p.nakshatra, ends: iso(p.nakshatra.ends)},
      moon: {name: moon.name, hindi: moon.hindi, until: iso(moon.until)},
      sunrise: iso(p.sunrise), sunset: iso(p.sunset),
      rahuKaal: p.rahuKaal && {start: iso(p.rahuKaal.start), end: iso(p.rahuKaal.end)},
      abhijit: p.abhijit && {start: iso(p.abhijit.start), end: iso(p.abhijit.end)},
    },
    numbers, signs, events, days,
  };
}
