'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ArrowRight, ArrowUpRight, Award, Baby, BookOpen, Briefcase, Building2, CalendarDays, ChevronDown, Compass, FileText, GraduationCap, Grid2X2, Handshake, HeartHandshake, House, Image, Menu, MessageCircleQuestion, Mic, Orbit, PenLine, Phone, Play, RefreshCcw, Search, ShieldCheck, Signature, Sparkles, UserRound, Watch, X, CircleHelp, ListChecks, Star} from 'lucide-react';
import {navigationGroups, navigationPages} from '../data/navigation';
import {contact} from '../data/contact';
import {LanguageToggle, useLocale} from '../i18n/LocaleProvider';
import LocalizedContent from '../i18n/LocalizedContent';
import {openSiteGuide} from './SiteGuide';
import {OfferAnnouncement} from './SalesConversion';
import WhatsAppIcon from './WhatsAppIcon';

const DESKTOP = '(min-width: 1101px)';
const icons = {sparkles: Sparkles, briefcase: Briefcase, heart: HeartHandshake, building: Building2, handshake: Handshake, baby: Baby, pen: PenLine, phone: Phone, signature: Signature, watch: Watch, home: House, compass: Compass, grid: Grid2X2, orbit: Orbit, report: FileText, chat: MessageCircleQuestion, book: BookOpen, mic: Mic, calendar: CalendarDays, play: Play, image: Image, award: Award, user: UserRound, graduation: GraduationCap, help: CircleHelp, refresh: RefreshCcw, shield: ShieldCheck, list: ListChecks};
const matchesPath = (path, href) => href?.startsWith('/') && !href.startsWith('/#') && path === href.split('#')[0];

function NavigationItem({item, path, onNavigate, onGuide}) {
  const Icon = icons[item.icon] || ArrowUpRight;
  const content = <><span className="nv-menu-icon"><Icon size={19} aria-hidden="true"/></span><span className="nv-menu-link-copy"><span className="nv-menu-link-label">{item.label}{item.badge && <small className="nv-menu-badge">{item.badge}</small>}</span>{item.description && <span className="nv-menu-link-description">{item.description}</span>}</span>{item.external && <ArrowUpRight size={15} aria-hidden="true"/>}</>;
  return <LocalizedContent>{item.action === 'guide'
    ? <button type="button" className="nv-menu-link" onClick={onGuide}>{content}</button>
    : <Link className="nv-menu-link" href={item.href} onClick={onNavigate} aria-current={matchesPath(path,item.href)?'page':undefined} target={item.external?'_blank':undefined} rel={item.external?'noopener noreferrer':undefined}>{content}</Link>}
  </LocalizedContent>;
}

function MenuFeature({feature, onNavigate}) {
  return <LocalizedContent><Link href={feature.href} onClick={onNavigate} className={`nv-nav-feature ${feature.image?'has-image':`is-${feature.kind}`}`}>
    {feature.image ? <img src={feature.image} alt="" loading="lazy"/> : <div className="nv-feature-art" aria-hidden="true">{feature.kind==='report'?<><img src="/images/logo-nv.webp" alt="" width="42" height="38"/><span className="nv-feature-grid">{[4,9,2,3,5,7,8,1,6].map(n=><i key={n}>{n}</i>)}</span></>:<MessageCircleQuestion size={56} strokeWidth={1.2}/>}</div>}
    <span className="nv-feature-copy"><small>{feature.eyebrow}</small><strong>{feature.title}</strong><span>{feature.text}</span><b>{feature.label}<ArrowUpRight size={17} aria-hidden="true"/></b></span>
  </Link></LocalizedContent>;
}

function MenuPanel({group, path, onNavigate, onGuide}) {
  return <LocalizedContent><div className="nv-mega-inner wrap">
    <div className="nv-mega-content">
      <p className="nv-menu-intro">{group.intro}</p>
      <div className="nv-menu-columns">{group.columns.map(column=><section className="nv-menu-column" key={column.title} aria-label={column.title}>
        <h2>{column.title}</h2>
        <ul>{column.links.map(item=><li key={`${item.href || item.action}-${item.label}`}><NavigationItem item={item} path={path} onNavigate={onNavigate} onGuide={onGuide}/></li>)}</ul>
        {column.extra && <div className="nv-menu-extra"><NavigationItem item={column.extra} path={path} onNavigate={onNavigate} onGuide={onGuide}/></div>}
      </section>)}</div>
      <div className="nv-menu-footer"><Link href={group.footer.href} onClick={onNavigate}>{group.footer.label}<ArrowRight size={17} aria-hidden="true"/></Link><span>Thoughtful guidance. A clear next step.</span></div>
    </div>
    <MenuFeature feature={group.feature} onNavigate={onNavigate}/>
  </div></LocalizedContent>;
}

/** Grouped disclosure navigation: mouse, touch and keyboard all use the same links. */
export default function SiteHeader() {
  const path=usePathname();
  const {t}=useLocale();
  const [ready,setReady]=useState(false);
  const [activeMenu,setActiveMenu]=useState(null);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [searchOpen,setSearchOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('all');
  const header=useRef(null), mobileTrigger=useRef(null), searchDialog=useRef(null), searchInput=useRef(null);
  const triggers=useRef({});
  const hoverTimer=useRef(null);
  const firstPage=useRef(true), historyMove=useRef(false);

  const cancelHover=useCallback(()=>{window.clearTimeout(hoverTimer.current)},[]);
  const closeNavigation=useCallback(()=>{cancelHover();setActiveMenu(null);setMobileOpen(false)},[cancelHover]);
  const openGuide=()=>{closeNavigation();searchDialog.current?.close();openSiteGuide()};
  const openSearch=()=>{closeNavigation();setQuery('');setCategory('all');searchDialog.current?.showModal();setSearchOpen(true);searchInput.current?.focus()};

  useEffect(()=>setReady(true),[]);
  useEffect(()=>{
    const mark=()=>{historyMove.current=true};
    window.addEventListener('popstate',mark);
    return()=>window.removeEventListener('popstate',mark);
  },[]);
  useEffect(()=>{
    closeNavigation();searchDialog.current?.close();
    if(firstPage.current){firstPage.current=false;return}
    if(historyMove.current){historyMove.current=false;return}
    if(!window.location.hash)window.scrollTo({top:0,left:0,behavior:'instant'});
  },[path,closeNavigation]);
  useEffect(()=>{
    const measure=()=>document.documentElement.style.setProperty('--site-header-height',`${Math.ceil(header.current?.getBoundingClientRect().height || 160)}px`);
    measure();const observer=new ResizeObserver(measure);observer.observe(header.current);
    return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const media=window.matchMedia(DESKTOP);
    const reset=()=>closeNavigation();media.addEventListener('change',reset);
    return()=>{media.removeEventListener('change',reset);cancelHover()};
  },[closeNavigation,cancelHover]);
  useEffect(()=>{
    if(!mobileOpen&&!searchOpen)return;
    const previous=document.body.style.overflow;document.body.style.overflow='hidden';
    return()=>{document.body.style.overflow=previous};
  },[mobileOpen,searchOpen]);
  useEffect(()=>{
    if(!activeMenu&&!mobileOpen)return;
    const outside=event=>{if(!header.current?.contains(event.target))closeNavigation()};
    const escape=event=>{
      if(event.key!=='Escape'||searchDialog.current?.open)return;
      event.preventDefault();const target=mobileOpen?mobileTrigger.current:triggers.current[activeMenu];
      closeNavigation();target?.focus();
    };
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)};
  },[activeMenu,mobileOpen,closeNavigation]);

  const enterGroup=(event,id)=>{
    if(event.pointerType!=='mouse'||!window.matchMedia(DESKTOP).matches)return;
    cancelHover();hoverTimer.current=window.setTimeout(()=>setActiveMenu(id),130);
  };
  const leaveGroup=(event,id)=>{
    if(event.pointerType!=='mouse'||!window.matchMedia(DESKTOP).matches)return;
    cancelHover();hoverTimer.current=window.setTimeout(()=>setActiveMenu(current=>current===id?null:current),180);
  };
  const triggerKey=(event,id,index)=>{
    if(!window.matchMedia(DESKTOP).matches)return;
    if(event.key==='ArrowDown'){
      event.preventDefault();cancelHover();setActiveMenu(id);
      requestAnimationFrame(()=>document.getElementById(`nv-panel-${id}`)?.querySelector('a,button')?.focus());
    }
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
      event.preventDefault();cancelHover();setActiveMenu(null);
      const next=(index+(event.key==='ArrowRight'?1:-1)+navigationGroups.length)%navigationGroups.length;
      triggers.current[navigationGroups[next].id]?.focus();
    }
  };
  const searchResults=useMemo(()=>{
    const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return navigationPages.filter(page=>{
      if(category!=='all'&&page.group!==category)return false;
      const content=[page.label,t(page.label),page.description,t(page.description),page.category,t(page.category),page.keywords].filter(Boolean).join(' ').toLocaleLowerCase();
      return words.every(word=>content.includes(word));
    });
  },[query,category,t]);

  return <LocalizedContent><>
    <a className="skip-link" href="#main" onClick={closeNavigation}>Skip to content</a>
    <header className="nv-site-header" ref={header} style={{viewTransitionName:'site-header'}}>
      <div className="nv-header-utility"><div className="wrap"><OfferAnnouncement/><div className="nv-utility-links"><a href={contact.phoneHref}><Phone size={13} aria-hidden="true"/>{contact.phone}</a><a href={contact.googleBusiness.url} target="_blank" rel="noopener noreferrer"><Star size={13} aria-hidden="true" fill="currentColor"/>Google reviews</a><Link href="/contact" onClick={closeNavigation}>Contact & support<ArrowUpRight size={13} aria-hidden="true"/></Link></div></div></div>
      <div className="nv-header-main wrap">
        <Link href="/" className="brand nv-header-brand" onClick={closeNavigation} aria-label="NumericcVaastu home"><img src="/images/logo-nv.webp" alt="" width="62" height="56"/><span translate="no">NumericcVaastu<small>Training &amp; Consultancy LLP</small></span></Link>
        <div className="nv-header-promise"><span>Indian wisdom. A modern perspective.</span><small>Numerology · Vaastu · Learning</small></div>
        <div className="nv-header-actions">
          <button className="nv-header-search" type="button" disabled={!ready} onClick={openSearch} aria-haspopup="dialog" aria-label="Search the website"><Search size={20} aria-hidden="true"/><span>Find a page</span></button>
          <LanguageToggle/>
          <Link href="/book-consultation" className="button small button-gold nv-header-book" onClick={closeNavigation}>Book a consultation<ArrowUpRight size={16} aria-hidden="true"/></Link>
          <button ref={mobileTrigger} className="nv-mobile-toggle" type="button" disabled={!ready} aria-expanded={mobileOpen} aria-controls="nv-main-navigation" aria-label={mobileOpen?'Close navigation':'Open navigation'} onClick={()=>{cancelHover();setMobileOpen(current=>!current);setActiveMenu(null)}}>{mobileOpen?<X size={24}/>:<Menu size={24}/>}</button>
        </div>
      </div>
      <nav className={`nv-navigation ${mobileOpen?'is-open':''}`} id="nv-main-navigation" aria-label="Main navigation" onBlur={event=>{if(window.matchMedia(DESKTOP).matches&&!event.currentTarget.contains(event.relatedTarget)){cancelHover();setActiveMenu(null)}}}>
        <div className="nv-nav-strip wrap">
          {navigationGroups.map((group,index)=>{
            if(group.href)return <div className="nv-nav-group" key={group.id}><a ref={element=>{triggers.current[group.id]=element}} className="nv-nav-trigger nv-nav-direct" href={group.href} target="_blank" rel="noopener noreferrer" onClick={closeNavigation} onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight')triggerKey(event,group.id,index)}}>{group.label}<ArrowUpRight size={15} aria-hidden="true"/></a></div>;
            const current=group.columns.some(column=>column.links.some(link=>matchesPath(path,link.href)));
            return <div className="nv-nav-group" key={group.id} onPointerEnter={event=>enterGroup(event,group.id)} onPointerLeave={event=>leaveGroup(event,group.id)}>
              <button ref={element=>{triggers.current[group.id]=element}} className={`nv-nav-trigger ${current?'is-current':''}`} type="button" disabled={!ready} id={`nv-trigger-${group.id}`} aria-expanded={activeMenu===group.id} aria-controls={`nv-panel-${group.id}`} onClick={()=>{cancelHover();setActiveMenu(current=>current===group.id?null:group.id)}} onKeyDown={event=>triggerKey(event,group.id,index)}>{group.label}<ChevronDown size={15} aria-hidden="true"/></button>
              <div id={`nv-panel-${group.id}`} className="nv-mega-panel" aria-labelledby={`nv-trigger-${group.id}`} hidden={activeMenu!==group.id}><MenuPanel group={group} path={path} onNavigate={closeNavigation} onGuide={openGuide}/></div>
            </div>;
          })}
          <div className="nv-mobile-contact"><Link href="/book-consultation" className="button small button-gold" onClick={closeNavigation}>Book a consultation<ArrowUpRight size={16}/></Link><a href={contact.phoneHref}><Phone size={16}/>{contact.phone}</a></div>
        </div>
      </nav>
      <dialog className="nv-page-search" ref={searchDialog} aria-labelledby="nv-search-title" onClose={()=>setSearchOpen(false)} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();searchDialog.current.close()}}} onClick={event=>{if(event.target===event.currentTarget){const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)event.currentTarget.close()}}}>
        <div className="nv-search-heading"><div><span>Find your way</span><h2 id="nv-search-title">What are you looking for?</h2></div><button type="button" className="nv-header-icon" aria-label="Close page search" onClick={()=>searchDialog.current.close()}><X size={22}/></button></div>
        <div className="nv-search-fields"><label className="nv-search-input"><span className="sr-only">Search pages</span><Search size={20} aria-hidden="true"/><input ref={searchInput} value={query} onChange={event=>setQuery(event.target.value)} placeholder={t('Try career, Lo Shu, courses…')} maxLength={100} type="search"/></label><label className="nv-search-filter"><span className="sr-only">Filter pages by category</span><select value={category} onChange={event=>setCategory(event.target.value)}><option value="all">All categories</option>{navigationGroups.filter(group=>group.columns).map(group=><option value={group.id} key={group.id}>{group.label}</option>)}</select></label></div>
        <p className="nv-search-count" role="status">{searchResults.length} pages found</p>
        <ul className="nv-search-results">{searchResults.map(page=><li key={page.href}><Link href={page.href} onClick={()=>searchDialog.current.close()}><span><small>{page.category}</small><strong>{page.label}</strong></span><ArrowUpRight size={18} aria-hidden="true"/></Link></li>)}</ul>
        {!searchResults.length&&<div className="nv-search-empty"><Compass size={32} aria-hidden="true"/><p>No matching pages. Try a different word or category.</p><button type="button" className="button small" onClick={openGuide}>Ask the site guide<ArrowRight size={16}/></button></div>}
        <div className="nv-search-footer"><span>Explore at your own pace.</span><Link href="/sitemap" onClick={()=>searchDialog.current.close()}>See every page<ArrowRight size={16}/></Link></div>
      </dialog>
    </header>
    {(activeMenu||mobileOpen)&&<div className="nv-navigation-scrim" aria-hidden="true" onClick={closeNavigation}/>}
    {!path.startsWith('/book-consultation')&&<Link href="/book-consultation" className="wa-float" aria-label="Book or ask Adarshh on WhatsApp"><WhatsAppIcon size={28}/><span>Book on WhatsApp</span></Link>}
  </></LocalizedContent>;
}
