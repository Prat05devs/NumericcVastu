'use client';
import {useState} from 'react';
import {Art} from './ui';

type M = {url: string; alt: string; width: number | null; height: number | null};
/** Product photos: a large main image and a strip of thumbnails (left on wide screens, below on phones). */
export function Gallery({media, art, title}: {media: M[]; art: string; title: string}) {
  const [i, setI] = useState(0);
  const main = media[i];
  return (
    <div className="gal">
      {media.length > 1 && (
        <div className="thumbs" role="group" aria-label="Photos">
          {media.map((m, k) => <button key={m.url} type="button" aria-pressed={k === i} aria-label={`Photo ${k + 1} of ${media.length}`} onClick={() => setI(k)}><img src={m.url} alt="" loading="lazy" /></button>)}
        </div>
      )}
      <div className="pic main-img" style={media.length > 1 ? undefined : {gridColumn: '1 / -1'}}>
        {main ? <img src={main.url} alt={main.alt || title} width={main.width ?? 1200} height={main.height ?? 1500} /> : <Art name={art} />}
      </div>
    </div>
  );
}
