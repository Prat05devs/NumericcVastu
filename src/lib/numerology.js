/**
 * Lo Shu grid and Indian (Vedic-style) numerology, calculated entirely in the browser.
 *
 * Conventions used (the most common ones among Indian practitioners; others exist):
 * - Mulank (driver/psychic number): the day of birth reduced to one digit.
 * - Bhagyank (conductor/destiny number): every digit of the full date added and reduced.
 * - Grid: every non-zero digit of DD-MM-YYYY, plus Bhagyank, plus Mulank when the day has two
 *   different digits (11–31 except 20 and 30; for 1–9, 10, 20 and 30 the Mulank digit is already there),
 *   plus Kua when the person chooses to include it. Zeros have no cell and are left out.
 * - Kua (from Feng Shui, widely used alongside Lo Shu in India): reduce the last two digits of the year.
 *   Born before 2000: male 10 − n, female n + 5. Born 2000 or later: male 9 − n, female n + 6.
 *   Reduce again; male 0 counts as 9; Kua 5 becomes 2 for males and 8 for females.
 * - Planets: 1 Sun, 2 Moon, 3 Jupiter, 4 Rahu, 5 Mercury, 6 Venus, 7 Ketu, 8 Saturn, 9 Mars.
 * - Friend, enemy and neutral numbers, colours and roles: the number compatibility chart NumericcVaastu
 *   teaches (COMPAT below). It is a numerology chart, not the Jyotish planetary friendships, so it is
 *   not symmetric (1 treats 4 as neutral while 4 treats 1 as a friend) and is used exactly as taught.
 * - A person's result combines the Mulank and Bhagyank lists: an enemy of either stays an enemy, then a
 *   friend of either is a friend, and what is left is neutral. Colours to use are the colours of the
 *   friendly numbers; colours to avoid are those of the enemy numbers.
 * - Personal year: day + month + the year in question, reduced.
 * - Life periods (numerology Maha Dasha): the first period belongs to the Mulank and lasts that many years,
 *   then each next number in turn (…8, 9, 1, 2…) for as many years as the number itself.
 */

export const GRID = [4, 9, 2, 3, 5, 7, 8, 1, 6];
/** The Vedic numerology grid: the same numbers, placed by planet. */
export const VEDIC_GRID = [3, 1, 9, 6, 7, 5, 2, 8, 4];

export const reduce = (n) => {
  while (n > 9) n = String(n).split('').reduce((sum, d) => sum + Number(d), 0);
  return n;
};
const digitSum = (text) => text.split('').reduce((sum, d) => sum + Number(d), 0);

export const NUMBERS = {
  1: {planet: 'Sun', hindi: 'Surya', day: 'Sunday', role: 'King, father', colour: 'Red', trait: 'leadership, independence and self-respect', strengths: 'Confident, original and decisive. Takes charge naturally.', watch: 'Can be proud or impatient with slower people.'},
  2: {planet: 'Moon', hindi: 'Chandra', day: 'Monday', role: 'Queen, mother', colour: 'Milky white', trait: 'sensitivity, imagination and cooperation', strengths: 'Caring, intuitive and diplomatic. Works well in partnership.', watch: 'Mood swings and overthinking; needs emotional security.'},
  3: {planet: 'Jupiter', hindi: 'Guru', day: 'Thursday', role: 'Teacher, Dev Guru, minister', colour: 'Yellow', trait: 'wisdom, guidance and discipline', strengths: 'A natural teacher and adviser. Ethical, ambitious and well read.', watch: 'Can lecture others or become rigid about being right.'},
  4: {planet: 'Rahu', hindi: 'Rahu', day: 'Saturday', role: 'Rebel', colour: 'Black and dark grey', trait: 'unconventional thinking and sudden change', strengths: 'Inventive, hard-working and good at research or technology.', watch: 'Life can bring sudden ups and downs; impulsive or rebellious streaks.'},
  5: {planet: 'Mercury', hindi: 'Budh', day: 'Wednesday', role: 'Son, prince', colour: 'Green', trait: 'communication, business sense and quick learning', strengths: 'Witty, adaptable and good with money, trade and people.', watch: 'Restless; starts many things and can scatter energy.'},
  6: {planet: 'Venus', hindi: 'Shukra', day: 'Friday', role: 'Guru of the Asuras', colour: 'White', trait: 'love, beauty, comfort and family', strengths: 'Charming, artistic and responsible. Creates harmony at home.', watch: 'Can overindulge in comfort or depend on others’ approval.'},
  7: {planet: 'Ketu', hindi: 'Ketu', day: 'Tuesday', role: 'Shadow', colour: 'Black and grey', trait: 'intuition, spirituality and deep research', strengths: 'Insightful, philosophical and drawn to the hidden side of things.', watch: 'Detachment and doubt; can feel misunderstood or alone.'},
  8: {planet: 'Saturn', hindi: 'Shani', day: 'Saturday', role: 'Judge', colour: 'Black', trait: 'hard work, justice and long-term results', strengths: 'Patient, serious and dependable. Success grows steadily with age.', watch: 'Delays and heavy responsibility early in life; can turn pessimistic.'},
  9: {planet: 'Mars', hindi: 'Mangal', day: 'Tuesday', role: 'Commander of the army', colour: 'Blood red', trait: 'courage, energy and protection', strengths: 'Brave, energetic and generous. Fights for people and causes.', watch: 'Quick temper and impatience; can rush into conflict.'},
};

/**
 * Number compatibility chart. For 4 and 8, the numbers 4 and 8 are marked as both friend and enemy
 * (shortTerm): fine for short-term relations, not good for long-term ones.
 */
export const COMPAT = {
  1: {friend: [9, 2, 5, 3, 6, 1], enemy: [8], neutral: [4, 7]},
  2: {friend: [1, 5, 3, 2], enemy: [8, 4, 9], neutral: [6, 7]},
  3: {friend: [1, 5, 3, 2, 7], enemy: [6], neutral: [4, 8, 9]},
  4: {friend: [1, 7, 5, 6], enemy: [2, 9], neutral: [3], shortTerm: [4, 8]},
  5: {friend: [1, 2, 3, 6, 5], enemy: [], neutral: [7, 8, 9, 4]},
  6: {friend: [1, 5, 7, 6], enemy: [3], neutral: [8, 9, 2, 4]},
  7: {friend: [4, 6, 1, 3, 5], enemy: [], neutral: [8, 2, 9, 7]},
  8: {friend: [5, 6, 3, 7], enemy: [1, 2], neutral: [9], shortTerm: [4, 8]},
  9: {friend: [1, 5, 3], enemy: [4, 2], neutral: [7, 6, 8, 9]},
};
const KINDS = ['friend', 'enemy', 'neutral', 'shortTerm'];

/** How number `of` treats number `other`: 'friend' | 'enemy' | 'neutral' | 'shortTerm'. */
export function relation(of, other) {
  return KINDS.find((kind) => COMPAT[of][kind]?.includes(other));
}

/** Combined lists for a Mulank and Bhagyank, in the order 1–9. */
export function combine(a, b) {
  const out = {friend: [], enemy: [], neutral: [], shortTerm: []};
  for (let n = 1; n <= 9; n++) {
    const r = [relation(a, n), relation(b, n)];
    out[r.includes('enemy') ? 'enemy' : r.includes('shortTerm') ? 'shortTerm' : r.includes('friend') ? 'friend' : 'neutral'].push(n);
  }
  return out;
}

/** Mulank–Bhagyank pairing. 4-4 and 8-8 together are not good; 4 with 8 is fine short-term only. */
export function pairing(a, b) {
  if ([4, 8].includes(a) && [4, 8].includes(b)) return a === b ? 'double' : 'shortTerm';
  const r = [relation(a, b), relation(b, a)];
  return r.includes('enemy') ? 'enemy' : r.includes('friend') ? 'friend' : 'neutral';
}

/** Rows, columns and the two diagonals of the 4-9-2 / 3-5-7 / 8-1-6 square. */
export const PLANES = [
  {key: 'mental', name: 'Mental plane', digits: [4, 9, 2], kind: 'Row', full: 'Sharp thinking, good memory and a rational, analytical approach.', none: 'Decisions may be impulsive; writing things down and planning helps.'},
  {key: 'emotional', name: 'Emotional plane', digits: [3, 5, 7], kind: 'Row', full: 'Emotional balance, intuition and a spiritual outlook.', none: 'Feelings may be hard to express or read in others.'},
  {key: 'practical', name: 'Practical plane', digits: [8, 1, 6], kind: 'Row', full: 'Grounded and practical. Good with money, property and material success.', none: 'Practical follow-through and money management need conscious effort.'},
  {key: 'thought', name: 'Thought plane', digits: [4, 3, 8], kind: 'Column', full: 'Generates ideas and plans how to carry them out.', none: 'Ideas may stay unplanned; structure turns them into results.'},
  {key: 'will', name: 'Will plane', digits: [9, 5, 1], kind: 'Column', full: 'Strong determination and the persistence to finish what is started.', none: 'Indecision or giving up early; small, steady goals build willpower.'},
  {key: 'action', name: 'Action plane', digits: [2, 7, 6], kind: 'Column', full: 'Turns plans into action; follows through on commitments.', none: 'Hesitation before acting; tasks may stay half-finished.'},
  {key: 'golden', name: 'Golden Yog (Raj Yog)', digits: [4, 5, 6], kind: 'Diagonal', full: 'Traditionally linked with name, fame and wealth. Considered rare.', none: 'Recognition and wealth come through deliberate effort rather than ease.'},
  {key: 'silver', name: 'Silver Yog (Rajat Yog)', digits: [2, 5, 8], kind: 'Diagonal', full: 'Traditionally linked with property, land and strong willpower, often after ups and downs.', none: 'Property and assets build slowly; patience matters.'},
];

/** What each number is traditionally read as when it is missing from the grid. */
export const MISSING = {
  1: 'Self-expression and confidence may need work; speaking up can feel hard.',
  2: 'Sensitivity and patience with others may be weaker; intuition is less trusted.',
  3: 'Imagination and clear communication need effort; learning feels like work.',
  4: 'Organisation and discipline may be lacking; routines and planning help.',
  5: 'Emotional balance and steady focus may waver; life can feel unsettled.',
  6: 'Home, family and responsibilities may feel like a strain.',
  7: 'Lessons tend to come through experience and setbacks rather than reflection.',
  8: 'Attention to detail and handling money need care.',
  9: 'Drive and ambition may need a push; courage grows with practice.',
};

/** Repetition readings, summarised from JC Chaudhry's Lo Shu repeat-number guide. Index 0 = once, 3 = four or more. */
export const REPEATS = {
  1: ['Reserved; finds it hard to express feelings openly.', 'Communicates well and is understood by others.', 'Talkative and lively, often the entertainer of the group.', 'Expresses views better in writing than in speech.'],
  2: ['Sensitive, emotional and intuitive.', 'Intelligent, with excellent judgment.', 'Highly intuitive and quick to decide, but can be moody.', 'Quick to anger; reacts before thinking.'],
  3: ['Good memory and communication, positive outlook.', 'Creative; suited to writing and ideas.', 'Over-imagines situations and may withdraw from people.', 'Fearful or impractical outlook; needs grounding.'],
  4: ['Practical and orderly.', 'Disciplined and completes what is assigned.', 'Very hard-working but may overlook others’ views.', 'Life may involve heavy physical work.'],
  5: ['Affectionate and inspiring to others.', 'Hard-working and confident, but easily emotional.', 'Courageous, but may speak or take risks without thinking.', 'Over-excitable; prone to rash decisions and accidents.'],
  6: ['A good adviser and partner, attached to family.', 'Loves beauty and creativity.', 'Can become tense, stressed and easily angered.', 'Very creative but emotionally vulnerable.'],
  7: ['Learns from experience; drawn to spirituality.', 'Gains wisdom after setbacks.', 'Life may bring sadness and disappointments.', 'Risk of losses in love, health or money; needs caution.'],
  8: ['Thinks deeply; may carry mental pressure.', 'Stubborn, but learns from mistakes.', 'Drawn to material comforts; growth often comes after 40.', 'Can progress quickly in life.'],
  9: ['Intelligent, ambitious and self-improving.', 'Wise and clever, but can feel superior to others.', 'Helpful, but irritated quickly by small things.', 'Highly intelligent and finds it hard to lie.'],
};

export const PERSONAL_YEAR = {
  1: 'New beginnings. Start projects, take initiative.',
  2: 'Partnerships and patience. Build relationships, avoid forcing results.',
  3: 'Expression and growth. Learn, create and be seen.',
  4: 'Foundations. Hard work, discipline and structure pay off.',
  5: 'Change and movement. Travel, new contacts and flexibility.',
  6: 'Family and responsibility. Home, relationships and service.',
  7: 'Reflection. Study, research and inner work over expansion.',
  8: 'Results. Career, money and recognition for past effort.',
  9: 'Completion. Finish cycles and let go before the next one.',
};

/** Kua: best ("success") direction and East/West group, per the standard Eight Mansions table. */
export const KUA = {
  1: {group: 'East', best: 'South-east'}, 2: {group: 'West', best: 'North-east'}, 3: {group: 'East', best: 'South'},
  4: {group: 'East', best: 'North'}, 6: {group: 'West', best: 'West'}, 7: {group: 'West', best: 'North-west'},
  8: {group: 'West', best: 'South-west'}, 9: {group: 'East', best: 'East'},
};

export function kuaNumber(year, gender) {
  const n = reduce(digitSum(String(year).slice(-2)));
  let k;
  if (gender === 'male') k = year < 2000 ? 10 - n : 9 - n;
  else k = year < 2000 ? n + 5 : n + 6;
  k = reduce(k);
  if (k === 0) k = 9;
  if (k === 5) k = gender === 'male' ? 2 : 8;
  return k;
}

/** One-line themes for each life period, condensed from the full report's Maha Dasha chapter. */
export const PERIOD_THEME = {
  1: 'Name, recognition and authority, with support from seniors and government.',
  2: 'Home, mother, comfort and imagination; property and vehicles can come.',
  3: 'Knowledge, wealth, family happiness and auspicious events.',
  4: 'Sudden gains and foreign travel, with success that comes through hard work.',
  5: 'Learning, communication and business, with new opportunities knocking.',
  6: 'Comfort, luxury, creativity and relationships; wealth in many forms.',
  7: 'Spirituality, intuition and inner growth; a time to seek a guru.',
  8: 'Discipline, power, income and long-term gains through effort.',
  9: 'Energy, action, property and sharp ups and downs of fortune.',
};

/** Life periods from birth until about 25 years from now, and which one is running today. */
export function lifePeriods(day, month, year, mulank, today = new Date()) {
  const periods = [];
  for (let n = mulank, from = year; from <= today.getFullYear() + 25; from += n, n = (n % 9) + 1) periods.push({n, from, to: from + n});
  const started = (y) => today >= new Date(y, month - 1, day);
  return {periods, current: periods.findIndex((p) => started(p.from) && !started(p.to))};
}

export const personalYear = (day, month, year) => reduce(reduce(day) + reduce(month) + reduce(digitSum(String(year))));

/** Full reading for an ISO date (YYYY-MM-DD). gender: 'male' | 'female' | '' (no Kua). */
export function readChart(iso, gender = '', today = new Date()) {
  const [y, m, d] = iso.split('-').map(Number);
  const dateDigits = `${String(d).padStart(2, '0')}${String(m).padStart(2, '0')}${y}`;
  const mulank = reduce(d);
  const bhagyank = reduce(digitSum(dateDigits));
  const kua = gender ? kuaNumber(y, gender) : null;

  const sources = [...dateDigits].map(Number).filter(Boolean).map((n) => ({n, from: 'date'}));
  sources.push({n: bhagyank, from: 'bhagyank'});
  const dayDigits = String(d).split('').map(Number);
  if (d > 9 && dayDigits[1] !== 0) sources.push({n: mulank, from: 'mulank'});
  if (kua) sources.push({n: kua, from: 'kua'});

  const counts = Object.fromEntries(GRID.map((n) => [n, sources.filter((s) => s.n === n).length]));
  const vedicCounts = Object.fromEntries(GRID.map((n) => [n, sources.filter((s) => s.n === n && s.from !== 'kua').length]));
  const planes = PLANES.map((plane) => {
    const have = plane.digits.filter((n) => counts[n]).length;
    return {...plane, status: have === 3 ? 'full' : have === 0 ? 'none' : 'partial', have};
  });
  const thisYear = today.getFullYear();
  return {
    day: d, month: m, year: y, dateDigits, mulank, bhagyank, kua, sources, counts, vedicCounts, planes,
    missing: GRID.filter((n) => !counts[n]).sort(),
    present: GRID.filter((n) => counts[n]).sort(),
    monthNumber: reduce(m),
    yearNumber: reduce(digitSum(String(y))),
    life: lifePeriods(d, m, y, mulank, today),
    pairing: pairing(mulank, bhagyank),
    compat: combine(mulank, bhagyank),
    years: [thisYear, thisYear + 1].map((year) => ({year, number: personalYear(d, m, year)})),
  };
}
