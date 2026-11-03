'use client';
import LocalizedContent from '../../i18n/LocalizedContent';

import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import KuaDirections from '../KuaDirections';
import Link from 'next/link';
import {ArrowUpRight, Download, Printer} from 'lucide-react';
import {createFullReport} from '../../lib/fullReport';
import {KUA, MISSING, NUMBERS, REPEATS} from '../../lib/numerology';
import {reportStyles} from '../../lib/reportStyles';
import {contact} from '../../data/contact';
import {LocaleScope, useLocale} from '../../i18n/LocaleProvider';
import {ActionPlanReading, CareerReading, GrowthReading, InsightsReading, MoneyReading, NumberReading, PeriodsReading, ReflectionReading, RelationshipReading, StrengthsReading, WellbeingReading, YearsReading} from './DetailedReportSections';
import RemedyReading from './RemedyReading';

const list = numbers => numbers.length ? numbers.join(', ') : 'None';
const date = (iso, locale) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', {day:'numeric', month:'long', year:'numeric'});
function Chapter({number, title, children}) {
  return <LocalizedContent><section className="fr-page" id={`fr-chapter-${number}`}><span className="fr-label">NumericcVaastu · {String(number).padStart(2, '0')}</span><h2>{title}</h2>{children}</section></LocalizedContent>;
}
function Facts({rows}) {return <LocalizedContent><dl className="fr-facts">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></LocalizedContent>}

function reportMarkup(report,language) {
  // Render off-document so export language never changes the visible page or its forms.
  const container=document.createElement('div');
  const root=createRoot(container);
  try {
    flushSync(()=>root.render(<LocaleScope locale={language}><ReportDocument report={report} locale={language}/></LocaleScope>));
    const article=container.querySelector('.full-report');
    if(!article)throw new Error('Report export could not be prepared.');
    return article.outerHTML;
  } finally {root.unmount()}
}

export function ReportDocument({report, locale}) {
  const {chart:c, names:n} = report;
  const m = NUMBERS[c.mulank], b = NUMBERS[c.bhagyank];
  return <LocalizedContent><article className="full-report" aria-label="Complete personal numerology report">
    <section className="fr-page fr-cover">
      <img src="/images/logo-nv.webp" alt="NumericcVaastu" width="70" height="64"/>
      <p className="fr-label">NumericcVaastu · Personal numerology report</p>
      <h2>Your numbers.<br/>Your next steps.</h2>
      <p>Prepared exclusively for</p><strong className="fr-name" translate="no">{n.name}</strong>
      <p>{date(report.dob, locale)}</p>
      <p>Report date: {date(report.generatedAt.slice(0,10), locale)}</p>
      <p className="fr-note">Test edition · Automatically generated from NumericcVaastu’s calculation rules. This report has not been personally reviewed by Adarshh Panndey.</p>
    </section>
    <Chapter number={1} title="Your personal numerology overview">
      <p>This reading brings together your birth date, name, grids, number relationships and personal cycles. Use it as a prompt for reflection and practical planning.</p>
      <Facts rows={[["Date of birth",date(report.dob,locale)],["Mulank · birth number",c.mulank],["Bhagyank · destiny number",c.bhagyank],["Full name number",`${n.total} / ${n.number}`],["First name number",`${n.first.total} / ${n.first.number}`],["Month number",c.monthNumber],["Year number",c.yearNumber],["Kua",c.kua || 'Not included']]}/>
      <h3>How to read your report</h3><p>The opening chapters introduce each number. Later chapters apply the connections to work, love and practical choices. Shared remedies are explained once, with links from the areas they support.</p>
      <details className="fr-contents"><summary>Report contents</summary><ol>{["Your personal numerology overview", "Your birth number", "Your life path and destiny number", "Your Chaldean name analysis", "Your grids, planes and patterns", "Your Vedic numerology reading", "Your key strengths", "Areas to improve", "Career and work", "Business and money", "Love, marriage and relationships", "Personal growth and wellbeing", "Your next six personal years", "Your life periods", "Colours, directions and traditional remedies", "Your top five insights", "Your 7, 30 and 90-day action plan", "Personal reflection", "Your final summary"].map((title,index)=><li key={title}><a href={`#fr-chapter-${index+1}`}>{title}</a></li>)}</ol></details>
      <p className="fr-note">Numerology is an interpretive tradition, not a scientific prediction. This report does not guarantee outcomes or replace medical, financial, legal or other professional advice.</p>
    </Chapter>
    <Chapter number={2} title="Your birth number">
      <Facts rows={[["Mulank",c.mulank],["Planet",m.planet],["Traditional day",m.day],["Theme",m.trait]]}/>
      <NumberReading number={c.mulank}/>
      <h3>Natural strengths</h3><p>{m.strengths}</p><h3>Areas to be mindful of</h3><p>{m.watch}</p>
      <h3>Reflection</h3><p>Where do these strengths already show up in your everyday life? Choose one situation where you could use them more deliberately.</p>
    </Chapter>
    <Chapter number={3} title="Your life path and destiny number">
      <Facts rows={[["Bhagyank",c.bhagyank],["Planet",b.planet],["Theme",b.trait]]}/>
      {c.mulank!==c.bhagyank?<><NumberReading number={c.bhagyank}/><h3>Potential challenges</h3><p>{b.watch}</p></>:<><p>Your destiny number repeats your birth number, already introduced in chapter 2. Here the question changes from your natural approach to whether that approach supports the commitments you want to sustain.</p><p>Use one real choice as the test: does the option only feel attractive now, or does it also fit the responsibilities you want to keep over time?</p><a href={`#fr-remedy-core-${c.mulank}`}>See the combined core-number practice</a></>}
      <h3>Putting your two core numbers together</h3><p>Your Mulank describes your natural style. Your Bhagyank supplies a second perspective on direction and growth.</p>
      <p>Number relationship: {c.pairing}</p><p>Use both descriptions to identify a strength you can practise and a reaction you want to manage more thoughtfully.</p>
    </Chapter>
    <Chapter number={4} title="Your Chaldean name analysis">
      <p>The name calculation uses English letters, ignoring spaces, hyphens and apostrophes. The total is reduced to a single digit; the unreduced compound total is shown too.</p>
      <table><thead><tr><th>Name part</th><th>Letter values</th><th>Total</th><th>Number</th></tr></thead><tbody>{n.words.map((word,i)=><tr key={i}><td translate="no">{word.word}</td><td translate="no">{word.letters.map(l=>`${l.letter}=${l.value}`).join(' + ')}</td><td>{word.total}</td><td>{word.number}</td></tr>)}</tbody></table>
      <Facts rows={[["Full name compound total",n.total],["Full name number",n.number],["Letters counted",n.letterCount],["First name number",n.first.number]]}/>
      {![c.mulank,c.bhagyank].includes(n.number)?<><p>{NUMBERS[n.number].strengths}</p><p>{NUMBERS[n.number].watch}</p></>:<p>Your name repeats a number introduced earlier. Its role here is how you express an intention; the name alignment below is read separately from the birth-date grid.</p>}
      <h3>How your name relates to your core numbers</h3>
      <table><thead><tr><th>Name layer</th><th>Number</th><th>With Mulank</th><th>With Bhagyank</th></tr></thead><tbody><tr><th scope="row">First name</th><td>{n.first.number}</td><td>{report.firstNameRelations.mulank}</td><td>{report.firstNameRelations.bhagyank}</td></tr><tr><th scope="row">Full name</th><td>{n.number}</td><td>{report.nameRelations.mulank}</td><td>{report.nameRelations.bhagyank}</td></tr></tbody></table>
      <p>Neutral alignment does not mean an unsuitable name. It describes a different number theme to understand; it is not an automatic instruction to change a spelling.</p>
      <h3>Putting your name theme into practice</h3><p>Compare what you intend with what another person actually receives from your words and actions. A name number is useful as a reflection on expression; it does not replace the need to communicate clearly.</p>
      <p>Friendly name numbers to discuss: {list(report.suggestedNames)}</p>
      {report.mobile&&<><h3>Phone number evaluation</h3><p translate="no">{report.mobile.digits}</p><p>{report.mobile.values.join(' + ')} = {report.mobile.total} → {report.mobile.number}</p><p>With Mulank: {report.mobile.mulank}</p><p>With Bhagyank: {report.mobile.bhagyank}</p><p>With name number: {report.mobile.name}</p><h4>Phone-total theme</h4><p>{NUMBERS[report.mobile.number].trait}</p><p>The phone number uses national digits only, without a country calling code. Its total is evaluated separately and does not add digits to either kundli.</p></>}
      <p className="fr-note">No automatic spelling change is prescribed. Discuss any proposed name change with a practitioner and consider its practical consequences.</p>
    </Chapter>
    <Chapter number={5} title="Your grids, planes and patterns">
      <div className="fr-grid-pair">{report.grids.map(grid=><div key={grid.name}><h3>{grid.name}</h3><div className="fr-grid">{grid.layout.map(number=><span key={number}>{grid.counts[number]?String(number).repeat(grid.counts[number]):'·'}<small>{NUMBERS[number].planet}</small></span>)}</div></div>)}</div>
      <table><thead><tr><th>Plane</th><th>Present</th><th>Reading</th></tr></thead><tbody>{c.planes.map(p=><tr key={p.key}><td>{p.name}</td><td>{p.have}/3</td><td>{p.status==='full'?p.full:p.status==='none'?p.none:'Partly active; use the missing-number practices to build balance.'}</td></tr>)}</tbody></table>
      <p>Lo Shu includes the full birth year and optional Kua. Vedic uses only the last two year digits and no Kua. Both include Bhagyank and eligible Mulank.</p>
    </Chapter>
    <Chapter number={6} title="Your Vedic numerology reading">
      <p>The Vedic kundli uses day, month and the last two year digits, plus Bhagyank and eligible Mulank. The century and Kua are excluded. Read these planetary positions separately from the Lo Shu planes.</p>
      <table><thead><tr><th>Number and planet</th><th>Count</th><th>Reading</th></tr></thead><tbody>{[3,1,9,6,7,5,2,8,4].map(number=><tr key={number}><td>{number} · {NUMBERS[number].planet}</td><td>{c.vedicCounts[number]}</td><td>{c.vedicCounts[number]?REPEATS[number][Math.min(c.vedicCounts[number],4)-1]:MISSING[number]}</td></tr>)}</tbody></table>
      <h3>Vedic plane patterns</h3><table><thead><tr><th>Plane</th><th>Present</th><th>Reading</th></tr></thead><tbody>{c.vedicPlanes.map(plane=><tr key={plane.key}><td>{plane.name}</td><td>{plane.have}/3</td><td>{plane.status==='full'?plane.full:plane.status==='none'?plane.none:'Partly active; use the missing-number practices to build balance.'}</td></tr>)}</tbody></table>
      <h3>Vedic missing numbers</h3><p>{list([1,2,3,4,5,6,7,8,9].filter(number=>!c.vedicCounts[number]))}</p>
      <p>Your name, phone total, Mulank and Bhagyank retain their separate meanings. They do not add new digits to this kundli.</p>
    </Chapter>
    <Chapter number={7} title="Your key strengths">
      <StrengthsReading report={report}/>
    </Chapter>
    <Chapter number={8} title="Areas to improve">
      <GrowthReading report={report}/>
    </Chapter>
    <Chapter number={9} title="Career and work">
      <CareerReading report={report}/>
    </Chapter>
    <Chapter number={10} title="Business and money">
      <MoneyReading report={report}/>
    </Chapter>
    <Chapter number={11} title="Love, marriage and relationships">
      <RelationshipReading report={report} locale={locale}/>
    </Chapter>
    <Chapter number={12} title="Personal growth and wellbeing">
      <WellbeingReading report={report}/>
    </Chapter>
    <Chapter number={13} title="Your next six personal years">
      <YearsReading report={report}/>
    </Chapter>
    <Chapter number={14} title="Your life periods">
      <PeriodsReading report={report}/>
    </Chapter>
    <Chapter number={15} title="Colours, directions and traditional remedies">
      <Facts rows={[["Traditional day",m.day],["Colours of friendly numbers",[...new Set(c.compat.friend.map(number=>NUMBERS[number].colour))].join(', ')],["Colours of enemy numbers",[...new Set(c.compat.enemy.map(number=>NUMBERS[number].colour))].join(', ') || 'None'],["Kua group",c.kua?KUA[c.kua].group:'Not included']]}/>
      {c.kua && <><h3>Your four Kua directions</h3><KuaDirections kua={c.kua}/></>}
      <h3>Traditional gemstone</h3><p>{report.gemstone.stone} · {report.gemstone.hindi}</p>
      <p>A gemstone is a traditional association, not a purchase recommendation. Review the full chart with a practitioner before buying or wearing one.</p>
      <RemedyReading report={report}/>
    </Chapter>
    <Chapter number={16} title="Your top five insights">
      <InsightsReading report={report}/>
    </Chapter>
    <Chapter number={17} title="Your 7, 30 and 90-day action plan">
      <ActionPlanReading report={report}/>
    </Chapter>
    <Chapter number={18} title="Personal reflection">
      <ReflectionReading report={report}/>
    </Chapter>
    <Chapter number={19} title="Your final summary">
      <Facts rows={[["Core number",c.mulank],["Bhagyank",c.bhagyank],["Name number",n.number],["Current personal year",report.years[0].number],["Chosen starting practices",report.remedyPlan.startIds.length],["Combined report","Lo Shu + Vedic"]]}/>
      <p>Choose your three most useful insights and give each a practical next step. Revisit the plan in 30 days.</p>
      <h3>Thank you</h3><p>For a personal review, contact Adarshh Panndey’s team.</p><p translate="no">{contact.email} · {contact.phone}</p>
      <h3>Calculation notes</h3><p>Based on the supplied report template, completed report and friend/enemy chart. The existing calculator’s enemy-first compatibility rule is used throughout. The sample’s combined compatibility list differs, so this test edition does not silently reproduce that list. No separate complete calculation specification was available.</p>
      <p>Western and Eastern zodiac interpretations and detailed compound-number meanings are not generated without a verified method. Love-life outlooks describe traditional themes and possible choices, not a fixed event forecast.</p>
    </Chapter>
  </article></LocalizedContent>;
}

export default function FullReportGenerator({chart, gender, readingHref}) {
  const {locale} = useLocale();
  const name=chart.nameAnalysis?.name || '';
  const phone=chart.phoneAnalysis?.digits || '';
  const [partnerDob,setPartnerDob]=useState('');
  const [relationshipStatus,setRelationshipStatus]=useState('unspecified');
  const now=new Date();
  const maxDob=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const [report,setReport]=useState(null);
  const [error,setError]=useState('');
  const [status,setStatus]=useState('');
  const [downloading,setDownloading]=useState('');
  const [downloadError,setDownloadError]=useState('');
  function generate(event) {
    event.preventDefault();setError('');setStatus('');setDownloadError('');
    try {setReport(createFullReport({dob:`${chart.year}-${String(chart.month).padStart(2,'0')}-${String(chart.day).padStart(2,'0')}`,gender,name,phone,partnerDob,relationshipStatus}));}
    catch(e){setError(e.message);setReport(null)}
  }
  async function download(language) {
    if(!report || downloading)return;
    setDownloading(language);setDownloadError('');
    setStatus(language==='hi'?'Preparing your Hindi report…':'Preparing your English report…');
    try {
      let html=reportMarkup(report,language);
      try {
        const response=await fetch('/images/logo-nv.png');
        if(response.ok){const blob=await response.blob();const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});html=html.replace('src="/images/logo-nv.png"',`src="${data}"`);}
      } catch {}
      if(!html.includes('data:image/png;base64,'))html=html.replace(/<img[^>]*src="\/images\/logo-nv\.png"[^>]*>/,'');
      const title=language==='hi'?'NumericcVaastu · व्यक्तिगत अंक ज्योतिष रिपोर्ट':'NumericcVaastu · Personal numerology report';
      const doc=`<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${reportStyles}</style></head><body>${html}</body></html>`;
      const url=URL.createObjectURL(new Blob([doc],{type:'text/html;charset=utf-8'}));
      const anchor=document.createElement('a');anchor.href=url;anchor.download=`numericcvaastu-report-${report.dob}-${language}.html`;anchor.hidden=true;document.body.append(anchor);
      try {anchor.click()} finally {anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
      setStatus(language==='hi'?'Hindi report downloaded. Open the file to read it or print / save as PDF.':'English report downloaded. Open the file to read it or print / save as PDF.');
    } catch {
      setStatus('');setDownloadError('The report could not be downloaded. Please try again.');
    } finally {setDownloading('')}
  }
  return <LocalizedContent><section className="fr-generator" id="full-report" data-report-product="combined-numerology-report" aria-labelledby="r-full">
    <style>{reportStyles}</style>
    <span className="hv-eyebrow">Combined full report · Free test edition</span>
    <h3 id="r-full">Both methods, <em>one full report.</em></h3>
    <p>Generate one report with both Lo Shu and Vedic readings, name and phone analysis, strengths, career and relationship themes, six years ahead, life periods, remedies and an action plan.</p>
    <form onSubmit={generate}>
      {name && phone ? <p>Uses the name and phone number from your calculation above.</p> : <p>Enter your name and phone number in the calculator above, then choose Show my numbers to prepare your full report.</p>}
      <label htmlFor="nv-relationship-status">Your relationship context <span>(optional)</span></label>
      <select id="nv-relationship-status" value={relationshipStatus} onChange={event=>{setRelationshipStatus(event.target.value);setReport(null);setError('')}} aria-describedby="nv-relationship-hint"><option value="unspecified">Show both possibilities</option><option value="single">Single · open to a connection</option><option value="developing">Getting to know someone</option><option value="committed">In a committed relationship</option></select>
      <small id="nv-relationship-hint">Choose the context for your love-life reading. This choice stays in the browser and is not added to the URL.</small>
      <label htmlFor="nv-partner-dob">Second person’s date of birth <span>(optional)</span></label>
      <input id="nv-partner-dob" type="date" min="1900-01-01" max={maxDob} value={partnerDob} onChange={event=>{setPartnerDob(event.target.value);setReport(null);setError('')}} aria-describedby="nv-partner-hint"/>
      <small id="nv-partner-hint">Add a partner’s date for a two-person number comparison. Leave blank for your individual relationship reading.</small>
      <button className="hv-button hv-button--gold" type="submit" disabled={!name || !phone}>Generate my full report <ArrowUpRight size={18}/></button>
      {error&&<p role="alert" className="fr-error">{error}</p>}
    </form>
    <p className="fr-status">Free while we test. No payment or account is required. Your name stays in this browser and is not added to the page URL.</p>
    {report&&<>
      <div className="fr-toolbar" aria-label="Report download options"><button className="hv-button hv-button--gold" type="button" onClick={()=>download('hi')} disabled={!!downloading}><Download size={18}/><span lang="hi" translate="no">हिंदी रिपोर्ट डाउनलोड करें</span></button><button className="hv-button" type="button" onClick={()=>download('en')} disabled={!!downloading}><Download size={18}/>Download English report</button><button className="hv-button" type="button" onClick={()=>window.print()} disabled={!!downloading}><Printer size={18}/>Print / save PDF</button></div>
      <p className="fr-status" role="status">{status||'Choose Hindi or English to download a complete HTML report. Open the downloaded file and print / save as PDF for a PDF in that language.'}</p>
      {downloadError&&<p className="fr-error" role="alert">{downloadError}</p>}
      <ReportDocument report={report} locale={locale}/>
    </>}
    <Link className="hv-link" href={readingHref}>Review your report with Adarshh <ArrowUpRight size={16}/></Link>
  </section></LocalizedContent>;
}
