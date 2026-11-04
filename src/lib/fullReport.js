import {GRID, MISSING, NUMBERS, PERIOD_THEME, PERSONAL_YEAR, personalYear, readChart, relation, pairing} from './numerology.js';
import {GEMSTONES, MISSING_REMEDIES} from '../data/remedies.js';

import {nameNumbers, phoneNumbers} from './profileNumbers.js';
import {REPORT_PROFILES, MISSING_PRACTICES} from '../data/reportProfiles.js';
import {createRemedyPlan, createRelationshipReading} from './reportInterpretation.js';
import {CORE_PRACTICES, LOVE_YEAR_THEMES} from '../data/reportGuidance.js';

export const WORK_THEMES = {
  1: ['Leadership, independent projects and ownership.', 'Choose work with clear responsibility and room to make decisions.'],
  2: ['Partnership, client care and creative collaboration.', 'Choose a supportive team with clear communication and time to reflect.'],
  3: ['Teaching, advising, writing and structured learning.', 'Look for a role where you can explain ideas and keep developing your knowledge.'],
  4: ['Research, systems, technology and unconventional problem solving.', 'Use written plans and realistic milestones to support inventive thinking.'],
  5: ['Communication, commerce, sales and adaptable work.', 'A varied role can suit you; use a short priority list to finish what you begin.'],
  6: ['Design, hospitality, education and service.', 'Look for a setting where care, quality and collaboration are valued.'],
  7: ['Research, analysis, specialist study and reflection.', 'Protect uninterrupted time for deep work and explain your findings clearly.'],
  8: ['Operations, administration, finance and long-term projects.', 'Choose work with clear standards, steady responsibility and measurable progress.'],
  9: ['Action, advocacy, community work and practical leadership.', 'Use your energy on a clear purpose and allow time before major decisions.'],
};

/** Only placements actually present in the supplied sample. Other numbers use the existing introductory remedies. */
export const SOURCE_REMEDIES = {
  2: ['Respect your mother and express gratitude.', 'Offer water to the Shivling on Mondays and chant Om Namah Shivaya.'],
  3: ['Keep healthy plants or other natural wood around you.', 'Respect teachers and elders; Thursday is traditionally associated with Brihaspati.'],
  4: ['Keep healthy plants or other natural wood around you.', 'The sample suggests a Himalayan salt lamp in the south-east; follow electrical and fire precautions.', 'Feed birds or dogs and offer prayers to Maa Durga.'],
  6: ['The sample suggests a Surya Pyra yantra in the north or east and wind chimes in the north-west.', 'Respect women and your partner; feed cows and calves where appropriate.'],
};

/** Deterministic report model shared by the preview and downloadable document. Personal data stays in memory. */
export function createFullReport({dob, gender = '', name, phone, partnerDob = '', relationshipStatus = 'unspecified', today = new Date()}) {
  const chart = readChart(dob, gender, today);
  const names = nameNumbers(name);
  const mobile = phone ? phoneNumbers(phone, chart.mulank, chart.bhagyank, names.number) : null;
  const core = NUMBERS[chart.mulank], destiny = NUMBERS[chart.bhagyank];
  const birthProfile = REPORT_PROFILES[chart.mulank];
  const destinyProfile = REPORT_PROFILES[chart.bhagyank];
  const nameProfile = REPORT_PROFILES[names.number];
  const years = Array.from({length: 6}, (_, i) => ({year: today.getFullYear() + i, number: personalYear(chart.day, chart.month, today.getFullYear() + i)}));
  const remedyPlan=createRemedyPlan(chart,names);
  const relationshipReading=createRelationshipReading({chart,names,years,status:relationshipStatus,remedyPlan});
  const growthAreas = [
    ...chart.missing.map(n=>({number:n,missing:true,pattern:MISSING[n],practice:MISSING_PRACTICES[n]})),
    {number:chart.mulank,missing:false,pattern:core.watch,practice:birthProfile.habits[0]},
    {number:names.number,missing:false,pattern:NUMBERS[names.number].watch,practice:nameProfile.habits[1]},
    {number:chart.bhagyank,missing:false,pattern:destiny.watch,practice:destinyProfile.habits[2]},
  ].slice(0,3);
  const personalPractice = growthAreas[0].practice;
  const yearGuidance = years.map(y=>{
    const profile=REPORT_PROFILES[y.number];
    const yearlyPractice=remedyPlan.focuses[(y.year-today.getFullYear())%Math.max(remedyPlan.focuses.length,1)];
    return {...y,points:[
      {label:'Main focus',text:PERSONAL_YEAR[y.number]},
      {label:'First priority',text:profile.habits[0]},
      {label:'Work & skills',text:WORK_THEMES[y.number][1]},
      {label:'Learning',text:profile.habits[1]},
      {label:'Money review',text:profile.money[0]},
      {label:'Relationships',text:LOVE_YEAR_THEMES[y.number].heading},
      {label:'Wellbeing routine',text:profile.wellbeing[0]},
      {label:'Watch for',text:NUMBERS[y.number].watch},
      {label:'Your personal practice',text:yearlyPractice?.review || CORE_PRACTICES[chart.mulank]},
      {label:'Review checkpoint',text:profile.habits[2]},
    ]};
  });
  const financeReviewYear=Array.from({length:9},(_,i)=>today.getFullYear()+i).find(year=>personalYear(chart.day,chart.month,year)===8);
  const partnerChart=partnerDob?readChart(partnerDob,'',today):null;
  const partner=partnerChart?{
    dob:partnerDob,chart:partnerChart,
    birthPairing:pairing(chart.mulank,partnerChart.mulank),
    destinyPairing:pairing(chart.bhagyank,partnerChart.bhagyank),
    sharedFriendly:chart.compat.friend.filter(n=>partnerChart.compat.friend.includes(n)),
  }:null;
  const sharedGap=remedyPlan.focuses.find(focus=>focus.grids.length===2)||remedyPlan.focuses[0];
  const activePeriod=chart.life.periods[chart.life.current];
  const insightRows=[
    {label:'Core-number connection',number:chart.mulank,text:chart.mulank===chart.bhagyank?'Birth and destiny share one theme. Use one integrated practice rather than treating the repetition as two different discoveries.':'Your birth and destiny numbers contribute different perspectives. Apply both to a real commitment instead of choosing only the description you prefer.',target:`fr-remedy-core-${chart.mulank}`},
    {label:'Name alignment',number:names.number,text:chart.mulank===chart.bhagyank?`With both core numbers: ${relation(chart.mulank,names.number)}.`:`With birth number: ${relation(chart.mulank,names.number)}. With destiny number: ${relation(chart.bhagyank,names.number)}.`,target:'fr-chapter-4'},
    {label:'Your practical priority',number:sharedGap?.number || chart.mulank,text:sharedGap?.title || CORE_PRACTICES[chart.mulank],target:sharedGap?`fr-remedy-gap-${sharedGap.number}`:`fr-remedy-core-${chart.mulank}`},
    {label:'Love-life theme now',number:years[0].number,text:LOVE_YEAR_THEMES[years[0].number].heading,target:'fr-chapter-11'},
    {label:'Current Maha Dasha',number:activePeriod?.n || chart.mulank,text:activePeriod?`${NUMBERS[activePeriod.n].planet} · ${activePeriod.from}–${activePeriod.to}`:PERIOD_THEME[chart.mulank],target:'fr-chapter-14'},
  ];
  const uniqueThree=values=>[...new Set(values)].slice(0,3);
  const actionPlan={
    week:uniqueThree([birthProfile.habits[0],birthProfile.relationship.ritual,personalPractice,...nameProfile.habits]),
    month:uniqueThree([birthProfile.habits[1],nameProfile.habits[1],birthProfile.money[0],...destinyProfile.habits]),
    quarter:uniqueThree([birthProfile.habits[2],nameProfile.habits[2],destinyProfile.money[1],...birthProfile.habits]),
  };
  return {version:'test-3-contextual',dob,gender,generatedAt:today.toISOString(),chart,names,mobile,years,partner,remedyPlan,relationshipReading,
    profiles:{birth:birthProfile,destiny:destinyProfile,name:nameProfile},
    growthAreas,yearGuidance,financeReviewYear,insightRows,actionPlan,
    takeaways:[birthProfile.habits[0],birthProfile.relationship.repair,personalPractice],
    priorities:growthAreas.map(area=>area.pattern),
    insights:insightRows.map(row=>row.text),
    nameRelations:{mulank:relation(chart.mulank,names.number),bhagyank:relation(chart.bhagyank,names.number)},
    firstNameRelations:{mulank:relation(chart.mulank,names.first.number),bhagyank:relation(chart.bhagyank,names.first.number)},
    suggestedNames:chart.compat.friend,
    work:{birth:WORK_THEMES[chart.mulank],destiny:WORK_THEMES[chart.bhagyank],name:WORK_THEMES[names.number]},
    careerThemes:[...new Set([...birthProfile.careers,...destinyProfile.careers,...nameProfile.careers])],
    moneyThemes:[...new Set([...birthProfile.money,...destinyProfile.money,...nameProfile.money])],
    wellbeing:[...new Set([...birthProfile.wellbeing,...destinyProfile.wellbeing,...nameProfile.wellbeing])],
    coreRemedies:MISSING_REMEDIES[chart.mulank],
    remedies:chart.missing.map(n=>({n,introductory:MISSING_REMEDIES[n],sourced:SOURCE_REMEDIES[n]||[],practice:MISSING_PRACTICES[n]})),
    gemstone:GEMSTONES[chart.mulank],
    periods:chart.life.periods.map((period,i)=>({...period,current:i===chart.life.current,theme:PERIOD_THEME[period.n],
      work:WORK_THEMES[period.n][1],relationship:REPORT_PROFILES[period.n].relationship.needs,
      focus:REPORT_PROFILES[period.n].habits[0],practice:REPORT_PROFILES[period.n].habits[1],watch:NUMBERS[period.n].watch,
    })),
    grids:[{name:'Lo Shu grid',layout:GRID,counts:chart.counts},{name:'Vedic grid',layout:[3,1,9,6,7,5,2,8,4],counts:chart.vedicCounts}],
    yearThemes:years.map(y=>PERSONAL_YEAR[y.number]),
  };
}
