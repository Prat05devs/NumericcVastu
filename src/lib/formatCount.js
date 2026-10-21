/** 1600000 → "1.6M", 331000 → "331K", 950 → "950". */
export function formatCount(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(n);
}

/** A total rounded down so it never overstates: 4,709,000 → "4.7M+", 24,200 → "24K+". */
export function formatTotal(n) {
  if (n >= 1e6) return `${Math.floor(n / 1e5) / 10}M+`;
  if (n >= 1e3) return `${Math.floor(n / 1e3)}K+`;
  return String(n);
}

/** The same rounded-down total with "million" spelled out for headline copy: 4,709,000 → "4.7 million+". */
export function formatTotalWords(n) {
  if (n >= 1e6) return `${Math.floor(n / 1e5) / 10} million+`;
  return formatTotal(n);
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
/** Small counts as words for running text: 7 → "seven"; 12 stays "12". */
export const countWord = (n) => WORDS[n] || String(n);
