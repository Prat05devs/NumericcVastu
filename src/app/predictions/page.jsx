import Link from 'next/link';
import {ArrowUpRight, ShieldCheck} from 'lucide-react';
import {SiteFooter} from '../../components/SiteChrome';
import PredictionList from '../../components/PredictionList';
import {predictions, predictionStats} from '../../data/predictions';

export const metadata = {
  title: 'Predictions that came true | Numerologist Adarshh Panndey',
  description: 'Numerology predictions Adarshh Panndey made on video before they happened: the 2026 Bengal election, gold prices, IPL 2026 and more, each with the date and a news source.',
  alternates: {canonical: '/predictions'},
};

export default function Page() {
  const stats = predictionStats();
  const proven = predictions.filter((p) => p.status === 'came-true');
  return <>
    <main id="main" className="hv pr-page">
      <section className="pr-hero">
        <div className="hv-wrap">
          <span className="hv-eyebrow">Predictions on record</span>
          <h1>He said it first. <em>Then it happened.</em></h1>
          <p className="pr-hero__lede">Adarshh Panndey makes his predictions in public: on his channel, on podcasts and on Instagram. These are the ones you can check, each with the date he said it and what happened next.</p>
          <ul className="pr-hero__stats">
            <li><strong>{stats.cameTrue}</strong>came true</li>
            <li><strong>100%</strong>said on video before the result</li>
            <li><strong>{stats.awaiting}</strong>awaiting their date</li>
          </ul>
          <ul className="pr-hero__proof" aria-label="Predictions that came true">
            {proven.map((p) => <li key={p.id}><a href={`#${p.id}`}><span>{p.area}</span>{p.title}</a></li>)}
          </ul>
        </div>
      </section>
      <section className="hv-section hv-wrap" aria-labelledby="pr-all">
        <div className="hv-head"><div><span className="hv-eyebrow">The record</span><h2 id="pr-all">Every prediction, <em>with the receipts.</em></h2></div><div className="hv-head__aside"><p className="pr-rule"><ShieldCheck size={20} aria-hidden="true"/>A prediction is marked “came true” only when the video was published before the outcome, and the outcome is reported by a news source linked on the card.</p></div></div>
        <PredictionList items={predictions}/>
      </section>
      <section className="pc-invite">
        <div className="hv-wrap pc-invite__inner">
          <div><span className="hv-eyebrow">Your turn</span><h2>What do your numbers <em>say about your year?</em></h2><p>Get a personal reading from Adarshh, or try the free calculator for your Mulank, Bhagyank and Lo Shu grid.</p></div>
          <div className="hv-actions"><Link className="hv-button hv-button--gold" href="/book-consultation">Book a consultation <ArrowUpRight size={18}/></Link><Link className="hv-button hv-button--light" href="/numerology-calculator">Free calculator <ArrowUpRight size={18}/></Link></div>
        </div>
      </section>
    </main>
    <SiteFooter/>
  </>;
}
