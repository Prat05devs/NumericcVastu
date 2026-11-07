'use client';
import {useEffect, useState} from 'react';
import {promoFor} from '../data/offers';

/** Flashing "Deepawali special" tag for an offer's own promotion; hidden once promoUntil has passed. */
export default function PromoBadge({offer, className = ''}) {
  const [on, setOn] = useState(Boolean(promoFor(offer)));
  useEffect(() => { setOn(Boolean(promoFor(offer))); }, [offer]);
  const promo = promoFor(offer);
  if (!on || !promo?.label) return null;
  return <span className={`nv-promo-badge ${className}`}><i aria-hidden="true">✦</i>{promo.label}</span>;
}
