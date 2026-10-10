import Image from 'next/image';
import Link from 'next/link';
import {ArrowRight, ArrowUpRight, Baby, BookOpen, Briefcase, Building2, Check, Compass, HeartHandshake, Home, Plus, Sparkles} from 'lucide-react';
import {SiteHeader, SiteFooter} from './components/SiteChrome';
import HeritageBand from './components/HeritageBands';
import HeroSlideshow from './components/home/HeroSlideshow';
import WorkMarquee from './components/home/WorkMarquee';
import MediaWall from './components/home/MediaWall';
import LoShuCalculator from './components/home/LoShuCalculator';
import AwardsCarousel from './components/home/AwardsCarousel';
import {courses, consultations, formatPrice} from './data/offers';
import {awards, book, heroSlides, marqueeRows, social, stats, videos} from './data/media';

const featuredConsultations = [
  ['consult-blueprint', Sparkles], ['consult-career', Briefcase], ['consult-relationship', HeartHandshake],
  ['consult-business', Building2], ['consult-baby-name', Baby], ['consult-home-vastu', Home],
].map(([id, Icon]) => ({offer: consultations.find((item) => item.id === id), Icon})).filter(({offer}) => offer);
/** Course photographs chosen for the homepage so no picture repeats between sections. */
const courseImages = {
  'course-launchpad': ['/images/gallery/talk-audience-session.webp', '55% 40%'],
  'course-accelerator': ['/images/adarshh/adarshh-pandey-certificate-event-03.webp', '50% 20%'],
  'course-mastery': ['/images/adarshh/adarshh-pandey-certificate-event-05.webp', '50% 40%'],
};
const blueprint = consultations.find((item) => item.id === 'consult-blueprint') || consultations[0];

const steps = [
  ['Choose a session', 'Pick the consultation that fits your question, or send a general enquiry if you are unsure.'],
  ['Share your details', 'Your full name and date of birth. For a Vaastu session, a floor plan and the main door direction.'],
  ['Meet Adarshh', 'A one-to-one conversation about your question and the patterns in your numbers.'],
];

const faqs = [
  ['I’m completely new to numerology. Where should I start?', 'Start with the foundation course. It introduces the core calculations before moving into chart interpretation. For a question about your own life, a personal consultation is the better first step.'],
  ['How is Numeric Vaastu different from numerology?', 'Numerology looks at the symbolic patterns in names and birth dates. Numeric Vaastu brings numbers into the study of directions and spaces. The two are offered as complementary traditional frameworks.'],
  ['What should I prepare for a consultation?', 'Your questions, your full name as you use it, and your date of birth. For a Numeric Vaastu session, a floor plan helps. The team confirms anything else when your session is arranged.'],
  ['Are consultations online or in person?', 'Both are possible. The format, duration and fee are confirmed with you before the session is booked.'],
  ['Will I receive a certificate from a course?', 'Each course has a certification pathway. Ask for the current assessment requirements and issuing details before enrolling.'],
  ['Does a consultation guarantee an outcome?', 'No. Numerology and Numeric Vaastu are traditional interpretive practices, not scientifically established prediction methods. A consultation offers a perspective for reflection and does not replace medical, legal or financial advice.'],
];

function SectionHead({eyebrow, title, accent, text, id, children, center = false}) {
  return <div className={center ? 'hv-head is-center' : 'hv-head'}>
    <div><span className="hv-eyebrow">{eyebrow}</span><h2 id={id}>{title} {accent && <em>{accent}</em>}</h2></div>
    {(text || children) && <div className="hv-head__aside">{text && <p>{text}</p>}{children}</div>}
  </div>;
}

export default function HomePage() {
  return <>
    <SiteHeader/>
    <main id="main" className="hv">
      <section className="hv-hero" aria-labelledby="hv-hero-title">
        <div className="hv-hero__copy">
          <span className="hv-eyebrow">Numerology · Numeric Vaastu · Learning</span>
          <h1 id="hv-hero-title">Know your numbers. <em>Find your way.</em></h1>
          <p className="hv-hero__lede">Personal numerology and Numeric Vaastu consultations with Adarshh Pandey, author of <cite>{book.title}</cite>. And structured courses for people who want to learn the practice themselves.</p>
          <div className="hv-actions">
            <Link className="hv-button hv-button--gold" href="/book-consultation">Book a consultation <ArrowUpRight size={18}/></Link>
            <Link className="hv-button hv-button--ghost" href="/courses">Explore courses <ArrowRight size={18}/></Link>
          </div>
        </div>
        <HeroSlideshow slides={heroSlides}/>
      </section>

      <section className="hv-stats" aria-label="NumericcVaastu in numbers">
        <div className="hv-wrap hv-stats__grid">
          {stats.map((item) => <div key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>)}
        </div>
      </section>

      <section className="hv-section hv-work" aria-labelledby="hv-work-title">
        <div className="hv-wrap">
          <SectionHead id="hv-work-title" eyebrow="The work, in pictures" title="On stage, on air," accent="on record." text="Awards, live talks, studio interviews and podcasts from Adarshh’s work bringing numerology to wider audiences.">
            <Link href="/gallery" className="hv-link">See the full gallery <ArrowUpRight size={17}/></Link>
          </SectionHead>
        </div>
        <WorkMarquee rows={marqueeRows}/>
      </section>

      <section className="hv-section hv-wrap" aria-labelledby="hv-paths-title">
        <SectionHead id="hv-paths-title" eyebrow="Two ways to begin" title="Where would you" accent="like to start?" center/>
        <div className="hv-paths">
          <Link href="/consultations" className="hv-path">
            <div className="hv-path__image"><Image src="/images/gallery/portrait-at-work.webp" alt="" fill sizes="(max-width: 800px) 92vw, 600px" style={{objectPosition: '50% 18%'}}/></div>
            <div className="hv-path__body"><Compass size={26}/><h3>I want personal guidance</h3><p>One-to-one readings on your name, birth date, career, relationships, business or home.</p><span className="hv-link">See consultations <ArrowRight size={17}/></span></div>
          </Link>
          <Link href="/courses" className="hv-path">
            <div className="hv-path__image"><Image src="/images/gallery/talk-mahakumbh-stage.webp" alt="" fill sizes="(max-width: 800px) 92vw, 600px" style={{objectPosition: '50% 45%'}}/></div>
            <div className="hv-path__body"><BookOpen size={26}/><h3>I want to learn numerology</h3><p>Three courses that take you from your first calculation to running your own practice.</p><span className="hv-link">See courses <ArrowRight size={17}/></span></div>
          </Link>
        </div>
      </section>

      <HeritageBand kind="floral" className="hv-band"/>

      <section className="hv-section hv-tint" aria-labelledby="hv-consult-title">
        <div className="hv-wrap">
          <SectionHead id="hv-consult-title" eyebrow="Consultations" title="A clear answer starts with" accent="the right question." text="Every session is with Adarshh personally. Fees shown are from the current price list and are confirmed when you book.">
            <Link href="/consultations" className="hv-link">All {consultations.length} consultations <ArrowUpRight size={17}/></Link>
          </SectionHead>
          <div className="hv-services">
            {featuredConsultations.map(({offer, Icon}) => <article key={offer.id} className="hv-service">
              <span className="hv-service__icon"><Icon size={24}/></span>
              <small>{offer.category}</small>
              <h3>{offer.name}</h3>
              <p>{offer.summary}</p>
              <div className="hv-service__foot">
                <strong>{formatPrice(offer)}</strong>
                <Link href={`/consultations/${offer.slug}`} aria-label={`View ${offer.name}`}>View session <ArrowRight size={16}/></Link>
              </div>
            </article>)}
          </div>
        </div>
      </section>

      <section className="hv-section hv-wrap hv-founder" aria-labelledby="hv-founder-title">
        <div className="hv-founder__media">
          <div className="hv-founder__photo"><Image src="/images/gallery/media-podcast-chair.webp" alt="Adarshh Pandey seated in a studio" fill sizes="(max-width: 900px) 92vw, 480px"/></div>
          <figure className="hv-founder__book">
            <div><Image src="/images/gallery/media-magazine-book-feature.webp" alt={`Magazine feature on ${book.title}`} fill sizes="200px" style={{objectPosition: '100% 72%'}}/></div>
            <figcaption><b>{book.title}</b>{book.feature}</figcaption>
          </figure>
        </div>
        <div className="hv-founder__copy">
          <span className="hv-eyebrow">Meet Adarshh Pandey</span>
          <h2 id="hv-founder-title">From a career in pharma <em>to a life in numbers.</em></h2>
          <p>Adarshh began his career in the pharmaceutical industry. His curiosity about numbers grew into a consulting practice, and then into an academy for people who want a structured way into the subject.</p>
          <p>Today he consults one-to-one, teaches three numerology programmes, speaks on stages and podcasts, and is the author of <cite>{book.title}</cite>.</p>
          <ul className="hv-checks">
            {['Personal numerology and Numeric Vaastu consultations', 'Courses from foundation to mastery', 'Talks, podcasts and published writing'].map((item) => <li key={item}><Check size={18}/>{item}</li>)}
          </ul>
          <Link className="hv-button" href="/about">Read his story <ArrowUpRight size={18}/></Link>
        </div>
      </section>

      <MediaWall videos={videos} social={social}>
        <SectionHead id="hv-watch-title" eyebrow="Watch" title="Podcasts, shorts" accent="and reels." text="Conversations and short lessons from Adarshh’s podcasts, YouTube and Instagram. Press play to watch here."/>
      </MediaWall>

      <section className="hv-section hv-cream" aria-labelledby="hv-loshu-title">
        <div className="hv-wrap">
          <SectionHead id="hv-loshu-title" eyebrow="Free tool" title="Find your numbers" accent="in ten seconds." text="Enter your date of birth to see your driver and conductor numbers and your Lo Shu grid, the three-by-three square every row of which adds up to 15."/>
          <LoShuCalculator readingHref={`/consultations/${blueprint.slug}`}/>
        </div>
      </section>

      <section className="hv-section hv-wrap" aria-labelledby="hv-courses-title">
        <SectionHead id="hv-courses-title" eyebrow="The NumericcVaastu Academy" title="Learn it properly," accent="step by step." text="Three programmes, each building on the last. Start where your knowledge is today.">
          <Link href="/courses" className="hv-link">Compare all courses <ArrowUpRight size={17}/></Link>
        </SectionHead>
        <ol className="hv-courses">
          {courses.map((offer, i) => <li key={offer.id} className="hv-course">
            <div className="hv-course__image">{(courseImages[offer.id]?.[0] || offer.image) && <Image src={courseImages[offer.id]?.[0] || offer.image} alt="" fill sizes="(max-width: 900px) 92vw, 400px" style={{objectPosition: courseImages[offer.id]?.[1]}}/>}<span>Level {i + 1} · {offer.category}</span></div>
            <div className="hv-course__body">
              <h3>{offer.name}</h3>
              <p>{offer.summary}</p>
              <ul>{offer.inclusions.slice(0, 3).map((item) => <li key={item}><Check size={16}/>{item}</li>)}</ul>
              <div className="hv-course__foot"><strong>{formatPrice(offer)}</strong><Link href={`/courses/${offer.slug}`} className="hv-link">View course <ArrowRight size={16}/></Link></div>
            </div>
          </li>)}
        </ol>
      </section>

      <section className="hv-section hv-tint" aria-labelledby="hv-awards-title">
        <div className="hv-wrap">
          <SectionHead id="hv-awards-title" eyebrow="Recognition" title="Honoured on" accent="many stages." text="Awards and felicitations for Adarshh’s work in numerology and education."/>
          <AwardsCarousel items={awards}/>
        </div>
      </section>

      <section className="hv-section hv-wrap" aria-labelledby="hv-steps-title">
        <SectionHead id="hv-steps-title" eyebrow="How a consultation works" title="Three simple steps." accent="No surprises." center/>
        <ol className="hv-steps">
          {steps.map(([title, text], i) => <li key={title}><span className="hv-steps__n">{i + 1}</span><h3>{title}</h3><p>{text}</p></li>)}
        </ol>
        <div className="hv-actions is-center"><Link className="hv-button hv-button--gold" href="/book-consultation">Book a consultation <ArrowUpRight size={18}/></Link></div>
      </section>

      <section className="hv-section hv-wrap hv-faq" aria-labelledby="hv-faq-title">
        <div>
          <span className="hv-eyebrow">Questions</span>
          <h2 id="hv-faq-title">Before you <em>begin.</em></h2>
          <p>Something else on your mind? The team is happy to help.</p>
          <Link href="/faq" className="hv-link">All questions <ArrowUpRight size={17}/></Link>
        </div>
        <div className="hv-faq__list">
          {faqs.map(([q, a], i) => <details key={q} open={i === 0}><summary>{q}<Plus size={20} aria-hidden="true"/></summary><p>{a}</p></details>)}
        </div>
      </section>

      <section className="hv-final" aria-labelledby="hv-final-title">
        <HeritageBand kind="small" className="hv-final__band"/>
        <div className="hv-wrap hv-final__inner">
          <Image src="/images/logo-nv.png" alt="" width={84} height={76} className="hv-final__logo"/>
          <h2 id="hv-final-title">Your numbers have something to say. <em>Let’s listen together.</em></h2>
          <p>Book a one-to-one consultation with Adarshh, or start learning with the foundation course.</p>
          <div className="hv-actions is-center">
            <Link className="hv-button hv-button--gold" href="/book-consultation">Book a consultation <ArrowUpRight size={18}/></Link>
            {social.whatsapp
              ? <a className="hv-button hv-button--light" href={social.whatsapp} target="_blank" rel="noopener noreferrer">Message on WhatsApp <ArrowUpRight size={18}/></a>
              : <Link className="hv-button hv-button--light" href={`/courses/${courses[0].slug}`}>Start the foundation course <ArrowRight size={18}/></Link>}
          </div>
        </div>
      </section>
    </main>
    <SiteFooter/>
  </>;
}
