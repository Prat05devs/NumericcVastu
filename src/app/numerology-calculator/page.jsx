import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';
import {SiteFooter} from '../../components/SiteChrome';
import LoShuCalculator from '../../components/home/LoShuCalculator';

export const metadata = {
  title: 'Free Lo Shu Grid & Numerology Calculator | NumericcVaastu',
  description: 'Your free Lo Shu report: Mulank, Bhagyank, Kua, Lo Shu and Vedic grids, friend and enemy numbers, lucky colours, remedies, your gemstone and your current life period.',
  alternates: {canonical: '/numerology-calculator'},
};

export default function Page() {
  return <>
    <main id="main" className="hv nv-calc-page">
      <section className="hv-section hv-cream">
        <div className="hv-wrap">
          <div className="hv-head">
            <div><span className="hv-eyebrow">Free numerology report</span><h1 className="nv-calc-title">Your Lo Shu grid, <em>read for free.</em></h1></div>
            <div className="hv-head__aside"><p>Enter your date of birth for your Mulank, Bhagyank and Kua, the planes and yogs in your grid, your friend and enemy numbers, lucky colours, first remedies, your gemstone and the life period you are in now.</p></div>
          </div>
          <LoShuCalculator full readingHref="/consultations/personal-numerology-blueprint"/>
        </div>
      </section>
      <section className="hv-section hv-wrap nv-calc-method" aria-labelledby="method">
        <span className="hv-eyebrow">How this is calculated</span>
        <h2 id="method">The method, <em>step by step.</em></h2>
        <ol>
          <li><b>Mulank (driver number).</b> Add the digits of your birth day until one digit remains. Born on the 23rd: 2 + 3 = 5.</li>
          <li><b>Bhagyank (destiny number).</b> Add every digit of the full date. 23-05-1990: 2+3+0+5+1+9+9+0 = 29 → 2+9 = 11 → 1+1 = 2.</li>
          <li><b>The grid.</b> Every non-zero digit of the date goes into its fixed place in the 4-9-2 / 3-5-7 / 8-1-6 square, followed by the Bhagyank. The Mulank is added too when the birth day has two digits (11 to 31, except 20 and 30), because otherwise it is already in the date.</li>
          <li><b>Kua (optional).</b> Add the last two digits of the birth year and reduce. Born before 2000: men take 10 minus that number, women add 5. Born in 2000 or later: men take 9 minus it, women add 6. A result of 5 becomes 2 for men and 8 for women.</li>
          <li><b>Planes and yogs.</b> Each row, column and diagonal is read as a plane. When all three numbers of a plane are present it is active; 4-5-6 is the Golden (Raj) Yog and 2-5-8 the Silver (Rajat) Yog.</li>
          <li><b>Personal year.</b> Your birth day + birth month + the year in question, reduced to one digit.</li>
        </ol>
        <p className="nv-calc-note">Numerology is a traditional interpretive practice. Different schools read some numbers differently, and this report gives the widely used Indian conventions. It is a starting point for reflection, not a prediction or a substitute for professional advice. For a reading that considers your name, mobile number and full chart, <Link href="/consultations/personal-numerology-blueprint">book a personal session with Adarshh <ArrowUpRight size={15}/></Link>.</p>
      </section>
    </main>
    <SiteFooter/>
  </>;
}
