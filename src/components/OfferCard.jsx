import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { formatPrice, getActivePromotion } from '../data/offers';
export function OfferCard({offer,compact=false}){
 const href=offer.kind==='course'?`/courses/${offer.slug}`:`/consultations/${offer.slug}`;
 const promo=getActivePromotion(offer.id);
 return <article className={`offer-card ${compact?'offer-card-compact':''}`}><div className="offer-card-top"><span>{offer.category}</span><span>{offer.kind==='course'?'ACADEMY':'PERSONAL GUIDANCE'}</span></div><h3><Link href={href}>{offer.name}</Link></h3><p>{offer.summary}</p><div className="offer-card-bottom"><div><strong>{formatPrice(offer)}</strong>{promo&&<small>{promo.label}</small>}</div><Link href={href} aria-label={`View ${offer.name}`} className="offer-arrow"><ArrowUpRight size={20}/></Link></div></article>
}
