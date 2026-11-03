import LocalizedContent from '../../i18n/LocalizedContent';
import {NUMBERS} from '../../lib/numerology';

const sourceLabels={sample:'From the supplied report',introductory:'Introductory tradition · practitioner review',mixed:'Sample and introductory guidance'};
const kinds=[['wear','What to wear'],['place','Vastu and placement'],['worship','Prayer and reflection'],['service','Service and donation']];

/** One canonical card per action, even when several chart factors support it. */
export default function RemedyReading({report}) {
  const plan=report.remedyPlan;
  const behaviours=plan.cards.filter(card=>card.kind==='behaviour');
  return <LocalizedContent><>
    <h3>Your remedy priorities</h3>
    <p>Start with the three practices below. The optional traditional practices follow later; they are not a shopping list or a requirement to perform every ritual.</p>
    <ol className="fr-remedy-start">{plan.startIds.map(id=>{const card=plan.cards.find(item=>item.id===id);return <li key={id}><a href={`#fr-remedy-${id}`}>{card.core?'Core-number practice':card.title} · {card.number}</a></li>})}</ol>
    <h3>Why these areas receive attention</h3>
    <p>Each grid is read separately. A name number or a supportive core number can suggest a way to approach a practice; it does not insert a missing digit into either grid.</p>
    {plan.focuses.map(focus=><div className="fr-remedy-context" key={focus.number}>
      <h4>{focus.number} · {focus.title}</h4>
      <p>Missing in: {focus.grids.join(' / ')}</p>
      <p>{focus.purpose}</p>
      <dl>{report.chart.mulank===report.chart.bhagyank?<div><dt>With both core numbers</dt><dd>{focus.withBirth}</dd></div>:<><div><dt>With your birth number</dt><dd>{focus.withBirth}</dd></div><div><dt>With your destiny number</dt><dd>{focus.withDestiny}</dd></div></>}</dl>
      {focus.nameConnection&&<p>Your name already reduces to this number. That makes it a theme of expression in the name layer, while the grid practice still concerns a missing birth-date position.</p>}
      {focus.support&&<><h4>Existing support · {focus.support.number} · {NUMBERS[focus.support.number].planet}</h4><p>{focus.support.text}</p></>}
      <a href={`#fr-remedy-gap-${focus.number}`}>Go to the practical remedy</a>
    </div>)}
    {!plan.focuses.length&&<p>Neither grid has a missing digit. The plan focuses on using your core numbers in a balanced way rather than adding missing-number remedies.</p>}
    <h3>Everyday practices</h3>
    {behaviours.map(card=><section className="fr-remedy-card" id={`fr-remedy-${card.id}`} key={card.id}>
      <h4>{card.core?'Core-number practice':card.title} · {card.number}</h4>
      {card.core&&<p>{plan.coreNumbers.length===1?'Your birth and destiny numbers share this practice. It is written once for the combined theme.':'This practice concerns how a core-number theme is used, rather than treating that number as missing.'}</p>}
      <h5>How to follow it</h5><p>{card.how}</p>
      <h5>Suggested routine</h5><p>{card.core?'Choose one real situation this week and apply the step before making a new promise.':'Try this in one real situation each week, then review it after 30 days.'}</p>
      <h5>What to review</h5><p>{card.review||'Record whether the commitment was clear, realistic and kept. The result to review is your behaviour, not a promised change in fate.'}</p>
    </section>)}
    <h3>Optional traditional practices</h3>
    <p>Shared items appear once with all the numbers they support. Timing comes from the supplied material where stated; a suggested review routine is practical guidance, not an additional ritual rule.</p>
    {kinds.map(([kind,title])=>{const cards=plan.cards.filter(card=>card.kind===kind);return cards.length?<div key={kind}><h4 className="fr-remedy-group">{title}</h4>{cards.map(card=><section className="fr-remedy-card" id={`fr-remedy-${card.id}`} key={card.id}>
      <p className="fr-source-label">{sourceLabels[card.source]}</p><h4>{card.title}</h4>
      {card.requiresReview&&<p className="fr-note">This number has a challenging or short-term relationship with a core number in the reference chart. Review a worn item or placement with the practitioner before choosing it; a missing digit alone is not enough to prescribe one.</p>}
      <p>Supports: {card.supports.join(', ')}</p>
      <ul className="fr-remedy-intentions">{card.triggers.map(trigger=><li key={`${trigger.role}-${trigger.number}`}>{trigger.role==='core'?'Core-number balance':'Missing-number practice'} · {trigger.number}</li>)}</ul>
      <h5>What it supports</h5><p>{card.meaning}</p>
      <h5>How to follow it</h5><p>{card.how}</p>
      <h5>Timing and frequency</h5><p>{card.rhythm}</p>
      <h5>Linked everyday practices</h5><ul>{card.triggers.map(trigger=><li key={`${trigger.role}-${trigger.number}`}><a href={`#fr-remedy-${trigger.role==='core'?'core':'gap'}-${trigger.number}`}>{trigger.role==='core'?'Core-number practice':'Missing-number practice'} · {trigger.number}</a></li>)}</ul>
    </section>)}</div>:null})}
    <p className="fr-note">The sample supplies missing-number practices for 2, 3, 4 and 6, and a separate birth-number-8 remedy chapter. Other traditional suggestions remain marked for practitioner review. A remedy supports an intention or habit; it does not guarantee a relationship, income or a change to the calculated grid.</p>
  </></LocalizedContent>;
}
