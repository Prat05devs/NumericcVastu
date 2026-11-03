'use client';
import {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {translate} from './translate';
const LocaleContext=createContext({locale:'en',t:text=>text});
export function LocaleProvider({children}) {
  const [locale,setLocale]=useState('en');
  // English is the static server snapshot. Restore the visitor's choice after hydration.
  useEffect(()=>{try{if(localStorage.getItem('nv-locale')==='hi')setLocale('hi')}catch{}},[]);
  useEffect(()=>{document.documentElement.lang=locale},[locale]);
  const value=useMemo(()=>({locale,t:text=>translate(text,locale),setLocale:next=>{
    if(!['en','hi'].includes(next))return;
    setLocale(next);try{localStorage.setItem('nv-locale',next)}catch{}
  }}),[locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
export const useLocale=()=>useContext(LocaleContext);
/** A local language boundary for exports; does not change the page or saved preference. */
export function LocaleScope({locale,children}) {
  const language=locale==='hi'?'hi':'en';
  const value=useMemo(()=>({locale:language,t:text=>translate(text,language),setLocale:()=>{}}),[language]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
export function LanguageToggle() {
  const {locale,setLocale}=useLocale();
  return <button className="language-toggle" type="button" onClick={()=>setLocale(locale==='en'?'hi':'en')} aria-label={locale==='en'?'Switch language to Hindi':'भाषा अंग्रेज़ी में बदलें'} title={locale==='en'?'Read in Hindi':'Read in English'}><span lang="en" className={locale==='en'?'is-current':''}>EN</span><span aria-hidden="true">/</span><span lang="hi" className={locale==='hi'?'is-current':''}>हिं</span></button>;
}
