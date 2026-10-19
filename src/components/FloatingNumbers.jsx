/** Faint numerals 1–9 drifting slowly upward behind a dark band. Positions are fixed (not random) so server and client render the same markup. */
const DIGITS = [
  [4, 8, 0, 26, 1.1], [9, 22, 6, 31, 0.8], [2, 37, 12, 24, 1.3], [3, 51, 3, 34, 0.9], [5, 64, 9, 28, 1.2],
  [7, 78, 15, 33, 0.85], [8, 90, 5, 27, 1], [1, 15, 18, 30, 0.95], [6, 70, 21, 25, 1.15],
];

export default function FloatingNumbers() {
  return <div className="nv-float" aria-hidden="true">
    {DIGITS.map(([d, left, delay, duration, scale]) => <span key={`${d}-${left}`} style={{left: `${left}%`, animationDelay: `-${delay}s`, animationDuration: `${duration}s`, fontSize: `${scale * 64}px`}}>{d}</span>)}
  </div>;
}
