'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ArrowUpRight, Phone, Mail, MapPin, MessageCircleQuestion } from 'lucide-react';
import { contact } from '../data/contact';
import { book } from '../data/media';
import WhatsAppIcon from './WhatsAppIcon';
import { openSiteGuide } from './SiteGuide';
import HeritageBand from './HeritageBands';
import { OfferAnnouncement } from './SalesConversion';
import { useEffect, useRef, useState } from 'react';
/** Start every newly opened page at the top. Next.js only scrolls when it judges the new content to be off-screen, which leaves small offsets behind. Section links (#watch) and Back/Forward keep their own positions. */
function useScrollToTopOnNavigate(path){
 const first=useRef(true),historyMove=useRef(false);
 useEffect(()=>{const mark=()=>{historyMove.current=true};window.addEventListener('popstate',mark);return()=>window.removeEventListener('popstate',mark)},[]);
 useEffect(()=>{
  if(first.current){first.current=false;return}
  if(historyMove.current){historyMove.current=false;return}
  if(window.location.hash)return;
  window.scrollTo({top:0,left:0,behavior:'instant'});
 },[path]);
}
const nav=[['About','/about'],['Achievements','/achievements'],['Consultations','/consultations'],['Courses','/courses'],['Podcasts','/podcasts'],['Predictions','/predictions'],['Gallery','/gallery'],['Journal','/blog']];
export function SiteHeader(){
 const [open,setOpen]=useState(false);const path=usePathname();
 useScrollToTopOnNavigate(path);
 return <><a className="skip-link" href="#main">Skip to content</a><header className="nav-shell" style={{viewTransitionName:'site-header'}}><nav className="nav wrap" aria-label="Main navigation"><Link href="/" className="brand" onClick={()=>setOpen(false)}><img src="/images/logo-nv.png" alt="" width="312" height="283"/><span>NumericcVaastu<small>Training &amp; Consultancy LLP</small></span></Link><div className={open?'nav-links open':'nav-links'}>{nav.map(([label,href])=><Link key={href} href={href} aria-current={path===href?'page':undefined} onClick={()=>setOpen(false)}>{label}</Link>)}</div><Link href="/book-consultation" className="button small button-gold"><span>Book<span className="cta-long"> a consultation</span></span><ArrowUpRight size={16}/></Link><button className="menu-toggle icon-button" onClick={()=>setOpen(!open)} aria-label={open?'Close navigation':'Open navigation'} aria-expanded={open}>{open?<X/>:<Menu/>}</button></nav></header><div className="top-bar"><a className="top-bar__contact" href={contact.phoneHref}><Phone size={14} aria-hidden="true"/>{contact.phone}</a><OfferAnnouncement/><a className="top-bar__contact" href={`mailto:${contact.email}`}><Mail size={14} aria-hidden="true"/>{contact.email}</a></div><HeritageBand kind="small" className="heritage-site-header"/>{!path.startsWith('/book-consultation')&&<Link href="/book-consultation" className="wa-float" aria-label="Book or ask Adarshh on WhatsApp"><WhatsAppIcon size={28}/><span>Book on WhatsApp</span></Link>}</>;
}
export function SiteFooter(){return <><HeritageBand kind="temple" className="heritage-footer-band"/><div className="footer-shell"><footer className="footer wrap"><div className="footer-top"><div><Link href="/" className="brand"><img src="/images/logo-nv.png" alt="" width="312" height="283"/><span>NumericcVaastu<small>Training &amp; Consultancy LLP</small></span></Link><p>Indian knowledge, a modern perspective.<br/>Consultations and learning with Adarshh Panndey.</p><address className="footer-contact"><a href={contact.phoneHref}><Phone size={16} aria-hidden="true"/>{contact.phone}</a><a href={`mailto:${contact.email}`}><Mail size={16} aria-hidden="true"/>{contact.email}</a><a href={contact.mapUrl} target="_blank" rel="noopener noreferrer"><MapPin size={16} aria-hidden="true"/><span>{contact.addressLines.map(line=><span key={line}>{line}</span>)}</span></a></address></div><div><span>EXPLORE</span>{[['About','/about'],['Achievements','/achievements'],['Consultations','/consultations'],['Courses','/courses'],['Podcasts','/podcasts'],['Predictions','/predictions'],['Videos & reels','/#watch'],['Numerology calculator','/numerology-calculator'],['Testimonials','/testimonials'],['Gallery','/gallery'],['Blog','/blog']].map(([label,href])=><Link key={href} href={href}>{label}</Link>)}<a href={book.amazon} target="_blank" rel="noopener noreferrer">His book on Amazon ↗</a></div><div><span>HELP & INFORMATION</span>{[['Book a consultation','/book-consultation'],['Contact','/contact'],['FAQ','/faq'],['Site map','/sitemap'],['Privacy','/privacy-policy'],['Terms','/terms-and-conditions'],['Refunds','/refund-policy'],['Disclaimer','/disclaimer']].map(([label,href])=><Link key={href} href={href}>{label}</Link>)}</div></div><div className="footer-guide"><MessageCircleQuestion size={28} aria-hidden="true"/><p><strong>Can’t find what you’re looking for?</strong> Ask the site guide. It answers questions about consultations, courses, fees and booking from this website, and points you to the right page.</p><button type="button" className="button small button-gold" onClick={openSiteGuide}>Ask the site guide <ArrowUpRight size={16}/></button></div><div className="footer-bottom"><span>© 2020 NumericcVaastu.</span><Link href="/">Back to home ↑</Link></div></footer></div></>}
