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
 * - Friendly numbers: classical Jyotish natural friendships between planets, with Rahu read like Saturn
 *   and Ketu like Mars ("Shanivat Rahu, Kujavat Ketu").
 * - Personal year: day + month + the year in question, reduced.
 */

export const GRID = [4, 9, 2, 3, 5, 7, 8, 1, 6];

export const reduce = (n) => {
  while (n > 9) n = String(n).split('').reduce((sum, d) => sum + Number(d), 0);
  return n;
};
const digitSum = (text) => text.split('').reduce((sum, d) => sum + Number(d), 0);

export const NUMBERS = {
  1: {planet: 'Sun', hindi: 'Surya', day: 'Sunday', colours: 'Gold, orange, copper', trait: 'leadership, independence and self-respect', strengths: 'Confident, original and decisive. Takes charge naturally.', watch: 'Can be proud or impatient with slower people.'},
  2: {planet: 'Moon', hindi: 'Chandra', day: 'Monday', colours: 'White, cream, silver', trait: 'sensitivity, imagination and cooperation', strengths: 'Caring, intuitive and diplomatic. Works well in partnership.', watch: 'Mood swings and overthinking; needs emotional security.'},
  3: {planet: 'Jupiter', hindi: 'Guru', day: 'Thursday', colours: 'Yellow, saffron', trait: 'wisdom, guidance and discipline', strengths: 'A natural teacher and adviser. Ethical, ambitious and well read.', watch: 'Can lecture others or become rigid about being right.'},
  4: {planet: 'Rahu', hindi: 'Rahu', day: 'Saturday', colours: 'Grey, electric blue', trait: 'unconventional thinking and sudden change', strengths: 'Inventive, hard-working and good at research or technology.', watch: 'Life can bring sudden ups and downs; impulsive or rebellious streaks.'},
  5: {planet: 'Mercury', hindi: 'Budh', day: 'Wednesday', colours: 'Green', trait: 'communication, business sense and quick learning', strengths: 'Witty, adaptable and good with money, trade and people.', watch: 'Restless; starts many things and can scatter energy.'},
  6: {planet: 'Venus', hindi: 'Shukra', day: 'Friday', colours: 'White, pink, light blue', trait: 'love, beauty, comfort and family', strengths: 'Charming, artistic and responsible. Creates harmony at home.', watch: 'Can overindulge in comfort or depend on others’ approval.'},
  7: {planet: 'Ketu', hindi: 'Ketu', day: 'Tuesday', colours: 'Grey, light green', trait: 'intuition, spirituality and deep research', strengths: 'Insightful, philosophical and drawn to the hidden side of things.', watch: 'Detachment and doubt; can feel misunderstood or alone.'},
  8: {planet: 'Saturn', hindi: 'Shani', day: 'Saturday', colours: 'Dark blue, black', trait: 'hard work, justice and long-term results', strengths: 'Patient, serious and dependable. Success grows steadily with age.', watch: 'Delays and heavy responsibility early in life; can turn pessimistic.'},
  9: {planet: 'Mars', hindi: 'Mangal', day: 'Tuesday', colours: 'Red, maroon', trait: 'courage, energy and protection', strengths: 'Brave, energetic and generous. Fights for people and causes.', watch: 'Quick temper and impatience; can rush into conflict.'},
};

/** Natural planetary friendships (Parashari). Rahu follows Saturn, Ketu follows Mars. */
const PLANET_OF = {1: 'Sun', 2: 'Moon', 3: 'Jupiter', 4: 'Saturn', 5: 'Mercury', 6: 'Venus', 7: 'Mars', 8: 'Saturn', 9: 'Mars'};
const FRIENDSHIP = {
  Sun: {friend: ['Moon', 'Mars', 'Jupiter'], enemy: ['Venus', 'Saturn']},
  Moon: {friend: ['Sun', 'Mercury'], enemy: []},
  Mars: {friend: ['Sun', 'Moon', 'Jupiter'], enemy: ['Mercury']},
  Mercury: {friend: ['Sun', 'Venus'], enemy: ['Moon']},
  Jupiter: {friend: ['Sun', 'Moon', 'Mars'], enemy: ['Mercury', 'Venus']},
  Venus: {friend: ['Mercury', 'Saturn'], enemy: ['Sun', 'Moon']},
  Saturn: {friend: ['Mercury', 'Venus'], enemy: ['Sun', 'Moon', 'Mars']},
};
export function relation(of, other) {
  if (of === other) return 'friend';
  const a = PLANET_OF[of], b = PLANET_OF[other];
  if (a === b) return 'friend';
  if (FRIENDSHIP[a].friend.includes(b)) return 'friend';
  if (FRIENDSHIP[a].enemy.includes(b)) return 'enemy';
  return 'neutral';
}
export function relationsFor(n) {
  const out = {friend: [], neutral: [], enemy: []};
  for (let m = 1; m <= 9; m++) out[relation(n, m)].push(m);
  return out;
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
  const planes = PLANES.map((plane) => {
    const have = plane.digits.filter((n) => counts[n]).length;
    return {...plane, status: have === 3 ? 'full' : have === 0 ? 'none' : 'partial', have};
  });
  const thisYear = today.getFullYear();
  return {
    day: d, month: m, year: y, dateDigits, mulank, bhagyank, kua, sources, counts, planes,
    missing: GRID.filter((n) => !counts[n]).sort(),
    present: GRID.filter((n) => counts[n]).sort(),
    pairing: relation(mulank, bhagyank),
    years: [thisYear, thisYear + 1].map((year) => ({year, number: personalYear(d, m, year)})),
  };
}
