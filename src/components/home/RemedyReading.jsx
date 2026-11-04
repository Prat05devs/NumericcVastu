import LocalizedContent from '../../i18n/LocalizedContent';

const kinds=[['wear','What to wear'],['place','Vastu and placement'],['worship','Prayer'],['service','Service and donation']];

/**
 * Chapter 15's remedies: where to start, and the practices for the core numbers. Each missing number's remedies
 * sit with that number in chapter 8 (GrowthReading), so nothing is listed twice.
 */
export default function RemedyReading({report}) {
  const plan=report.remedyPlan;
  const core=plan.cards.filter(card=>card.core);
  const coreTraditional=plan.cards.filter(card=>card.kind!=='behaviour'&&card.triggers.some(trigger=>trigger.role==='core'));
  return <LocalizedContent><>
    <h3>Your remedy priorities</h3>
    <p>Start with the three practices below. Add the traditional practices once these have become a habit; you do not need to perform every one.</p>
    <ol className="fr-remedy-start">{plan.startIds.map(id=>{const card=plan.cards.find(item=>item.id===id);return <li key={id}><a href={`#fr-remedy-${id}`}>{card.core?'Core-number practice':card.title} · {card.number}</a></li>})}</ol>
    {!!plan.focuses.length&&<p>The remedies for each missing number are in chapter 8, directly after that number. <a href="#fr-chapter-8">Go to chapter 8</a></p>}
    <h3>Practices for your core numbers</h3>
    {core.map(card=><section className="fr-remedy-card" id={`fr-remedy-${card.id}`} key={card.id}>
      <h4>Core-number practice · {card.number}</h4>
      <p>{card.how}</p>
      <h5>Suggested routine</h5><p>Choose one real situation this week and apply the step before making a new promise.</p>
    </section>)}
    {kinds.map(([kind,title])=>{const cards=coreTraditional.filter(card=>card.kind===kind);return cards.length?<div key={kind}><h4 className="fr-remedy-group">{title}</h4>{cards.map(card=><section className="fr-remedy-card" id={`fr-remedy-${card.id}`} key={card.id}>
      <h5>{card.title}</h5><p>{card.how}</p><p className="fr-when">When: {card.rhythm}</p>
    </section>)}</div>:null})}
    <p className="fr-note">A remedy supports an intention or habit; it does not guarantee a relationship, income or a change to the calculated grid.</p>
  </></LocalizedContent>;
}
