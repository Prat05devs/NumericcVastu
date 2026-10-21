import Image from 'next/image';
import Link from 'next/link';
import {ArrowUpRight, Award, BookOpen, GraduationCap, Mic, Newspaper} from 'lucide-react';
import {SiteFooter} from '../../components/SiteChrome';
import WhatsAppIcon from '../../components/WhatsAppIcon';
import FloatingNumbers from '../../components/FloatingNumbers';
import {achievementCount, bookLaunch, certificates, groups, highlights, moments, press} from '../../data/achievements';
import {book, bookVideo} from '../../data/media';
import LocalVideo from '../../components/LocalVideo';
import {contact} from '../../data/contact';

const GROUP_ICONS = {awards: Award, guest: Mic, training: GraduationCap};
const invite = `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent('Namaste Adarshh ji 🙏\n\nWe would love to invite you to speak at our event.\n\n*Event:* \n*Organiser:* \n*City / online:* \n*Preferred dates:* \n\n— Sent from numericcvaastu.com')}`;

export const metadata = {
  title: 'Achievements and Awards | Numerologist Adarshh Panndey | NumericcVaastu',
  description: 'Awards, honours and press for Adarshh Panndey: The Popular Story 40 Under 40 (2026), Numerology Career Coach of the Year 2026, GuruCool Book of the Year 2025 and more.',
  alternates: {canonical: '/achievements'},
};

function Photo({src, w, h, caption, sizes}) {
  return <figure className="ac-photo">
    <Image src={src} alt={caption || 'Adarshh Panndey at an event'} width={w} height={h} sizes={sizes}/>
    {caption && <figcaption>{caption}</figcaption>}
  </figure>;
}

export default function Page() {
  const [lead, ...rest] = highlights;
  return <>
    <main id="main" className="hv ac-page">
      <section className="pc-hero ac-hero">
        <div className="hv-wrap pc-hero__grid">
          <div className="pc-hero__copy">
            <span className="hv-eyebrow">Achievements</span>
            <h1>A journey of growth <em>and recognition.</em></h1>
            <p>Awards, honours and press for Adarshh Panndey, founder of NumericcVaastu Training &amp; Consultancy LLP, author and numerology career coach.</p>
            <ul className="pc-stats">
              <li><strong data-count>{achievementCount}+</strong>awards, honours and certificates</li>
              <li><strong data-count>20,000+</strong>consultations</li>
              <li><strong data-count>7+</strong>years of practice</li>
            </ul>
          </div>
          <figure className="ac-hero__media">
            <Image src={press[0].image} alt="The Popular Story 40 Under 40 certificate, trophy and magazine feature" width={press[0].w} height={press[0].h} sizes="(max-width: 1000px) 92vw, 620px" priority/>
            <figcaption><b>{lead.year} · {lead.by}</b>{lead.title}</figcaption>
          </figure>
        </div>
      </section>

      <section className="hv-section hv-wrap" aria-labelledby="ac-highlights">
        <div className="hv-head"><div><span className="hv-eyebrow">Highlights</span><h2 id="ac-highlights">Recognised <em>across India.</em></h2></div><div className="hv-head__aside"><p>Four honours from the last two years, from national awards to recognition for his book.</p></div></div>
        <ul className="ac-highlights">
          {[lead, ...rest].map((h) => <li key={h.title} className={h.image ? 'has-image' : ''}>
            {h.image && <div className="ac-highlights__img"><Image src={h.image} alt="" fill sizes="(max-width: 700px) 92vw, 300px"/></div>}
            <div className="ac-highlights__body">
              <span className="ac-year">{h.year}</span>
              <h3>{h.title}</h3>
              {h.by && <p className="ac-by">{h.by}</p>}
              <p>{h.text}</p>
            </div>
          </li>)}
        </ul>
      </section>

      <section className="hv-section hv-tint" aria-labelledby="ac-all">
        <div className="hv-wrap">
          <div className="hv-head"><div><span className="hv-eyebrow">The full list</span><h2 id="ac-all">Awards, invitations <em>and training.</em></h2></div><div className="hv-head__aside"><p>Every recognition and certificate, with the year where there is one.</p></div></div>
          <div className="ac-groups">
            {groups.map((g) => {
              const Icon = GROUP_ICONS[g.key];
              return <div key={g.key} className="ac-group">
                <h3><Icon size={20} aria-hidden="true"/>{g.title}</h3>
                <ul>{g.items.map((item) => <li key={item.title}>
                  <span><b>{item.title}</b>{item.by && <small>{item.by}</small>}</span>
                  {item.year && <span className="ac-year">{item.year}</span>}
                </li>)}</ul>
              </div>;
            })}
          </div>
        </div>
      </section>

      <section className="hv-section hv-wrap" aria-labelledby="ac-certs">
        <div className="hv-head"><div><span className="hv-eyebrow">On the wall</span><h2 id="ac-certs">The certificates <em>and trophies.</em></h2></div><div className="hv-head__aside"><p>Photographs of the awards and certificates themselves.</p></div></div>
        <div className="ac-moments ac-certs">{certificates.map((p) => <Photo key={p.src} {...p} sizes="(max-width: 600px) 46vw, (max-width: 1000px) 30vw, 300px"/>)}</div>
      </section>

      <section className="hv-section hv-wrap" aria-labelledby="ac-book">
        <div className="ac-book">
          <div>
            <span className="hv-eyebrow"><BookOpen size={15} aria-hidden="true"/> Author</span>
            <h2 id="ac-book">{book.title}, <em>launched on stage.</em></h2>
            <p>His book on what birth dates and names reveal was launched at The Trainers’ Camp and went on to win GuruCool’s Book of the Year award in 2025.</p>
            <a className="hv-link" href={book.amazon} target="_blank" rel="noopener noreferrer">Get the book on Amazon <ArrowUpRight size={16}/></a>
          </div>
          <div className="ac-book__photos">
            <LocalVideo {...bookVideo} label={`Adarshh on his book · ${bookVideo.minutes}`} className="ac-book__video"/>
            {bookLaunch.slice(0, 2).map((p) => <Photo key={p.src} {...p} sizes="(max-width: 700px) 46vw, 260px"/>)}
          </div>
        </div>
      </section>

      <section className="hv-section hv-tint" aria-labelledby="ac-press">
        <div className="hv-wrap">
          <div className="hv-head"><div><span className="hv-eyebrow"><Newspaper size={15} aria-hidden="true"/> In the press</span><h2 id="ac-press">Featured as one of India’s <em>leading numerology coaches.</em></h2></div></div>
          <ul className="ac-press">
            {press.map((p) => <li key={p.name}>
              <div className="ac-press__img"><Image src={p.image} alt={`${p.name}: ${p.title}`} fill sizes="(max-width: 900px) 92vw, 400px"/></div>
              <b>{p.name}</b>
              <p>{p.title}</p>
            </li>)}
          </ul>
        </div>
      </section>

      <section className="hv-section hv-wrap" aria-labelledby="ac-moments">
        <div className="hv-head"><div><span className="hv-eyebrow">On stage</span><h2 id="ac-moments">Moments <em>along the way.</em></h2></div><div className="hv-head__aside"><p>Award ceremonies, talks and workshops.</p><Link href="/gallery" className="hv-link">See the full gallery <ArrowUpRight size={16}/></Link></div></div>
        <div className="ac-moments">{moments.map((p) => <Photo key={p.src} {...p} sizes="(max-width: 600px) 92vw, (max-width: 1000px) 46vw, 400px"/>)}</div>
      </section>

      <section className="pc-invite">
        <FloatingNumbers/>
        <div className="hv-wrap pc-invite__inner">
          <div>
            <span className="hv-eyebrow">For organisers</span>
            <h2>Invite Adarshh <em>to speak.</em></h2>
            <p>Talks, workshops and seminars on numerology, Numeric Vaastu and building a career in the practice.</p>
          </div>
          <div className="hv-actions">
            <a className="hv-button hv-button--whatsapp" href={invite} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={20}/> Send an invitation</a>
            <Link className="hv-button hv-button--light" href="/book-consultation">Book a consultation <ArrowUpRight size={18}/></Link>
          </div>
        </div>
      </section>
    </main>
    <SiteFooter/>
  </>;
}
