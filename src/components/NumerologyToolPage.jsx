import Price from './Price';
import {reportOffer} from '../data/offers';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import LocalizedContent from '../i18n/LocalizedContent';
import Breadcrumbs from './Breadcrumbs';
import {SiteFooter} from './SiteChrome';
import LoShuCalculator from './home/LoShuCalculator';

/** Separate free journeys share only their input/calculation engine and combined report. */
export default function NumerologyToolPage({system}) {
  const vedic=system==='vedic';
  return <LocalizedContent><>
    <main id="main" className="hv nv-calc-page">
      <section className="hv-section hv-cream"><div className="hv-wrap">
        <Breadcrumbs className="breadcrumbs hv-crumbs" items={[[vedic?"Free Vedic numerology calculator":"Free Lo Shu grid calculator",vedic?"/vedic-numerology-calculator":"/numerology-calculator"]]}/>
        <nav className="nv-tool-nav" aria-label="Choose a free tool">
          <Link href="/numerology-calculator" aria-current={!vedic?'page':undefined}>Free Lo Shu tool</Link>
          <Link href="/vedic-numerology-calculator" aria-current={vedic?'page':undefined}>Free Vedic tool</Link>
        </nav>
        <div className="hv-head">
          <div><span className="hv-eyebrow">{vedic?'Free Vedic numerology tool':'Free Lo Shu numerology tool'}</span><h1 className="nv-calc-title">{vedic?'Your Vedic kundli,':'Your Lo Shu grid,'} <em>read for free.</em></h1></div>
          <div className="hv-head__aside"><p>{vedic?'Enter your name, phone number and birth date for your Vedic numerology kundli, planetary number readings, name analysis and phone compatibility.':'Enter your name, phone number, birth date and optional Kua gender for your Lo Shu kundli, planes, yogs, name analysis and phone compatibility.'}</p></div>
        </div>
        <p className="nv-tool-report-note" id="report-options">Both free tools lead to one complete PDF report with Lo Shu and Vedic readings, remedies and your Maha Dasha, for <Price offer={reportOffer}/>.</p>
        <LoShuCalculator key={system} system={system} full readingHref="/consultations/personal-numerology-blueprint"/>
      </div></section>
      <section className="hv-section hv-wrap nv-calc-method" aria-labelledby="method">
        <span className="hv-eyebrow">How this is calculated</span>
        <h2 id="method">The method, <em>step by step.</em></h2>
        <ol>
          <li><b>Mulank (driver number).</b> Add the digits of your birth day until one digit remains. Born on the 23rd: 2 + 3 = 5.</li>
          <li><b>Bhagyank (destiny number).</b> Add every digit of the full date. 23-05-1990: 2+3+0+5+1+9+9+0 = 29 → 2+9 = 11 → 1+1 = 2.</li>
          {vedic?<li><b>Vedic numerology kundli.</b> Use day, month and the last two year digits, plus Bhagyank and eligible Mulank, in planetary order: 3-1-9 / 6-7-5 / 2-8-4. Exclude the century and Kua. This is a numerology chart, not an astronomical birth chart.</li>:<>
            <li><b>The grid.</b> Every non-zero digit of the date goes into its fixed place in the 4-9-2 / 3-5-7 / 8-1-6 square, followed by the Bhagyank. The Mulank is added too when the birth day has two digits (11 to 31, except 20 and 30), because otherwise it is already in the date.</li>
            <li><b>Kua (optional).</b> Add the last two digits of the birth year and reduce. Born before 2000: men take 10 minus that number, women add 5. Born in 2000 or later: men take 9 minus it, women add 6. A result of 5 becomes 2 for men and 8 for women.</li>
            <li><b>Planes and yogs.</b> Each row, column and diagonal is read as a plane. When all three numbers of a plane are present it is active; 4-5-6 is the Golden (Raj) Yog and 2-5-8 the Silver (Rajat) Yog.</li>
          </>}
          <li><b>Name and phone.</b> Chaldean letters determine your name number. Your national phone digits are totalled and compared with your Mulank and Bhagyank using the friend/enemy reference chart. These numbers are not added to the grid.</li>
          <li><b>Personal year.</b> Your birth day + birth month + the year in question, reduced to one digit.</li>
        </ol>
        {vedic && <p className="nv-calc-note">Vedic grid reference: <a href="https://www.adityavastu.co.in/tools/vedic-numerology-calculator" target="_blank" rel="noopener noreferrer">Published Vedic calculator method</a>. This provisional convention uses the short birth year; Adarshh can review the method.</p>}
        <p className="nv-calc-note">These are traditional interpretive practices for reflection. For a personal review, <Link href="/consultations/personal-numerology-blueprint">book a personal session with Adarshh <ArrowUpRight size={15}/></Link>.</p>
      </section>
    </main><SiteFooter/>
  </></LocalizedContent>;
}
