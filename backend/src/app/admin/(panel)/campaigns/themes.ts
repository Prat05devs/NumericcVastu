import type {CampaignTheme} from '../../../../lib/commerce.ts';

/** Decoration styles the storefronts know how to draw. The emoji is only for the back office preview. */
export const DECORATIONS: [string, string, string][] = [
  ['none', 'None', ''], ['diyas', 'Diyas', '🪔'], ['lights', 'Fairy lights', '✨'], ['rangoli', 'Rangoli', '🌸'], ['marigold', 'Marigold garlands', '🌼'],
  ['colours', 'Holi colours', '🎨'], ['fireworks', 'Fireworks', '🎆'], ['kites', 'Kites', '🪁'], ['tricolour', 'Tricolour', '🇮🇳'],
];

/** Starting points for common sales; every field stays editable. */
export const TEMPLATES: Record<string, {name: string; theme: CampaignTheme}> = {
  diwali: {name: 'Diwali Sale', theme: {badge: 'Diwali Sale', bannerText: 'Diwali Sale: festive savings on consultations and courses', decoration: 'diyas', showCountdown: true, colors: {primary: '#7a1f1f', accent: '#f2b632', background: '#2b0b0b', text: '#fff6e0'}}},
  holi: {name: 'Holi Offer', theme: {badge: 'Holi Offer', bannerText: 'Celebrate Holi with a colourful offer', decoration: 'colours', showCountdown: true, colors: {primary: '#d6336c', accent: '#20c997', background: '#fff0f6', text: '#3b0a24'}}},
  navratri: {name: 'Navratri Special', theme: {badge: 'Navratri Special', bannerText: 'Navratri special: nine days of savings', decoration: 'marigold', showCountdown: true, colors: {primary: '#c2410c', accent: '#facc15', background: '#7c2d12', text: '#fff7ed'}}},
  newyear: {name: 'New Year Sale', theme: {badge: 'New Year', bannerText: 'Start the year with your numbers: New Year offer', decoration: 'fireworks', showCountdown: true, colors: {primary: '#1e3a8a', accent: '#fbbf24', background: '#0b1437', text: '#f8fafc'}}},
  independence: {name: 'Independence Day Offer', theme: {badge: 'Independence Day', bannerText: 'Independence Day offer', decoration: 'tricolour', showCountdown: false, colors: {primary: '#ff9933', accent: '#138808', background: '#ffffff', text: '#000080'}}},
  sale: {name: 'Limited-time Offer', theme: {badge: 'Limited time', bannerText: 'A limited-time offer from NumericcVaastu', decoration: 'lights', showCountdown: true, colors: {primary: '#4a1f7a', accent: '#d4a52c', background: '#2a1046', text: '#ffffff'}}},
};
