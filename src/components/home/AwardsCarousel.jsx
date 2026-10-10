'use client';
import {useRef} from 'react';
import Image from 'next/image';
import {ArrowLeft, ArrowRight} from 'lucide-react';

/** Swipeable, scroll-snapped row of award photographs with arrow controls for pointer users. */
export default function AwardsCarousel({items}) {
  const rail = useRef(null);
  const scroll = (direction) => rail.current?.scrollBy({left: direction * rail.current.clientWidth * .75, behavior: 'smooth'});
  return <div className="hv-awards">
    <div className="hv-awards__rail" ref={rail} tabIndex={0} aria-label="Awards and recognition, scroll for more">
      {items.map((item) => <figure key={item.slug} className="hv-award">
        <div className="hv-award__image"><Image src={`/images/gallery/${item.slug}.webp`} alt={`Adarshh Pandey at the ${item.title}`} fill sizes="(max-width: 700px) 80vw, 380px"/></div>
        <figcaption>{item.title}</figcaption>
      </figure>)}
    </div>
    <div className="hv-awards__arrows">
      <button type="button" className="hv-round" onClick={() => scroll(-1)} aria-label="Previous awards"><ArrowLeft size={18}/></button>
      <button type="button" className="hv-round" onClick={() => scroll(1)} aria-label="Next awards"><ArrowRight size={18}/></button>
    </div>
  </div>;
}
