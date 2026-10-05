'use client';
/** A grid of glass cards over a drifting colour backdrop; tracks the pointer so each card's glow follows the cursor. */
export default function GlowGrid({children,className=''}){
 function track(event){const card=event.target.closest('.offer-card');if(!card)return;const rect=card.getBoundingClientRect();card.style.setProperty('--mx',`${event.clientX-rect.left}px`);card.style.setProperty('--my',`${event.clientY-rect.top}px`)}
 return <div className={`glass-grid ${className}`}><div className="glass-grid-backdrop" aria-hidden="true"><span/><span/><span/></div><div className="offer-grid" onPointerMove={track}>{children}</div></div>;
}
