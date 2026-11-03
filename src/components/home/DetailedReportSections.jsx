import LocalizedContent from '../../i18n/LocalizedContent';
import {NUMBERS} from '../../lib/numerology';
import {REPORT_PROFILES} from '../../data/reportProfiles';
import {REFLECTION_EXAMPLES} from '../../data/reflectionGuidance';

const numbers = values => values.length ? values.join(', ') : 'None';
const relationshipLabel = {
  friend:'Supportive in this chart',neutral:'Different styles to understand',enemy:'Needs conscious adjustment',
  shortTerm:'Short-term qualification in the reference chart',double:'Repeated challenging combination in the reference chart',
};

export function NumberReading({number}) {
  return <LocalizedContent><div className="fr-trait-grid">{REPORT_PROFILES[number].traits.map(trait=><div className="fr-trait" key={trait.label}><h3>{trait.label}</h3><p>{trait.text}</p></div>)}</div></LocalizedContent>;
}

export function StrengthsReading({report}) {
  const plane=[...report.chart.planes].sort((a,b)=>b.have-a.have)[0];
  return <LocalizedContent><>
    <p>The number descriptions are already in the opening chapters. These four applications turn the available themes into something you can observe and use.</p>
    <h3>Apply a skill to a real problem</h3><p>{report.profiles.birth.careers[0]}</p><p>Choose one small task in this area, define who it should help and ask for feedback on the result. A useful outcome is stronger evidence than identifying with a description.</p>
    <h3>Use your name as a reminder about expression</h3><p>{report.profiles.name.habits[0]}</p><p>Compare your intention with how the other person understood it. This tests expression in context rather than adding another list of traits.</p>
    <h3>Build from an available plane</h3><p>{plane.name} · {plane.have}/3</p><p>This is your most populated Lo Shu plane, not a score of intelligence or ability. Use it to choose a planning, communication or follow-through task, and link any absent position to the remedy plan.</p>
    <h3>Judge a strength by its effect</h3><p>At the end of a project or conversation, ask what became clearer, easier or more dependable because of your contribution. Keep the action that helped and adjust the part that created extra work for others.</p>
  </></LocalizedContent>;
}

export function GrowthReading({report}) {
  return <LocalizedContent><>
    {report.growthAreas.map((area,i)=><div className="fr-detail-block" key={`${area.number}-${i}`}><h3>Focus {i+1} · {area.missing?'Missing number':'Number theme'} {area.number}</h3><p>{area.pattern}</p><h4>What to practise</h4><p>{area.practice}</p><h4>How to review it</h4><p>Record one real example each week: what happened, how you responded and what you would change next time.</p></div>)}
    <h3>Your complete missing-number list</h3><p>{numbers(report.chart.missing)}</p><a href="#fr-chapter-15">See how each gap connects to the detailed remedy plan</a>
  </></LocalizedContent>;
}

export function CareerReading({report}) {
  const c=report.chart;
  return <LocalizedContent><>
    <h3>Your natural work style · Mulank {c.mulank}</h3><p>{report.work.birth[0]}</p><p>{report.work.birth[1]}</p>
    {c.mulank!==c.bhagyank&&<><h3>Your development direction · Bhagyank {c.bhagyank}</h3><p>{report.work.destiny[0]}</p><p>{report.work.destiny[1]}</p></>}
    <h3>Work themes worth exploring</h3><ul>{report.careerThemes.map(theme=><li key={theme}>{theme}</li>)}</ul>
    {![c.mulank,c.bhagyank].includes(report.names.number)&&<><h3>Your professional name expression · {report.names.number}</h3><p>{report.work.name[0]}</p></>}
    <h3>Working environment and habits</h3><p>Before accepting a role, ask how priorities change, who makes decisions and how completed work is measured. Compare those answers with the environment above; a job title alone does not show whether the work fits.</p>
    <h3>A practical career experiment</h3><p>Choose one theme above. Speak to someone doing that work, try a small relevant project and compare the experience with your skills, qualifications and real opportunities before making a major move.</p>
  </></LocalizedContent>;
}

export function MoneyReading({report}) {
  return <LocalizedContent><>
    <h3>From a work strength to business value</h3><p>The career themes in the preceding chapter become useful commercially when they solve a real problem. This chapter adds the boundaries, costs and review habits needed to make that contribution sustainable.</p>
    <h3>Your business and money habits</h3><ul>{report.moneyThemes.map(theme=><li key={theme}>{theme}</li>)}</ul>
    <h3>Turning a strength into an offer</h3><ol><li>Identify one problem you can already solve with a demonstrable skill.</li><li>Describe the outcome, scope and time required in plain language.</li><li>Try a small version and collect feedback before increasing the commitment.</li><li>Review whether the work fits both your priorities and the customer’s actual need.</li></ol>
    <h3>Your finance-focused reflection cycle</h3><p>{report.financeReviewYear} · Personal year 8</p><p>In this tradition, personal year 8 is associated with results, resources and responsibility. Use it as a review theme, not a prediction of income or an instruction to time an investment.</p>
    <h3>Questions for your next review</h3><ul><li>Which work produces value, and which only keeps me busy?</li><li>Are my scope, price, costs and time clearly understood?</li><li>Am I making a decision from evidence, excitement or pressure?</li></ul>
  </></LocalizedContent>;
}

export function RelationshipReading({report,locale}) {
  const c=report.chart, love=report.relationshipReading, r=report.profiles.birth.relationship;
  const showSingle=['single','unspecified'].includes(love.status);
  const showCommitted=['developing','committed','unspecified'].includes(love.status);
  const formatDate=iso=>new Date(`${iso}T00:00:00`).toLocaleDateString(locale==='hi'?'hi-IN':'en-IN',{day:'numeric',month:'long',year:'numeric'});
  const statusLabels={unspecified:'Relationship status not supplied',single:'Single · open to a connection',developing:'Getting to know someone',committed:'In a committed relationship'};
  const current=love.outlook[0];
  return <LocalizedContent><>
    <p className="fr-label">{statusLabels[love.status]}</p>
    <h3>How a romantic connection may begin</h3><p>{love.attraction}</p>
    <h3>The longer-term possibility</h3><p>{love.potential}</p>
    {love.sameCore&&<p>{`Birth number ${c.mulank} and destiny number ${c.bhagyank} are the same. The attraction style and the commitment theme therefore need to work together; a second number is not being used to cancel the first.`}</p>}
    <h3>How your name changes the expression</h3>
    {love.nameRepeatsCore?<p>Your name repeats a core number, so it reinforces the existing expression rather than adding a separate personality. Judge the relationship through actual availability, choices and follow-through.</p>:<p>{love.nameContext}</p>}
    <h3>Your love-life outlook now</h3>
    <p><b>{current.year} · Personal year {current.number} · {current.heading}</b></p>
    {showSingle&&<><h4>If you are single</h4><p>{current.single}</p></>}
    {showCommitted&&<><h4>{love.status==='developing'?'If a connection is developing':'If you are already in a relationship'}</h4><p>{current.committed}</p></>}
    {love.currentPeriod&&<div className="fr-love-phase"><h4>What the active life period adds</h4><p>{love.currentPeriod.planet} · {love.currentPeriod.from}–{love.currentPeriod.to}</p><p>{love.currentPeriod.text}</p><p>Next period begins: {new Date(love.currentPeriod.to,c.month-1,c.day).toLocaleDateString(locale==='hi'?'hi-IN':'en-IN',{day:'numeric',month:'long',year:'numeric'})}</p></div>}
    <h3>Possibilities over the next five years</h3>
    <p>These are traditional cycle themes for opportunities and conversations to consider. They do not establish that you are currently dating, or promise a partner, marriage date or a breakup.</p>
    <div className="fr-love-outlook">{love.outlook.slice(1).map(year=><section key={year.year}><h4>{year.year} · {year.number} · {year.heading}</h4>{showSingle&&<p><b>New connection:</b> {year.single}</p>}{showCommitted&&<p><b>Existing or developing bond:</b> {year.committed}</p>}</section>)}</div>
    <h3>What could make a promising connection difficult</h3><p>{love.risk}</p>
    <h3>How the grid changes the advice</h3>
    {love.gaps.length?<div>{love.gaps.map(gap=><div className="fr-relationship-topic" key={gap.number}><h4>{gap.number} · {gap.grids.join(' / ')}</h4><p>{gap.text}</p><a href={`#fr-remedy-${gap.practiceId}`}>See the linked remedy and its purpose</a></div>)}</div>:<p>No missing-number practice is added; focus on communication, shared responsibilities and the habits above.</p>}
    <h3>Your next step in love</h3>
    {showSingle&&<><h4>For meeting someone</h4><p>{love.nextStep.single}</p></>}
    {showCommitted&&<><h4>For building the bond</h4><p>{love.nextStep.committed}</p></>}
    <h4>When a difficult conversation is needed</h4><p>{r.communication}</p><p>{r.repair}</p>
    <h3>Partner-number themes in your chart</h3>
    <p>The following are your combined chart’s friendly birth-number themes. They are not a ranking of people or a guarantee of compatibility.</p>
    {c.compat.friend.length?<table><thead><tr><th>Friendly number</th><th>Needs to understand in a partner</th></tr></thead><tbody>{c.compat.friend.map(n=><tr key={n}><th scope="row">{n} · {NUMBERS[n].planet}</th><td>{REPORT_PROFILES[n].relationship.needs}</td></tr>)}</tbody></table>:<p>There are no unqualified friendly numbers in this combination; a two-person reading is more useful than selecting a number in isolation.</p>}
    <dl className="fr-facts"><div><dt>Neutral numbers</dt><dd>{numbers(c.compat.neutral)}</dd></div><div><dt>Numbers needing more care</dt><dd>{numbers(c.compat.enemy)}</dd></div><div><dt>Short-term qualification</dt><dd>{numbers(c.compat.shortTerm)}</dd></div></dl>
    <p>Neutral means a different style to understand. A challenging number is a prompt for communication and context, not a reason to reject or leave someone.</p>
    {report.partner?<><h3>Your optional two-person comparison</h3><p>Second person’s date of birth: <span translate="no">{formatDate(report.partner.dob)}</span></p>
      <table><thead><tr><th>Layer</th><th>Your number</th><th>Their number</th><th>Traditional comparison</th></tr></thead><tbody><tr><th scope="row">Mulank</th><td>{c.mulank}</td><td>{report.partner.chart.mulank}</td><td>{relationshipLabel[report.partner.birthPairing]}</td></tr><tr><th scope="row">Bhagyank</th><td>{c.bhagyank}</td><td>{report.partner.chart.bhagyank}</td><td>{relationshipLabel[report.partner.destinyPairing]}</td></tr></tbody></table>
      <p>Shared friendly numbers: {numbers(report.partner.sharedFriendly)}</p><h4>Their communication theme</h4><p>{REPORT_PROFILES[report.partner.chart.mulank].relationship.communication}</p><h4>A need to discuss together</h4><p>{REPORT_PROFILES[report.partner.chart.bhagyank].relationship.needs}</p>
    </>:<p className="fr-note">No second person’s birth date was supplied, so this is your individual relationship profile. Add the optional date before generating the report for a two-person comparison.</p>}
  </></LocalizedContent>;
}

export function WellbeingReading({report}) {
  return <LocalizedContent><>
    <h3>Habits matched to these themes</h3><ul>{report.wellbeing.map(item=><li key={item}>{item}</li>)}</ul>
    <h3>Your personal growth practice</h3><p>Choose one habit above that addresses something you actually notice in daily life. Keep a simple record of the situation and its effect, then review whether the habit helps rather than assuming that a number describes your health.</p>
    <p className="fr-note">A birth date cannot establish a disease, health risk or treatment. These suggestions are everyday reflection habits; seek qualified healthcare advice for symptoms or health concerns.</p>
  </></LocalizedContent>;
}

export function YearsReading({report}) {
  return <LocalizedContent><>
    <p>Each year below has ten distinct planning points. They combine the personal-year theme with one practice from your own chart. They are suggestions to review, not predictions that events must happen.</p>
    {report.yearGuidance.map(year=><div key={year.year} className="fr-year"><h3>{year.year} · Personal year {year.number}</h3><ol>{year.points.map(point=><li key={point.label}><b>{point.label}.</b> {point.text}</li>)}</ol></div>)}
  </></LocalizedContent>;
}

export function PeriodsReading({report}) {
  const c=report.chart;
  return <LocalizedContent><>
    <p>Periods begin on your birthday. The first runs for your Mulank’s number of years, then the numbers cycle from 1 to 9. Each period below includes work, relationship and practical growth themes.</p>
    {report.periods.map(period=><div className={`fr-period ${period.current?'fr-current':''}`} key={period.from}><h3>{period.from}–{period.to} · {period.n} · {NUMBERS[period.n].planet}{period.current?' · Current':''}</h3><p>Birthday boundary: {String(c.day).padStart(2,'0')}/{String(c.month).padStart(2,'0')}</p><p>{period.theme}</p><dl><div><dt>Work & skills</dt><dd>{period.work}</dd></div><div><dt>Relationship theme</dt><dd>{period.relationship}</dd></div><div><dt>Priority</dt><dd>{period.focus}</dd></div><div><dt>Watch for</dt><dd>{period.watch}</dd></div><div><dt>Practical step</dt><dd>{period.practice}</dd></div></dl></div>)}
  </></LocalizedContent>;
}

export function InsightsReading({report}) {
  return <LocalizedContent><><ol className="fr-insights">{report.insightRows.map(row=><li key={row.label}><h3>{row.label} · {row.number}</h3><p>{row.text}</p><a href={`#${row.target}`}>Read the explanation in context</a></li>)}</ol><h3>Your three big takeaways</h3><ul><li><a href="#fr-chapter-9">Turn one work theme into a small practical experiment</a></li><li><a href="#fr-chapter-11">Choose the love-life guidance that fits your actual situation</a></li><li><a href="#fr-chapter-15">Follow the three chosen practices before adding more</a></li></ul></></LocalizedContent>;
}

export function ActionPlanReading({report}) {
  return <LocalizedContent><>
    <div className="fr-detail-block"><h3>Next 7 days</h3><p>Choose a real situation for each linked practice. Read the instructions once in the remedy chapter, then put a manageable time in your calendar.</p><ol>{report.remedyPlan.startIds.map(id=>{const card=report.remedyPlan.cards.find(item=>item.id===id);return <li key={id}><a href={`#fr-remedy-${id}`}>{card.core?'Core-number practice':card.title} · {card.number}</a></li>})}</ol></div>
    <div className="fr-detail-block"><h3>Next 30 days</h3><ol><li>Keep a brief record of the three chosen practices: situation, action and what changed.</li><li>Ask the person affected whether the action helped; do not rely only on your own intention.</li><li>Adjust the routine that was unrealistic before adding another remedy or purchase.</li></ol></div>
    <div className="fr-detail-block"><h3>Next 90 days</h3><ol><li>Compare the first and latest examples. Keep the practice that improved a real recurring situation.</li><li>Review one practical relationship or work decision using the evidence you collected.</li><li>Take unresolved questions, including any traditional placement or wearing specification, to the practitioner for a personal review.</li></ol></div>
  </></LocalizedContent>;
}

export function ReflectionReading({report}) {
  const {chart,remedyPlan,relationshipReading}=report;
  const example=REFLECTION_EXAMPLES[chart.mulank];
  const relationshipFocus=['developing','committed'].includes(relationshipReading.status)?remedyPlan.focuses.find(focus=>focus.number===6):null;
  const priority=relationshipFocus||remedyPlan.focuses.find(focus=>focus.grids.length===2)||remedyPlan.focuses[0];
  const decisions={
    single:'If you want to meet someone, decide what kind of connection you can genuinely make time for. Be clear about your intention before treating attention or attraction as a commitment.',
    developing:'If a connection is developing, clarify whether both people want the same pace and commitment. Choose a direct conversation rather than deciding from hints alone.',
    committed:'In a committed relationship, choose one shared plan that needs a clear agreement about time, responsibility or expectations. Confirm that both people want the same next step.',
    unspecified:'Choose one current work or personal decision that remains unresolved. Write the available options, the commitment each requires and the smallest step that would give you useful evidence.',
  };
  return <LocalizedContent><>
    <p>These reflections connect the report to your own experience. Each question has a chart-based starting point and a practical prompt; they do not assume facts about your life that you have not shared.</p>
    <section className="fr-detail-block"><h3>What is my strongest quality?</h3><p><b>A quality to build on: {report.profiles.birth.traits[0].label}</b></p><p>Based on your birth number: {chart.mulank}</p><p>{example.evidence}</p><h4>Reflect on one example from your own life</h4><p>After trying it, ask: what did I contribute, what changed and what would I do differently next time?</p></section>
    <section className="fr-detail-block"><h3>Which area needs more attention?</h3>
      {priority?<><p>{`Your first ${priority.grids.length===2?'shared-grid':'grid'} priority is number ${priority.number}: ${priority.title}.`}</p><p>Which recent situation would improve if you gave this area deliberate attention? Choose that situation for the linked practice.</p><a href={`#fr-remedy-gap-${priority.number}`}>Open the detailed practice</a></>:<><p>No digit is missing from either grid. Focus on applying a core-number practice to a real situation rather than adding a remedy for a gap.</p><a href={`#fr-remedy-core-${chart.mulank}`}>Open the detailed practice</a></>}
    </section>
    <section className="fr-detail-block"><h3>A decision worth reviewing</h3><p>{decisions[relationshipReading.status]||decisions.unspecified}</p><p className="fr-note">The decision is yours to identify; this is a suggested way to review it, not a claim that a particular event has happened.</p></section>
    <section className="fr-detail-block"><h3>What is my main priority for the next 90 days?</h3><p>Use the selected starting practices as one manageable focus. Choose a real situation for each and judge progress by what becomes clearer or more dependable.</p><ol>{remedyPlan.startIds.map(id=>{const card=remedyPlan.cards.find(item=>item.id===id);return <li key={id}><a href={`#fr-remedy-${id}`}>{card.core?'Core-number practice':card.title} · {card.number}</a></li>})}</ol></section>
    <section className="fr-detail-block"><h3>How can I use my strengths in a practical way?</h3><p>{example.application}</p><a href="#fr-chapter-9">Career and work</a></section>
  </></LocalizedContent>;
}
