import LocalizedContent from '../../i18n/LocalizedContent';
import KuaDirections from '../KuaDirections';
import {KUA, MISSING, NUMBERS, REPEATS, reductionSteps} from '../../lib/numerology';
import {contact} from '../../data/contact';
import {offerCatalog, formatPrice} from '../../data/offers';
import {absoluteUrl} from '../../lib/site';
import {ActionPlanReading, CareerReading, GrowthReading, InsightsReading, MoneyReading, NumberReading, PeriodsReading, ReflectionReading, RelationshipReading, StrengthsReading, WellbeingReading, YearsReading} from '../home/DetailedReportSections';
import RemedyReading from '../home/RemedyReading';

/**
 * The paid report's content, rendered to HTML on the server and laid out as a PDF by lib/report/pdf.jsx
 * (cover, contents and page furniture are drawn there). Text goes through LocalizedContent, so the Hindi
 * edition uses the translations in i18n/hi.json.
 *
 * Selling note: the report is a complete reading, but it is the map, not the guide. Where a personal session
 * genuinely adds something the report cannot (choosing a spelling, a remedy plan, two charts together, a floor
 * plan, timing a decision), the chapter ends with that consultation, its fee and a link.
 */
export const REPORT_PARTS = [
  {title: 'Your numbers', chapters: [1, 2, 3, 4, 5, 6]},
  {title: 'Your life', chapters: [7, 8, 9, 10, 11, 12]},
  {title: 'Your timing, remedies and next steps', chapters: [13, 14, 15, 16, 17, 18, 19]},
];
export const REPORT_CHAPTERS = ['Your personal numerology overview', 'Your birth number · Mulank', 'Your life path · Bhagyank', 'Your Chaldean name analysis', 'Your grids, planes and patterns', 'Your Vedic numerology reading', 'Your key strengths', 'Areas to improve and their remedies', 'Career and work', 'Business and money', 'Love, marriage and relationships', 'Personal growth and wellbeing', 'Your next six personal years', 'Your Maha Dasha', 'Colours, directions and remedies', 'Your top five insights', 'Your 7, 30 and 90-day action plan', 'Personal reflection', 'Your summary and next steps'];

/** What each consultation answers, for the closing services table. */
const SERVICES = [
  ['consult-blueprint', 'All your numbers read together, with answers to your own questions'],
  ['consult-name', 'Choosing a name spelling that suits your whole chart'],
  ['consult-mobile', 'Checking your phone number or choosing a new one'],
  ['consult-career', 'A job, career switch or business decision'],
  ['consult-relationship', 'Two charts side by side, for a partner or spouse'],
  ['consult-business', 'Business name, founders’ numbers and launch timing'],
  ['consult-baby-name', 'Choosing a name for your baby'],
  ['consult-home-vastu', 'Your home’s layout, entrance and rooms'],
  ['consult-office-vastu', 'Your office or shop layout'],
  ['consult-signature', 'A signature that supports your name number'],
  ['consult-watch', 'The right wristwatch for your numbers'],
];

const list = numbers => numbers.length ? numbers.join(', ') : 'None';
const RELATION = {friend: 'Friendly', enemy: 'Enemy', neutral: 'Neutral', shortTerm: 'Short-term only', double: 'Repeated challenging pair'};
const date = (iso, locale) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', {day: 'numeric', month: 'long', year: 'numeric'});
const offerUrl = offer => absoluteUrl(`/${offer.kind === 'course' ? 'courses' : 'consultations'}/${offer.slug}`);
const findOffer = id => offerCatalog.offers.find(offer => offer.id === id);

function Chapter({number, children}) {
  return <LocalizedContent><section className="fr-page" id={`fr-chapter-${number}`} data-chapter={number}><h2>{REPORT_CHAPTERS[number - 1]}</h2>{children}</section></LocalizedContent>;
}
function Facts({rows}) {return <LocalizedContent><dl className="fr-facts">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></LocalizedContent>}
function Calc({title = 'How it is calculated', rows}) {
  return <LocalizedContent><div className="fr-calc"><h4>{title}</h4>{rows.map(([label, working]) => <div key={label}><p>{label}</p><p className="fr-eq" translate="no">{working}</p></div>)}</div></LocalizedContent>;
}
/** A consultation (or course) that takes the chapter further, with its fee in the buyer's currency. */
function Next({id, label = 'Go deeper with Adarshh', currency, children}) {
  const offer = findOffer(id);
  if (!offer) return null;
  const url = offerUrl(offer);
  return <LocalizedContent><aside className="fr-offer"><p className="fr-offer-label">{label}</p><h4>{offer.name}</h4><p className="fr-offer-price" translate="no">{formatPrice(offer, undefined, currency)}</p><p>{children}</p><p className="fr-offer-link"><a href={url}>{offer.kind === 'course' ? 'See the course' : 'Book this session'}</a> <span translate="no">{url.replace('https://', '')}</span></p></aside></LocalizedContent>;
}

const sumOf = digits => [...digits].reduce((sum, d) => sum + Number(d), 0);
function coreWorkings(c) {
  const kua = c.kuaCalculation;
  return [
    ['Mulank is the total of the day you were born.', c.day > 9 ? `${String(c.day).split('').join(' + ')} = ${reductionSteps(c.day).slice(1).join(' → ')}` : `${c.day}`],
    ['Bhagyank is the total of the whole date: day, month and year.', `${c.dateDigits.split('').join(' + ')} = ${reductionSteps(sumOf(c.dateDigits)).join(' → ')}`],
    ...(kua ? [[kua.operator === '−' ? 'Kua (male): add the birth-year digits, then take that number from 11.' : 'Kua (female): add the birth-year digits, then add 4.',
      `${kua.digits.join(' + ')} = ${reductionSteps(kua.yearSum).join(' → ')}; ${kua.operator === '−' ? `11 − ${kua.factor}` : `${kua.factor} + 4`} = ${reductionSteps(kua.raw).join(' → ')}${kua.fiveRule ? ` → ${kua.number}` : ''}`]] : []),
    ...(kua?.fiveRule ? [['A Kua of 5 is read as 2 for men and 8 for women.', `5 → ${kua.number}`]] : []),
  ];
}

export function ReportDocument({report, locale, currency = 'INR'}) {
  const {chart: c, names: n} = report;
  const m = NUMBERS[c.mulank], b = NUMBERS[c.bhagyank];
  return <LocalizedContent><article className="full-report" aria-label="Complete personal numerology report">
    <Chapter number={1}>
      <p>This reading brings together your birth date, name, grids, number relationships and personal cycles. Use it as a prompt for reflection and practical planning.</p>
      <Facts rows={[["Date of birth", date(report.dob, locale)], ["Mulank · birth number", c.mulank], ["Bhagyank · destiny number", c.bhagyank], ["Full name number", `${n.total} / ${n.number}`], ["First name number", `${n.first.total} / ${n.first.number}`], ["Month number", c.monthNumber], ["Year number", c.yearNumber], ["Kua", c.kua || 'Not included']]}/>
      <Calc title="How your core numbers are calculated" rows={coreWorkings(c)}/>
      <h3>How to read your report</h3><p>The opening chapters introduce each number. Later chapters apply the connections to work, love and practical choices. Each missing number is followed straight away by its remedies in chapter 8.</p>
      <Next id="consult-blueprint" currency={currency}>This report explains your numbers one by one. In a Blueprint Session, Adarshh reads them together with your actual situation and answers the questions you bring, from career and money to marriage and timing.</Next>
      <p className="fr-note">Numerology is an interpretive tradition, not a scientific prediction. This report does not guarantee outcomes or replace medical, financial, legal or other professional advice.</p>
    </Chapter>
    <Chapter number={2}>
      <Facts rows={[["Mulank", c.mulank], ["Planet", m.planet], ["Traditional day", m.day], ["Theme", m.trait]]}/>
      <Calc rows={coreWorkings(c).slice(0, 1)}/>
      <NumberReading number={c.mulank}/>
      <h3>Natural strengths</h3><p>{m.strengths}</p><h3>Areas to be mindful of</h3><p>{m.watch}</p>
      <h3>Reflection</h3><p>Where do these strengths already show up in your everyday life? Choose one situation where you could use them more deliberately.</p>
    </Chapter>
    <Chapter number={3}>
      <Facts rows={[["Bhagyank", c.bhagyank], ["Planet", b.planet], ["Theme", b.trait]]}/>
      <Calc rows={coreWorkings(c).slice(1, 2)}/>
      {c.mulank !== c.bhagyank ? <><NumberReading number={c.bhagyank}/><h3>Potential challenges</h3><p>{b.watch}</p></> : <><p>Your destiny number repeats your birth number, already introduced in chapter 2. Here the question changes from your natural approach to whether that approach supports the commitments you want to sustain.</p><p>Use one real choice as the test: does the option only feel attractive now, or does it also fit the responsibilities you want to keep over time?</p><a href={`#fr-remedy-core-${c.mulank}`}>See the combined core-number practice</a></>}
      <h3>Putting your two core numbers together</h3><p>Your Mulank describes your natural style. Your Bhagyank supplies a second perspective on direction and growth.</p>
      <p>Number relationship: {RELATION[c.pairing] || c.pairing}</p><p>Use both descriptions to identify a strength you can practise and a reaction you want to manage more thoughtfully.</p>
    </Chapter>
    <Chapter number={4}>
      <p>The name calculation uses English letters, ignoring spaces, hyphens and apostrophes. The total is reduced to a single digit; the unreduced compound total is shown too.</p>
      <table><thead><tr><th>Name part</th><th>Letter values</th><th>Total</th><th>Number</th></tr></thead><tbody>{n.words.map((word, i) => <tr key={i}><td translate="no">{word.word}</td><td translate="no">{word.letters.map(l => `${l.letter}=${l.value}`).join(' + ')}</td><td>{word.total}</td><td>{word.number}</td></tr>)}</tbody></table>
      <Facts rows={[["Full name compound total", n.total], ["Full name number", n.number], ["Letters counted", n.letterCount], ["First name number", n.first.number]]}/>
      {![c.mulank, c.bhagyank].includes(n.number) ? <><p>{NUMBERS[n.number].strengths}</p><p>{NUMBERS[n.number].watch}</p></> : <p>Your name repeats a number introduced earlier. Its role here is how you express an intention; the name alignment below is read separately from the birth-date grid.</p>}
      <h3>How your name relates to your core numbers</h3>
      <table><thead><tr><th>Name layer</th><th>Number</th><th>With Mulank</th><th>With Bhagyank</th></tr></thead><tbody><tr><th scope="row">First name</th><td>{n.first.number}</td><td>{RELATION[report.firstNameRelations.mulank] || report.firstNameRelations.mulank}</td><td>{RELATION[report.firstNameRelations.bhagyank] || report.firstNameRelations.bhagyank}</td></tr><tr><th scope="row">Full name</th><td>{n.number}</td><td>{RELATION[report.nameRelations.mulank] || report.nameRelations.mulank}</td><td>{RELATION[report.nameRelations.bhagyank] || report.nameRelations.bhagyank}</td></tr></tbody></table>
      <p>Neutral alignment does not mean an unsuitable name. It describes a different number theme to understand; it is not an automatic instruction to change a spelling.</p>
      <h3>Putting your name theme into practice</h3><p>Compare what you intend with what another person actually receives from your words and actions. A name number is useful as a reflection on expression; it does not replace the need to communicate clearly.</p>
      <p>Friendly name numbers to discuss: {list(report.suggestedNames)}</p>
      <Next id="consult-name" currency={currency}>Your report shows what your name adds up to. Changing it is a different job: the new spelling has to suit your Mulank, Bhagyank and grid together, still read naturally, and work for your documents and signature. Adarshh prepares and checks the options with you.</Next>
      {report.mobile && <><h3>Phone number evaluation</h3><p translate="no">{report.mobile.digits}</p><p>{report.mobile.values.join(' + ')} = {report.mobile.total} → {report.mobile.number}</p><p>With Mulank: {RELATION[report.mobile.mulank] || report.mobile.mulank}</p><p>With Bhagyank: {RELATION[report.mobile.bhagyank] || report.mobile.bhagyank}</p><p>With name number: {RELATION[report.mobile.name] || report.mobile.name}</p><h4>Phone-total theme</h4><p>{NUMBERS[report.mobile.number].trait}</p><p>The phone number uses national digits only, without a country calling code. Its total is evaluated separately and does not add digits to either kundli.</p>
        <Next id="consult-mobile" currency={currency}>Thinking of a new number? Adarshh checks your current number and the ones you are considering against your full chart before you switch.</Next></>}
    </Chapter>
    <Chapter number={5}>
      <div className="fr-grid-pair">{report.grids.map(grid => <div key={grid.name}><h3>{grid.name}</h3><div className="fr-grid">{grid.layout.map(number => <span key={number}>{grid.counts[number] ? String(number).repeat(grid.counts[number]) : '·'}<small>{NUMBERS[number].planet}</small></span>)}</div></div>)}</div>
      <table><thead><tr><th>Plane</th><th>Present</th><th>Reading</th></tr></thead><tbody>{c.planes.map(p => <tr key={p.key}><td>{p.name}</td><td>{p.have}/3</td><td>{p.status === 'full' ? p.full : p.status === 'none' ? p.none : 'Partly active; use the missing-number practices to build balance.'}</td></tr>)}</tbody></table>
      <p>Lo Shu includes the full birth year and optional Kua. Vedic uses only the last two year digits and no Kua. Both include Bhagyank and eligible Mulank.</p>
      <p>Missing in your Lo Shu grid: {list(c.missing)}</p>
      {!!report.remedyPlan.focuses.length && <a href="#fr-chapter-8">See each missing number with its remedies in chapter 8</a>}
    </Chapter>
    <Chapter number={6}>
      <p>The Vedic kundli uses day, month and the last two year digits, plus Bhagyank and eligible Mulank. The century and Kua are excluded. Read these planetary positions separately from the Lo Shu planes.</p>
      <table><thead><tr><th>Number and planet</th><th>Count</th><th>Reading</th></tr></thead><tbody>{[3, 1, 9, 6, 7, 5, 2, 8, 4].map(number => <tr key={number}><td>{number} · {NUMBERS[number].planet}</td><td>{c.vedicCounts[number]}</td><td>{c.vedicCounts[number] ? REPEATS[number][Math.min(c.vedicCounts[number], 4) - 1] : MISSING[number]}</td></tr>)}</tbody></table>
      <h3>Vedic plane patterns</h3><table><thead><tr><th>Plane</th><th>Present</th><th>Reading</th></tr></thead><tbody>{c.vedicPlanes.map(plane => <tr key={plane.key}><td>{plane.name}</td><td>{plane.have}/3</td><td>{plane.status === 'full' ? plane.full : plane.status === 'none' ? plane.none : 'Partly active; use the missing-number practices to build balance.'}</td></tr>)}</tbody></table>
      <h3>Vedic missing numbers</h3><p>{list([1, 2, 3, 4, 5, 6, 7, 8, 9].filter(number => !c.vedicCounts[number]))}</p>
      {!!report.remedyPlan.focuses.length && <a href="#fr-chapter-8">See each missing number with its remedies in chapter 8</a>}
      <p>Your name, phone total, Mulank and Bhagyank retain their separate meanings. They do not add new digits to this kundli.</p>
    </Chapter>
    <Chapter number={7}><StrengthsReading report={report}/></Chapter>
    <Chapter number={8}>
      <GrowthReading report={report}/>
      <Next id="consult-blueprint" label="Your personal remedy plan" currency={currency}>The remedies above are the traditional ones for each missing number. Which to start with, how long to follow it, and whether a gemstone, yantra or crystal suits you depends on your whole chart. Adarshh sets out your personal remedy plan in a Blueprint Session.</Next>
    </Chapter>
    <Chapter number={9}>
      <CareerReading report={report}/>
      <Next id="consult-career" currency={currency}>Facing a choice between jobs, a career switch or starting out on your own? Adarshh compares your real options with your numbers and your coming personal years.</Next>
    </Chapter>
    <Chapter number={10}>
      <MoneyReading report={report}/>
      <Next id="consult-business" currency={currency}>Starting or renaming a business? Adarshh checks the business name, the founders’ numbers, the phone number and the launch date together.</Next>
    </Chapter>
    <Chapter number={11}>
      <RelationshipReading report={report} locale={locale}/>
      <Next id="consult-relationship" currency={currency}>This chapter reads your own numbers. A compatibility reading puts both charts side by side: where you support each other, where you clash, and what helps.</Next>
    </Chapter>
    <Chapter number={12}><WellbeingReading report={report}/></Chapter>
    <Chapter number={13}>
      <YearsReading report={report}/>
      <Next id="consult-blueprint" label="Plan the timing with Adarshh" currency={currency}>Planning a big step such as a marriage, a move or a launch? Adarshh reads your personal years and current Maha Dasha together to help you choose the timing.</Next>
    </Chapter>
    <Chapter number={14}><PeriodsReading report={report}/></Chapter>
    <Chapter number={15}>
      <Facts rows={[["Traditional day", m.day], ["Colours of friendly numbers", [...new Set(c.compat.friend.map(number => NUMBERS[number].colour))].join(', ')], ["Colours of enemy numbers", [...new Set(c.compat.enemy.map(number => NUMBERS[number].colour))].join(', ') || 'None'], ["Kua group", c.kua ? KUA[c.kua].group : 'Not included']]}/>
      {c.kua && <><h3>Your four Kua directions</h3><KuaDirections kua={c.kua}/>
        <Next id="consult-home-vastu" currency={currency}>Your Kua directions are one part of the picture. A Vastu consultation works from your actual floor plan: the entrance, kitchen, bedrooms and where you work.</Next></>}
      <h3>Traditional gemstone</h3><p>{report.gemstone.stone} · {report.gemstone.hindi}</p>
      <p>A gemstone is a traditional association, not a purchase recommendation. Its weight, quality and the right finger and day to wear it need a personal check before you buy.</p>
      <RemedyReading report={report}/>
    </Chapter>
    <Chapter number={16}><InsightsReading report={report}/></Chapter>
    <Chapter number={17}><ActionPlanReading report={report}/></Chapter>
    <Chapter number={18}><ReflectionReading report={report}/></Chapter>
    <Chapter number={19}>
      <Facts rows={[["Core number", c.mulank], ["Bhagyank", c.bhagyank], ["Name number", n.number], ["Current personal year", report.years[0].number], ["Chosen starting practices", report.remedyPlan.startIds.length], ["Combined report", "Lo Shu + Vedic"]]}/>
      <p>Choose your three most useful insights and give each a practical next step. Revisit the plan in 30 days.</p>
      <h3>What this report can and cannot do</h3>
      <p>This report is your map. It explains each of your numbers and the traditional practices linked to them. It cannot weigh those numbers against your real life: the decision in front of you, what has already happened, and which of two options suits you now. That is the work of a personal consultation.</p>
      <h3>Where to go from here</h3>
      <p>Every session is one-to-one with Adarshh Panndey and starts from the numbers in this report.</p>
      <table className="fr-services"><thead><tr><th>Consultation</th><th>Best for</th><th>Fee</th></tr></thead><tbody>{SERVICES.map(([id, use]) => {const offer = findOffer(id); return offer ? <tr key={id}><td><a href={offerUrl(offer)}>{offer.name}</a></td><td>{use}</td><td translate="no">{formatPrice(offer, undefined, currency)}</td></tr> : null;})}</tbody></table>
      <Next id="course-launchpad" label="Learn to read numbers yourself" currency={currency}>Enjoyed understanding your numbers? The Numerology Career Launchpad teaches you to calculate and read charts like this one, for yourself and for clients.</Next>
      <h3>Talk to the team</h3><p>Call or WhatsApp, or email, and mention this report.</p><p translate="no">{contact.phone} · {contact.email} · www.numericcvaastu.com</p>
      <p className="fr-note">Love-life outlooks describe traditional themes and possible choices, not a fixed event forecast. Numerology is an interpretive tradition; this report does not replace medical, financial, legal or other professional advice.</p>
    </Chapter>
  </article></LocalizedContent>;
}
