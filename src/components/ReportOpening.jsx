'use client';
import {useEffect, useState} from 'react';
import {translate} from '../i18n/translate';

/**
 * The browser keeps this page on screen until the PDF starts arriving, so the buyer sees progress instead of a blank
 * tab. The language follows the report being opened.
 */
export default function ReportOpening() {
  const [lang, setLang] = useState('en');
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const language = params.get('lang') === 'hi' ? 'hi' : 'en';
    setLang(language);
    const pass = params.get('pass');
    if (pass) window.location.replace(`/api/report/pdf?pass=${encodeURIComponent(pass)}&lang=${language}`);
    const timer = setTimeout(() => setSlow(true), 45000);
    return () => clearTimeout(timer);
  }, []);
  const t = (text) => translate(text, lang);
  return <main id="main" lang={lang} style={{minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f7f2fb', color: '#241b2f', fontFamily: 'var(--font-manrope), system-ui, sans-serif', textAlign: 'center'}}>
    <div style={{maxWidth: 440}}>
      <div aria-hidden="true" style={{width: 48, height: 48, margin: '0 auto 20px', borderRadius: '50%', border: '4px solid #e6dcec', borderTopColor: '#b3122e', animation: 'nv-spin 1s linear infinite'}}/>
      <style>{'@keyframes nv-spin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){[aria-hidden]{animation:none!important}}'}</style>
      <h1 style={{fontSize: 24, margin: '0 0 10px', color: '#2a1046'}}>{t('Preparing your report…')}</h1>
      <p role="status" style={{margin: 0, lineHeight: 1.6}}>{t('Your personal PDF is being created. This takes about 20 seconds; please keep this tab open.')}</p>
      {slow && <p style={{marginTop: 16, lineHeight: 1.6}}>{t('Taking longer than usual? Reload this page. If it still does not open, WhatsApp us on +91 98701 97315 with your payment ID.')}</p>}
    </div>
  </main>;
}
