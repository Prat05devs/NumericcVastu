'use client';
import {useState} from 'react';
import type {CampaignTheme} from '../../../../lib/commerce.ts';
import {DECORATIONS} from './themes.ts';

/** Banner, colours and decoration of a sale, with a live preview of how the storefronts will show it. */
export default function ThemeFields({theme: initial}: {theme: CampaignTheme}) {
  const [theme, setTheme] = useState<CampaignTheme>(initial);
  const colors = {primary: '#4a1f7a', accent: '#d4a52c', background: '#2a1046', text: '#ffffff', ...theme.colors};
  const set = (patch: Partial<CampaignTheme>) => setTheme((t) => ({...t, ...patch}));
  const setColor = (key: keyof typeof colors, value: string) => setTheme((t) => ({...t, colors: {...t.colors, [key]: value}}));
  const emoji = DECORATIONS.find(([id]) => id === theme.decoration)?.[2] || '';
  return <fieldset>
    <legend>Look on the websites</legend>
    <div className="grid two">
      <div className="grid">
        <label>Badge <small>Short label on prices and cards.</small><input type="text" name="themeBadge" maxLength={30} value={theme.badge ?? ''} onChange={(e) => set({badge: e.target.value})}/></label>
        <label>Banner text<input type="text" name="themeBannerText" maxLength={140} value={theme.bannerText ?? ''} onChange={(e) => set({bannerText: e.target.value})}/></label>
        <label>Banner link <small>Optional path, e.g. /courses</small><input type="text" name="themeBannerLink" value={theme.bannerLink ?? ''} onChange={(e) => set({bannerLink: e.target.value})}/></label>
        <label>Decoration<select name="themeDecoration" value={theme.decoration ?? 'none'} onChange={(e) => set({decoration: e.target.value})}>{DECORATIONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>Hero image URL <small>Optional festive artwork.</small><input type="url" name="themeHeroImageUrl" value={theme.heroImageUrl ?? ''} onChange={(e) => set({heroImageUrl: e.target.value})}/></label>
        <div className="grid four">
          {(['primary', 'accent', 'background', 'text'] as const).map((key) => <label key={key} style={{textTransform: 'capitalize'}}>{key}<input type="color" name={`themeColor_${key}`} value={colors[key]} onChange={(e) => setColor(key, e.target.value)}/></label>)}
        </div>
        <label className="row" style={{fontWeight: 500}}><input type="checkbox" name="themeShowCountdown" checked={!!theme.showCountdown} onChange={(e) => set({showCountdown: e.target.checked})}/>Show a countdown to the real end time</label>
      </div>
      <div className="preview" aria-label="Preview">
        <div className="bar" style={{background: colors.primary, color: colors.text}}>
          {theme.badge && <span className="badge" style={{background: colors.accent, color: colors.background}}>{theme.badge}</span>}
          <span>{theme.bannerText || 'Banner text'}</span>
          {theme.showCountdown && <small>· ends in 3d 4h</small>}
        </div>
        <div className="hero" style={{background: colors.background, color: colors.text}}>
          {emoji && <div className="deco" aria-hidden="true">{emoji.repeat(7)}</div>}
          <b style={{fontSize: 20}}>Numerology Career Launchpad</b>
          <span><s style={{opacity: 0.6}}>₹29,999</s> <b style={{color: colors.accent}}>₹25,499</b></span>
          <span><span style={{background: colors.accent, color: colors.background, borderRadius: 999, padding: '4px 14px', fontWeight: 700}}>Enrol now</span></span>
        </div>
      </div>
    </div>
  </fieldset>;
}
