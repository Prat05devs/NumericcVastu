import {NUMBERS, relation} from './numerology.js';
import {CORE_PRACTICES, LOVE_GRID_CONTEXT, LOVE_PROFILES, LOVE_YEAR_THEMES, NAME_LOVE_CONTEXT, PERIOD_LOVE_CONTEXT, REMEDY_FOCUS, REMEDY_PRACTICES, REMEDY_SUPPORT} from '../data/reportGuidance.js';

const unique = values => [...new Set(values)];
export const RELATIONSHIP_STATUSES = ['unspecified', 'single', 'developing', 'committed'];

/** Connections are disclosed, not scored as astrological strength or promised outcomes. */
export function createRemedyPlan(chart, names) {
  const vedicMissing = [1,2,3,4,5,6,7,8,9].filter(n=>!chart.vedicCounts[n]);
  const missing = unique([...chart.missing,...vedicMissing]).sort((a,b)=>a-b);
  const coreNumbers = unique([chart.mulank,chart.bhagyank]);
  const focuses = missing.map(number=>{
    const supportNumber=REMEDY_SUPPORT[number].candidates.find(n=>chart.counts[n]);
    return {
      number,...REMEDY_FOCUS[number],
      grids:[...(chart.missing.includes(number)?['Lo Shu']:[]),...(vedicMissing.includes(number)?['Vedic']:[])],
      nameConnection:names.number===number,
      compatibility:relation(chart.mulank,number)===relation(chart.bhagyank,number)?relation(chart.mulank,number):null,
      withBirth:relation(chart.mulank,number),withDestiny:relation(chart.bhagyank,number),
      support:supportNumber?{number:supportNumber,text:REMEDY_SUPPORT[number].text}:null,
    };
  });
  const coreCards=coreNumbers.map(number=>({id:`core-${number}`,number,kind:'behaviour',title:CORE_PRACTICES[number],how:CORE_PRACTICES[number],supports:[number],core:true}));
  const gapCards=focuses.map(focus=>({id:`gap-${focus.number}`,number:focus.number,kind:'behaviour',title:focus.title,how:focus.how,review:focus.review,supports:[focus.number],core:false}));
  const traditional=REMEDY_PRACTICES.flatMap(practice=>{
    const triggers=practice.triggers.filter(trigger=>trigger.role==='core'?coreNumbers.includes(trigger.number):missing.includes(trigger.number));
    if(!triggers.length)return [];
    const source=practice.source==='sample-core8'?(coreNumbers.includes(8)?'sample':'introductory'):practice.source;
    const requiresReview=['wear','place'].includes(practice.kind)&&triggers.some(trigger=>[relation(chart.mulank,trigger.number),relation(chart.bhagyank,trigger.number)].some(kind=>['enemy','shortTerm'].includes(kind)));
    return [{...practice,triggers,supports:unique(triggers.map(trigger=>trigger.number)),source,requiresReview}];
  });
  const firstGap=gapCards.find(card=>card.number!==6);
  const startIds=unique([coreCards[0]?.id,gapCards.find(card=>card.number===6)?.id,firstGap?.id,...gapCards.map(card=>card.id)]).filter(Boolean).slice(0,3);
  return {focuses,coreNumbers,cards:[...coreCards,...gapCards,...traditional],startIds};
}

export function createRelationshipReading({chart,names,years,status='unspecified',remedyPlan}) {
  const currentPeriod=chart.life.periods[chart.life.current];
  return {
    status:RELATIONSHIP_STATUSES.includes(status)?status:'unspecified',
    attraction:LOVE_PROFILES[chart.mulank].attraction,
    potential:LOVE_PROFILES[chart.bhagyank].potential,
    risk:LOVE_PROFILES[chart.mulank].risk,
    nextStep:LOVE_PROFILES[chart.mulank],
    sameCore:chart.mulank===chart.bhagyank,
    nameContext:NAME_LOVE_CONTEXT[names.number],
    nameRepeatsCore:[chart.mulank,chart.bhagyank].includes(names.number),
    gaps:remedyPlan.focuses.map(focus=>({number:focus.number,grids:focus.grids,text:LOVE_GRID_CONTEXT[focus.number],practiceId:`gap-${focus.number}`})),
    currentPeriod:currentPeriod?{...currentPeriod,planet:NUMBERS[currentPeriod.n].planet,text:PERIOD_LOVE_CONTEXT[currentPeriod.n]}:null,
    outlook:years.map(year=>({...year,...LOVE_YEAR_THEMES[year.number]})),
  };
}
