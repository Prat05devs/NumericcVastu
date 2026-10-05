import Link from 'next/link';
import Image from 'next/image';
import {ArrowUpRight} from 'lucide-react';
import {photos} from '../data/content';
/** A short curated row of gallery photographs, picked by file name, linking to the full gallery. */
export default function PhotoStrip({eyebrow,title,accent,text,pick,className=''}){
 const list=pick.map(name=>photos.find(photo=>photo.src.endsWith(`/${name}.webp`))).filter(Boolean);
 return <section className={`photo-strip ${className}`} aria-labelledby="photo-strip-heading"><div className="photo-strip-heading"><div><span className="eyebrow">{eyebrow}</span><h2 id="photo-strip-heading">{title} <em>{accent}</em></h2></div><div><p>{text}</p><Link href="/gallery" className="text-link">See the full gallery <ArrowUpRight size={17}/></Link></div></div><div className="photo-strip-grid">{list.map(photo=><figure key={photo.src}><div className="photo-strip-image"><Image src={photo.src} alt={photo.caption||`${photo.category} photograph of Adarshh Pandey`} fill sizes="(max-width:600px) 92vw, (max-width:1000px) 46vw, 30vw"/></div><figcaption><small>{photo.category}</small>{photo.caption}</figcaption></figure>)}</div></section>;
}
