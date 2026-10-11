import Link from 'next/link';
import Image from 'next/image';
import {ArrowUpRight,Check,Award,Layers,UserRound,Info} from 'lucide-react';
import {SiteFooter} from './SiteChrome';
import CourseCurriculum from './CourseCurriculum';
import {courses,formatPrice,getActivePromotion,offerCatalog} from '../data/offers';
import {getCourseDetail} from '../data/courseDetails';
const origin=process.env.NEXT_PUBLIC_SITE_URL||'https://numericcvaastu.com';
const factLabels=[['format','Format'],['duration','Duration'],['language','Language'],['nextCohort','Next batch'],['access','Access']];
const jsonLd=(object)=><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(object).replace(/</g,'\\u003c')}}/>;
function PurchaseCard({offer,detail,enquire}){
 const promo=getActivePromotion(offer.id);const facts=factLabels.filter(([key])=>detail.facts[key]);
 return <aside className="course-card" aria-label={`${offer.name} enrolment summary`}><div className="course-card-visual"><Image src={offer.image||'/images/adarshh/adarshh-pandey-portrait.webp'} fill priority sizes="(max-width:900px) 90vw, 360px" alt="Adarshh Pandey, course instructor"/></div><div className="course-card-body"><div className="course-card-price"><strong>{formatPrice(offer)}</strong><span>{promo?promo.label:'Listed fee · INR'}</span></div>{!offer.priceVerified&&<p className="course-card-note"><Info size={14} aria-hidden="true"/>{offerCatalog.priceNote}</p>}<Link className="button" href={enquire}>{detail.ctaLabel} <ArrowUpRight size={18}/></Link><Link className="course-card-secondary" href="#compare">Compare all three paths</Link><h2>This course includes</h2><ul>{offer.inclusions.map(text=><li key={text}><Check size={16} aria-hidden="true"/>{text}</li>)}</ul>{facts.length>0&&<dl>{facts.map(([key,label])=><div key={key}><dt>{label}</dt><dd>{detail.facts[key]}</dd></div>)}</dl>}<p className="course-card-foot">No payment is taken on this website. An enquiry does not reserve a place.</p></div></aside>;
}
export default function CourseDetail({offer}){
 const detail=getCourseDetail(offer.id);const enquire=`/book-consultation?offer=${offer.id}`;const url=`${origin}/courses/${offer.slug}`;
 return <><main id="main" className="course-main"><div className="course-layout wrap">
  <header className="course-hero">
   <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/ <Link href="/courses">Courses</Link></span><span>/ <span aria-current="page">{offer.name}</span></span></nav>
   <span className="eyebrow">{offer.category.toUpperCase()} · {detail.path.toUpperCase()}</span>
   <h1>{offer.name}</h1>
   <p className="course-headline">{detail.headline}</p>
   <ul className="course-meta"><li><Layers size={15} aria-hidden="true"/>Level: {detail.level}</li><li><Award size={15} aria-hidden="true"/>{offer.inclusions.find(text=>/certification/i.test(text))||'Certification details on request'}</li><li><UserRound size={15} aria-hidden="true"/>For {offer.audience.toLowerCase()}</li></ul>
   <div className="course-byline"><Image src="/images/adarshh/adarshh-pandey-portrait.webp" width={36} height={36} alt=""/><span>Created by <Link href="/about">Adarshh Pandey</Link></span></div>
  </header>
  <PurchaseCard offer={offer} detail={detail} enquire={enquire}/>
  <div className="course-content">
   <section className="course-learn" aria-labelledby="learn-heading"><h2 id="learn-heading">What you’ll learn</h2><ul>{detail.learn.map(text=><li key={text}><Check size={17} aria-hidden="true"/>{text}</li>)}</ul></section>
   <section className="course-section" aria-labelledby="content-heading"><h2 id="content-heading">Course content</h2>{!detail.syllabusConfirmed&&<p className="course-pending">This outline groups the components listed for the course. A lesson-by-lesson syllabus is being finalised. Ask the team for the current version.</p>}<CourseCurriculum modules={detail.modules}/></section>
   <section className="course-section" aria-labelledby="req-heading"><h2 id="req-heading">Requirements</h2><ul className="course-bullets">{detail.requirements.map(text=><li key={text}>{text}</li>)}</ul></section>
   <section className="course-section course-description" aria-labelledby="desc-heading"><h2 id="desc-heading">Description</h2>{detail.description.map(text=><p key={text}>{text}</p>)}<h3>Who this course is for</h3><ul className="course-bullets">{detail.whoFor.map(text=><li key={text}>{text}</li>)}</ul><h3>Certification</h3><p>{detail.certificate}</p></section>
   <section className="course-section course-instructor" aria-labelledby="instructor-heading"><h2 id="instructor-heading">Instructor</h2><Link href="/about" className="course-instructor-name">Adarshh Pandey</Link><span>Founder, NumericcVaastu</span><div><Image src="/images/adarshh/adarshh-pandey-with-book.webp" width={120} height={120} alt="Adarshh Pandey holding a numerology book"/><p>Adarshh began his career in the pharmaceutical industry before turning to numerology. What started as curiosity became a consulting practice, and later an academy for people who want a structured path into the subject. His teaching puts the emphasis on method, practice and an honest account of what traditional interpretation can and cannot tell us.</p></div><Link href="/about" className="text-link">Read Adarshh’s story <ArrowUpRight size={17}/></Link></section>
   <section className="course-section" id="compare" aria-labelledby="compare-heading"><h2 id="compare-heading">Compare the learning paths</h2><div className="course-compare" role="region" aria-labelledby="compare-heading" tabIndex={0}><table><thead><tr><th scope="col">Course</th><th scope="col">Level</th><th scope="col">Best for</th><th scope="col">Listed fee</th></tr></thead><tbody>{courses.map(course=>{const info=getCourseDetail(course.id);const current=course.id===offer.id;return <tr key={course.id} className={current?'current':undefined}><th scope="row">{current?<strong>{course.name} <small>You’re viewing this</small></strong>:<Link href={`/courses/${course.slug}`}>{course.name}</Link>}</th><td data-label="Level">{info.level}</td><td data-label="Best for">{course.audience}</td><td data-label="Listed fee">{formatPrice(course)}</td></tr>})}</tbody></table></div></section>
   <section className="course-section" aria-labelledby="faq-heading"><h2 id="faq-heading">Frequently asked questions</h2><div className="course-faq">{detail.faqs.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section>
  </div>
 </div>
 <div className="wrap"><div className="inner-cta"><h2>Ready to take the <em>next step?</em></h2><p>Ask about batch dates, format and confirmed payment terms for {offer.name}.</p><Link href={enquire} className="button">{detail.ctaLabel} <ArrowUpRight size={18}/></Link></div></div>
 <div className="course-mobile-cta"><div><strong>{formatPrice(offer)}</strong><span>{offer.name}</span></div><Link className="button small" href={enquire}>{detail.ctaLabel.split(' ')[0]}</Link></div>
 {jsonLd({'@context':'https://schema.org','@graph':[{'@type':'Course',name:offer.name,description:detail.headline,url,educationalLevel:detail.level,teaches:detail.learn,coursePrerequisites:detail.requirements,provider:{'@type':'Organization',name:'NumericcVaastu',url:origin},instructor:{'@type':'Person',name:'Adarshh Pandey',url:`${origin}/about`}},{'@type':'BreadcrumbList',itemListElement:[['Home',origin],['Courses',`${origin}/courses`],[offer.name,url]].map(([name,item],index)=>({'@type':'ListItem',position:index+1,name,item}))}]})}
 </main><SiteFooter/></>;
}
