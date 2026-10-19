import Image from 'next/image';
import {photos} from '../../data/content';

const HEIGHT = 240;
const find = (slug) => photos.find((photo) => photo.src.endsWith(`/${slug}.webp`));

/** Two rows of photographs drifting in opposite directions. Each row is rendered twice for a seamless loop; the copy is hidden from assistive tech. */
export default function WorkMarquee({rows}) {
  return <div className="hv-marquee">
    {rows.map((row, r) => {
      const list = row.map(find).filter(Boolean);
      const tiles = (copy) => list.map((photo) => <figure key={`${copy}-${photo.src}`} className="hv-marquee__tile" style={{width: Math.round(HEIGHT * photo.w / photo.h)}}>
        <Image src={photo.src} alt={copy ? '' : `${photo.category} photograph of Adarshh Panndey`} width={Math.round(HEIGHT * photo.w / photo.h)} height={HEIGHT} sizes={`${Math.round(HEIGHT * photo.w / photo.h)}px`}/>
        <figcaption>{photo.category}</figcaption>
      </figure>);
      return <div key={r} className={r % 2 ? 'hv-marquee__row is-reverse' : 'hv-marquee__row'}>
        <div className="hv-marquee__track">{tiles(0)}<div className="hv-marquee__copy" aria-hidden="true">{tiles(1)}</div></div>
      </div>;
    })}
  </div>;
}
