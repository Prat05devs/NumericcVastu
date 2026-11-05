
import LocalizedContent from './i18n/LocalizedContent';
import Image from 'next/image';
import Link from 'next/link';
import {ArrowRight, ArrowUpRight, Baby, BookOpen, Briefcase, Building2, Check, Compass, HeartHandshake, Home, MapPin, Plus, ShoppingBag, Sparkles} from 'lucide-react';
import {SiteFooter} from './components/SiteChrome';
import HeritageBand from './components/HeritageBands';
import HeroSlideshow from './components/home/HeroSlideshow';
import WorkMarquee from './components/home/WorkMarquee';
import FeaturedChannels from './components/ChannelMarquee';
import {homeFeatured} from './data/featured';
import MediaWall from './components/home/MediaWall';
import AwardsCarousel from './components/home/AwardsCarousel';
import ReviewCards from './components/ReviewCards';
import StudentVideos from './components/StudentVideos';
import {courses, consultations, reportOffer} from './data/offers';
import VideoBackdrop from './components/VideoBackdrop';
import Price from './components/Price';
import {awards, book, heroSlides, marqueeRows, social, videos} from './data/media';
import {getInstagramData} from './lib/instagram';
import {faqs, googleReviews, posts} from './data/content';
import {faqPage} from './lib/schema';
import {jsonLdHtml} from './lib/site';
import BlogCards from './components/BlogCards';
import WhatsAppIcon from './components/WhatsAppIcon';
import FloatingNumbers from './components/FloatingNumbers';
import LiveCount from './components/LiveCount';
import {contact} from './data/contact';
import {predictions} from './data/predictions';
import {crop} from './lib/crop';
import GoogleBusinessCard from './components/GoogleBusinessCard';
import {locations} from './data/locations';
import {store} from './data/shop';

const featuredConsultations = [
  ['consult-blueprint', Sparkles], ['consult-career', Briefcase], ['consult-relationship', HeartHandshake],
  ['consult-business', Building2], ['consult-baby-name', Baby], ['consult-home-vastu', Home],
].map(([id, Icon]) => ({offer: consultations.find((item) => item.id === id), Icon})).filter(({offer}) => offer);
/** Adarshh with his own students, one photo per course. */
const courseImages = {
  'course-launchpad': '/images/students/teaching-what-is-numerology.webp',
  'course-accelerator': '/images/students/students-03.webp',
  'course-mastery': '/images/students/students-17.webp',
};

const steps = [
  ['Choose a session', 'Pick the consultation that fits your question, or send a general enquiry if you are unsure.'],
  ['Share your details', 'Your full name and date of birth. For a Vaastu session, a floor plan and the main door direction.'],
  ['Meet Adarshh', 'A one-to-one conversation about your question and the patterns in your numbers.'],
];

const formatShortDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'});

function SectionHead({eyebrow, title, accent, text, id, children, center = false}) {
  return <LocalizedContent><div className={center ? 'hv-head is-center' : 'hv-head'}>
    <div><span className="hv-eyebrow">{eyebrow}</span><h2 id={id}>{title} {accent && <em>{accent}</em>}</h2></div>
    {(text || children) && <div className="hv-head__aside">{text && <p>{text}</p>}{children}</div>}
  </div></LocalizedContent>;
}

export default async function HomePage() {
  // Follower counts refresh from Instagram every five days when the API is configured (lib/instagram.js).
  const {stats, instagramProfile} = await getInstagramData();
  return <LocalizedContent><>
    <main id="main" className="hv">
      <section className="hv-hero" aria-labelledby="hv-hero-title">
        <div className="hv-hero__copy">
          <span className="hv-eyebrow">Numerologist &amp; Vastu consultant · Rohini, Delhi</span>
          <h1 id="hv-hero-title">Know your numbers. <em>Find your way.</em></h1>
          <p className="hv-hero__lede">Personal numerology and Numeric Vaastu consultations with Delhi numerologist Adarshh Panndey, author of <cite>{book.title}</cite>. And structured courses for people who want to learn the practice themselves.</p>
          <div className="hv-actions">
            <Link className="hv-button hv-button--gold" href="/book-consultation">Book a consultation <ArrowUpRight size={18}/></Link>
            <Link className="hv-button hv-button--ghost" href="/courses">Explore courses <ArrowRight size={18}/></Link>
          </div>
        </div>
        <HeroSlideshow slides={heroSlides}/>
      </section>

      <section className="hv-stats" aria-label="NumericcVaastu in numbers">
        <div className="hv-wrap hv-stats__grid">
          {stats.map((item) => <div key={item.label}>{item.live ? <LiveCount value={item.value} {...item.live}/> : <strong data-count>{item.value}</strong>}<span>{item.label}</span></div>)}
        </div>
      </section>

      <FeaturedChannels headingId="hv-channels-title" channels={homeFeatured} rows={1}/>

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
            <div className="hv-path__image"><Image src="/images/gallery/portrait-at-work.webp" alt="" fill sizes="(max-width: 800px) 92vw, 600px" style={crop('/images/gallery/portrait-at-work.webp', 16 / 9)}/></div>
            <div className="hv-path__body"><Compass size={26}/><h3>I want personal guidance</h3><p>One-to-one readings on your name, birth date, career, relationships, business or home.</p><span className="hv-link">See consultations <ArrowRight size={17}/></span></div>
          </Link>
          <Link href="/courses" className="hv-path">
            <div className="hv-path__image"><Image src="/images/students/students-05.webp" alt="" fill sizes="(max-width: 800px) 92vw, 600px" style={crop('/images/students/students-05.webp', 16 / 9)}/></div>
            <div className="hv-path__body"><BookOpen size={26}/><h3>I want to learn numerology</h3><p>Three courses that take you from your first calculation to running your own practice.</p><span className="hv-link">See courses <ArrowRight size={17}/></span></div>
          </Link>
        </div>
      </section>

      <HeritageBand kind="floral" className="hv-band"/>

      <section className="vb vb--consult" aria-labelledby="hv-consult-title">
        <VideoBackdrop name="consult" fitHeader/>
        <div className="vb__shade" aria-hidden="true"/>
        <div className="hv-wrap vb__inner">
          <div className="vb__copy">
            <span className="hv-eyebrow">Consultations with Adarshh</span>
            <h2 id="hv-consult-title">A clear answer starts with <em>the right question.</em></h2>
            <p>Every session is with Adarshh personally, in Rohini or online.</p>
          </div>
          <div className="vb__dock">
            <ul className="vb-grid">
              {featuredConsultations.map(({offer, Icon}) => <li key={offer.id}>
                <Link className="vb-glass vb-glass--row" href={`/consultations/${offer.slug}`}>
                  <span className="vb-glass__icon"><Icon size={20}/></span>
                  <span className="vb-glass__text"><small>{offer.category}</small><b>{offer.name}</b></span>
                  <strong><Price offer={offer}/></strong>
                  <ArrowRight className="vb-glass__arrow" size={18}/>
                </Link>
              </li>)}
            </ul>
            <div className="vb__foot">
              <Link href="/consultations" className="vb-button">All {consultations.length} consultations <ArrowUpRight size={17}/></Link>
              <span>Fees are from the current price list and are confirmed when you book.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="hv-section hv-wrap hv-founder" aria-labelledby="hv-founder-title">
        <div className="hv-founder__media">
          <div className="hv-founder__photo"><Image src="/images/gallery/media-podcast-chair.webp" alt="Adarshh Panndey seated in a studio" fill sizes="(max-width: 900px) 92vw, 480px" style={crop('/images/gallery/media-podcast-chair.webp', 4 / 5)}/></div>
          <a className="hv-founder__book" href={book.amazon} target="_blank" rel="noopener noreferrer" aria-label={`Buy ${book.title} on Amazon (opens in a new tab)`}>
            <div><Image src="/images/gallery/media-magazine-book-feature.webp" alt="" fill sizes="240px"/></div>
            <span><b>{book.title}</b>{book.feature}<em>Buy on Amazon <ArrowUpRight size={14}/></em></span>
          </a>
        </div>
        <div className="hv-founder__copy">
          <span className="hv-eyebrow">Meet Adarshh Panndey</span>
          <h2 id="hv-founder-title">From a career in pharma <em>to a life in numbers.</em></h2>
          <p>Adarshh began his career in the pharmaceutical industry. His curiosity about numbers grew into a consulting practice, and then into an academy for people who want a structured way into the subject.</p>
          <p>Today he consults one-to-one, teaches three numerology programmes, speaks on stages and podcasts, and is the author of <cite>{book.title}</cite>.</p>
          <ul className="hv-checks">
            {['Personal numerology and Numeric Vaastu consultations', 'Courses from foundation to mastery', 'Talks, podcasts and published writing'].map((item) => <li key={item}><Check size={18}/>{item}</li>)}
          </ul>
          <div className="hv-actions">
            <Link className="hv-button" href="/about">Read his story <ArrowUpRight size={18}/></Link>
            <a className="hv-link" href={book.amazon} target="_blank" rel="noopener noreferrer">Buy his book on Amazon <ArrowUpRight size={16}/></a>
          </div>
        </div>
      </section>

      <MediaWall videos={videos} social={social} instagram={instagramProfile}>
        <SectionHead id="hv-watch-title" eyebrow="Watch" title="Watched" accent="millions of times." text="Adarshh’s most-watched Instagram reels, his podcast conversations and YouTube Shorts. Press play to watch them here.">
          <Link href="/podcasts" className="hv-link">All podcasts and what he shared <ArrowUpRight size={17}/></Link>
        </SectionHead>
      </MediaWall>

      <section className="hv-section hv-wrap hv-preds" aria-labelledby="hv-preds-title">
        <SectionHead id="hv-preds-title" eyebrow="Predictions on record" title="He said it first." accent="Then it happened." text="Every one was on video before the result, and each card links to the news report.">
          <Link href="/predictions" className="hv-link">See every prediction <ArrowUpRight size={17}/></Link>
        </SectionHead>
        <ul className="hv-preds__list">
          {predictions.filter((p) => p.status === 'came-true').slice(0, 4).map((p) => <li key={p.id}>
            <Link href={`/predictions#${p.id}`}>
              <span className="hv-preds__badge"><Check size={14}/> Came true · {p.area}</span>
              <strong>{p.title}</strong>
              <span className="hv-preds__when">Said {formatShortDate(p.date)} · happened {formatShortDate(p.outcome.date)}</span>
            </Link>
          </li>)}
        </ul>
      </section>

      <section className="vb vb--report" id="free-tools" aria-labelledby="hv-loshu-title">
        <VideoBackdrop name="report" fitHeader/>
        <div className="vb__shade" aria-hidden="true"/>
        <div className="hv-wrap vb__inner">
          <div className="vb__copy">
            <span className="hv-eyebrow">Worked out the way Adarshh works</span>
            <h2 id="hv-loshu-title">Your numbers, <em>read properly.</em></h2>
            <p>Start free with the Lo Shu or Vedic tool. When you want the full picture, get the complete report as a PDF.</p>
          </div>
          <div className="vb__dock vb-tools">
            <Link className="vb-glass vb-glass--tool" href="/numerology-calculator">
              <Compass size={24}/><small>Free tool</small><b>Lo Shu numerology</b>
              <span>Your 4-9-2 grid, Kua, planes and missing numbers.</span>
              <em>Open the tool <ArrowUpRight size={16}/></em>
            </Link>
            <Link className="vb-glass vb-glass--tool" href="/vedic-numerology-calculator">
              <Sparkles size={24}/><small>Free tool</small><b>Vedic numerology</b>
              <span>Your planetary 3-1-9 kundli and number meanings.</span>
              <em>Open the tool <ArrowUpRight size={16}/></em>
            </Link>
            <Link className="vb-glass vb-glass--tool vb-glass--gold" href="/numerology-calculator">
              <BookOpen size={24}/><small>Complete report · <Price offer={reportOffer}/></small><b>Your full numerology report</b>
              <span>Both methods, missing numbers with remedies and your Maha Dasha, in English or Hindi.</span>
              <em>Get my report <ArrowUpRight size={16}/></em>
            </Link>
          </div>
        </div>
      </section>

      <section className="hv-section hv-wrap" aria-labelledby="hv-courses-title">
        <SectionHead id="hv-courses-title" eyebrow="The NumericcVaastu Academy" title="Learn it properly," accent="step by step." text="Three programmes, each building on the last. Start where your knowledge is today.">
          <Link href="/courses" className="hv-link">Compare all courses <ArrowUpRight size={17}/></Link>
        </SectionHead>
        <ol className="hv-courses">
          {courses.map((offer, i) => <li key={offer.id} className="hv-course">
            <div className="hv-course__image">{(courseImages[offer.id] || offer.image) && <Image src={courseImages[offer.id] || offer.image} alt="" fill sizes="(max-width: 900px) 92vw, 400px" style={crop(courseImages[offer.id] || offer.image, 16 / 10)}/>}<span>Level {i + 1} · {offer.category}</span></div>
            <div className="hv-course__body">
              <h3>{offer.name}</h3>
              <p>{offer.summary}</p>
              <ul>{offer.inclusions.slice(0, 3).map((item) => <li key={item}><Check size={16}/>{item}</li>)}</ul>
              <div className="hv-course__foot"><strong><Price offer={offer}/></strong><Link href={`/courses/${offer.slug}`} className="hv-link">View course <ArrowRight size={16}/></Link></div>
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

      {googleReviews.length > 0 && <section className="hv-section hv-tint" aria-labelledby="hv-reviews-title">
        <div className="hv-wrap">
          <SectionHead id="hv-reviews-title" eyebrow="Client stories" title="In their" accent="own words." text="Reviews clients have left for Adarshh on Google, shown exactly as they wrote them.">
            <Link href="/testimonials" className="hv-link">More client experiences <ArrowUpRight size={17}/></Link>
          </SectionHead>
          <ReviewCards reviews={googleReviews}/>
          <GoogleBusinessCard/>
          <StudentVideos title="Students on their results after the course"/>
        </div>
      </section>}

      {posts.length > 0 && <section className="hv-section hv-wrap" aria-labelledby="hv-blog-title">
        <SectionHead id="hv-blog-title" eyebrow="The journal" title="Read, learn," accent="go deeper." text="Clear explanations of numerology, the Lo Shu grid and Numeric Vaastu, written for curious beginners.">
          <Link href="/blog" className="hv-link">All articles <ArrowUpRight size={17}/></Link>
        </SectionHead>
        <BlogCards posts={posts} carousel/>
      </section>}

      <section className="hv-section hv-cream" aria-labelledby="hv-near-title">
        <div className="hv-wrap hv-near">
          <SectionHead id="hv-near-title" eyebrow="In person and online" title="In Rohini, across Delhi NCR," accent="and online worldwide." text="Meet Adarshh at the Rohini office, book a Vastu site visit anywhere in Delhi NCR, or consult by video or phone from anywhere, in Hindi or English.">
            <a href={contact.mapUrl} className="hv-link" target="_blank" rel="noopener noreferrer">Directions to the office <ArrowUpRight size={17}/></a>
          </SectionHead>
          <ul className="hv-near__places">{locations.map((l) => <li key={l.slug}><Link href={`/${l.slug}`}><MapPin size={18} aria-hidden="true"/><span><b>{l.eyebrow}</b><small>{l.card}</small></span><ArrowUpRight size={16} aria-hidden="true"/></Link></li>)}</ul>
          <a className="hv-near__shop" href={store.url} target="_blank" rel="noopener noreferrer"><ShoppingBag size={22} aria-hidden="true"/><span><b>Rudraksha, crystals, gemstones and yantras</b><small>From Adarshh’s own store, with wristwatches made to order.</small></span><ArrowUpRight size={18} aria-hidden="true"/></a>
        </div>
      </section>

      <section className="hv-section hv-wrap hv-faq" aria-labelledby="hv-faq-title">
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(faqPage(faqs))}/>
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
        <FloatingNumbers/>
        <HeritageBand kind="small" className="hv-final__band"/>
        <div className="hv-wrap hv-final__inner">
          <Image src="/images/logo-nv.webp" alt="" width={84} height={76} className="hv-final__logo"/>
          <h2 id="hv-final-title">Your numbers have something to say. <em>Let’s listen together.</em></h2>
          <p>Book a one-to-one consultation with Adarshh, or start learning with the foundation course.</p>
          <div className="hv-actions is-center">
            <Link className="hv-button hv-button--gold" href="/book-consultation">Book a consultation <ArrowUpRight size={18}/></Link>
            {social.whatsapp
              ? <Link className="hv-button hv-button--whatsapp" href="/book-consultation"><WhatsAppIcon size={20}/> Book on WhatsApp</Link>
              : <Link className="hv-button hv-button--light" href={`/courses/${courses[0].slug}`}>Start the foundation course <ArrowRight size={18}/></Link>}
          </div>
          <p className="hv-final__contact">Or call <a href={contact.phoneHref}>{contact.phone}</a> · email <a href={`mailto:${contact.email}`}>{contact.email}</a></p>
        </div>
      </section>
    </main>
    <SiteFooter/>
  </></LocalizedContent>;
}
