import 'server-only';
import * as A from 'astronomy-engine';

/**
 * Panchang for New Delhi, calculated from the Sun's and Moon's positions (astronomy-engine, MIT) with the Lahiri
 * ayanamsa, so nothing is typed in by hand:
 *   tithi = which 12° step the Moon is ahead of the Sun (1–30), nakshatra = Moon's 13°20' segment (1–27),
 *   rashi = Moon's 30° sign. Start and end times are found by stepping forward and then narrowing to the minute.
 * Vrat days follow the usual rules: Ekadashi, Purnima and Amavasya by the tithi at sunrise; Pradosh by the tithi at
 * sunset; Sankashti Chaturthi by the tithi at moonrise. Local panchangs can differ by a day at the edges, so every
 * vrat shows its exact tithi window.
 */
const DELHI = new A.Observer(28.6139, 77.209, 216);
const IST = 5.5 * 3600_000;
const HOUR = 3600_000;

export const TITHIS = ['Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima'];
export const NAKSHATRAS = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];
export const RASHIS = [
  {key: 'mesh', name: 'Aries', hindi: 'Mesh', lord: 9}, {key: 'vrishabh', name: 'Taurus', hindi: 'Vrishabh', lord: 6}, {key: 'mithun', name: 'Gemini', hindi: 'Mithun', lord: 5},
  {key: 'kark', name: 'Cancer', hindi: 'Kark', lord: 2}, {key: 'simha', name: 'Leo', hindi: 'Simha', lord: 1}, {key: 'kanya', name: 'Virgo', hindi: 'Kanya', lord: 5},
  {key: 'tula', name: 'Libra', hindi: 'Tula', lord: 6}, {key: 'vrishchik', name: 'Scorpio', hindi: 'Vrishchik', lord: 9}, {key: 'dhanu', name: 'Sagittarius', hindi: 'Dhanu', lord: 3},
  {key: 'makar', name: 'Capricorn', hindi: 'Makar', lord: 8}, {key: 'kumbh', name: 'Aquarius', hindi: 'Kumbh', lord: 8}, {key: 'meen', name: 'Pisces', hindi: 'Meen', lord: 3},
];

const norm = (d) => ((d % 360) + 360) % 360;
/** Lahiri ayanamsa in degrees (23°51′11″ at J2000, about 50.29″ a year). */
const ayanamsa = (t) => { const T = (t.getTime() - Date.UTC(2000, 0, 1, 12)) / (36525 * 86400_000); return 23.853 + 1.3972 * T + 0.0003 * T * T; };
function positions(t) {
  const time = A.MakeTime(t);
  const sun = A.SunPosition(time).elon;
  const moon = A.EclipticGeoMoon(time).lon;
  const ay = ayanamsa(t);
  return {sun: norm(sun - ay), moon: norm(moon - ay), elong: norm(moon - sun)};
}
/** 0-based indices: tithi 0–29, nakshatra 0–26, rashi 0–11. */
export function indicesAt(t) {
  const p = positions(t);
  return {tithi: Math.floor(p.elong / 12), nakshatra: Math.floor(p.moon / (360 / 27)), rashi: Math.floor(p.moon / 30)};
}
/** Next time the given index function changes after `from` (to the minute). */
function nextChange(from, key, limitHours = 80) {
  const start = indicesAt(from)[key];
  let lo = from.getTime();
  let hi = lo;
  for (let h = 1; h <= limitHours; h++) { hi = lo + h * HOUR; if (indicesAt(new Date(hi))[key] !== start) break; }
  let a = hi - HOUR;
  while (hi - a > 60_000) { const mid = (a + hi) / 2; if (indicesAt(new Date(mid))[key] === start) a = mid; else hi = mid; }
  return new Date(hi);
}
function prevChange(from, key) {
  const start = indicesAt(from)[key];
  let hi = from.getTime();
  let lo = hi;
  for (let h = 1; h <= 80; h++) { lo = hi - h * HOUR; if (indicesAt(new Date(lo))[key] !== start) break; }
  let b = lo + HOUR;
  while (b - lo > 60_000) { const mid = (lo + b) / 2; if (indicesAt(new Date(mid))[key] === start) b = mid; else lo = mid; }
  return new Date(b);
}

/** IST calendar date (YYYY-MM-DD) of a moment. */
export const istDate = (t) => new Date(t.getTime() + IST).toISOString().slice(0, 10);
/** Midnight IST of a YYYY-MM-DD date, as a Date. */
const istMidnight = (ymd) => new Date(Date.parse(`${ymd}T00:00:00Z`) - IST);
const riseSet = (body, dir, ymd) => A.SearchRiseSet(body, DELHI, dir, A.MakeTime(istMidnight(ymd)), 1)?.date ?? null;

export const tithiLabel = (i) => ({name: TITHIS[i % 15], paksha: i < 15 ? 'Shukla' : 'Krishna', full: i === 14 ? 'Purnima' : i === 29 ? 'Amavasya' : `${i < 15 ? 'Shukla' : 'Krishna'} ${TITHIS[i % 15]}`});

/** One day's panchang for New Delhi. */
export function dayPanchang(ymd) {
  const sunrise = riseSet(A.Body.Sun, +1, ymd);
  const sunset = riseSet(A.Body.Sun, -1, ymd);
  const at = sunrise ?? istMidnight(ymd);
  const idx = indicesAt(at);
  const dayMs = sunrise && sunset ? sunset - sunrise : 12 * HOUR;
  const part = dayMs / 8;
  const weekday = new Date(`${ymd}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  const RAHU = [8, 2, 7, 5, 6, 4, 3]; // eighth of the day ruled by Rahu, Sunday → Saturday
  const rahuStart = sunrise ? new Date(sunrise.getTime() + (RAHU[weekday] - 1) * part) : null;
  const noon = sunrise && sunset ? new Date((sunrise.getTime() + sunset.getTime()) / 2) : null;
  const muhurta = dayMs / 15;
  return {
    date: ymd, weekday, sunrise, sunset,
    tithi: {...tithiLabel(idx.tithi), index: idx.tithi, ends: nextChange(at, 'tithi')},
    nakshatra: {name: NAKSHATRAS[idx.nakshatra], index: idx.nakshatra, ends: nextChange(at, 'nakshatra')},
    moonRashi: {...RASHIS[idx.rashi], index: idx.rashi, until: nextChange(at, 'rashi', 70)},
    rahuKaal: rahuStart && {start: rahuStart, end: new Date(rahuStart.getTime() + part)},
    abhijit: noon && weekday !== 3 ? {start: new Date(noon.getTime() - muhurta / 2), end: new Date(noon.getTime() + muhurta / 2)} : null,
  };
}

/** The Moon's sidereal sign right now (index 0–11) and when it moves on. */
export function moonNow(t = new Date()) {
  const i = indicesAt(t).rashi;
  return {...RASHIS[i], index: i, since: prevChange(t, 'rashi'), until: nextChange(t, 'rashi', 70)};
}

/** Every tithi between two moments, with start and end. */
function tithiSpans(from, to) {
  const spans = [];
  let t = prevChange(from, 'tithi');
  while (t < to) {
    const i = indicesAt(new Date(t.getTime() + 60_000)).tithi;
    const end = nextChange(new Date(t.getTime() + 60_000), 'tithi');
    spans.push({index: i, start: t, end});
    t = end;
  }
  return spans;
}
/** First IST date in [start, end) whose rise/set of `body` falls inside the span, else the span's start date. */
function dateByEvent(span, body, dir) {
  for (let d = istDate(span.start); d <= istDate(span.end); d = istDate(new Date(istMidnight(d).getTime() + 30 * HOUR))) {
    const e = riseSet(body, dir, d);
    if (e && e >= span.start && e < span.end) return d;
  }
  return istDate(span.start);
}

/** Vrat days in the next `days` days: Ekadashi, Purnima, Amavasya, Pradosh and Sankashti Chaturthi. */
export function vratDays(fromYmd, days = 45) {
  const from = istMidnight(fromYmd);
  const to = new Date(from.getTime() + days * 24 * HOUR);
  const out = [];
  for (const s of tithiSpans(from, to)) {
    const kind = s.index === 10 ? {name: 'Shukla Ekadashi', type: 'ekadashi', rule: [A.Body.Sun, +1]}
      : s.index === 25 ? {name: 'Krishna Ekadashi', type: 'ekadashi', rule: [A.Body.Sun, +1]}
      : s.index === 14 ? {name: 'Purnima', type: 'purnima', rule: [A.Body.Sun, +1]}
      : s.index === 29 ? {name: 'Amavasya', type: 'amavasya', rule: [A.Body.Sun, +1]}
      : s.index === 12 || s.index === 27 ? {name: 'Pradosh Vrat', type: 'pradosh', rule: [A.Body.Sun, -1]}
      : s.index === 18 ? {name: 'Sankashti Chaturthi', type: 'sankashti', rule: [A.Body.Moon, +1]}
      : null;
    if (!kind) continue;
    const date = dateByEvent(s, ...kind.rule);
    if (date < fromYmd || date >= istDate(to)) continue;
    out.push({date, name: kind.name, type: kind.type, tithi: {start: s.start, end: s.end}});
  }
  return out;
}

/** Moon phase (0 new → 0.5 full → 1) at local noon of a date, for the timeline's moon icons. */
export const moonPhase = (ymd) => norm(positions(new Date(istMidnight(ymd).getTime() + 12 * HOUR)).elong) / 360;
