'use client';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight} from 'lucide-react';

/** Bottom bar with the offer, its fee and the main action. Appears once the hero's buttons scroll out of view. */
export default function StickyBuy({name, price, href, label, watch = '#buy-anchor'}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = document.querySelector(watch);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0), {threshold: 0});
    io.observe(el);
    return () => io.disconnect();
  }, [watch]);
  return <div className={show ? 'sticky-buy is-shown' : 'sticky-buy'} aria-hidden={!show}>
    <div className="hv-wrap sticky-buy__inner">
      <div><b>{name}</b><span>{price}</span></div>
      <Link className="hv-button hv-button--gold" href={href} tabIndex={show ? 0 : -1}>{label} <ArrowUpRight size={17}/></Link>
    </div>
  </div>;
}
