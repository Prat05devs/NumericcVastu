'use client';
import {useEffect, useRef, useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {ArrowLeft, ArrowRight} from 'lucide-react';
import {crop} from '../lib/crop';

const formatDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'});

/** Branded cover: NV logo and Adarshh's photo badge, the cover title in the display face, and a photograph fading in on the right. */
function Cover({post}) {
  const cover = post.cover || {title: post.title};
  return <div className="nv-blog__cover" aria-hidden="true">
    {cover.image && <div className="nv-blog__photo"><Image src={cover.image} alt="" fill sizes="(max-width: 700px) 50vw, 260px" style={crop(cover.image, 0.83)}/></div>}
    <div className="nv-blog__brand"><img src="/images/logo-nv.png" alt="" width="312" height="283"/><span/><img className="nv-blog__avatar" src="/images/reels/profile-numerologybyaadarshh.webp" alt="" width="150" height="150"/></div>
    <div className="nv-blog__cover-text">
      <strong>{cover.title}</strong>
      <i className="nv-blog__rule"/>
      {cover.subtitle && <small>{cover.subtitle}</small>}
    </div>
  </div>;
}

function Card({post}) {
  return <article className="nv-blog__card">
    <Link href={`/blog/${post.slug}`} className="nv-blog__link" aria-label={`Read: ${post.title}`}/>
    <Cover post={post}/>
    <div className="nv-blog__body">
      <span className="nv-blog__meta">{post.category} · {formatDate(post.date)}</span>
      <h3>{post.title}</h3>
      <p>{post.description}</p>
      <span className="nv-blog__read">Read <ArrowRight size={18}/></span>
    </div>
  </article>;
}

/** Journal cards as a swipeable row with page dots and arrows, or as a plain grid. */
export default function BlogCards({posts, carousel = false}) {
  const rail = useRef(null);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(0);
  useEffect(() => {
    const el = rail.current;
    if (!carousel || !el) return;
    const measure = () => {
      const total = Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth - 0.05));
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2;
      setPages(total);
      setPage(atEnd ? total - 1 : Math.min(total - 1, Math.round(el.scrollLeft / el.clientWidth)));
    };
    measure();
    el.addEventListener('scroll', measure, {passive: true});
    window.addEventListener('resize', measure);
    return () => { el.removeEventListener('scroll', measure); window.removeEventListener('resize', measure); };
  }, [carousel, posts.length]);
  const go = (n) => rail.current?.scrollTo({left: n * rail.current.clientWidth, behavior: 'smooth'});
  if (!carousel) return <div className="nv-blog nv-blog--grid">{posts.map((post) => <Card key={post.slug} post={post}/>)}</div>;
  return <div className="nv-blog">
    <div className="nv-blog__rail" ref={rail}>{posts.map((post) => <Card key={post.slug} post={post}/>)}</div>
    {pages > 1 && <div className="nv-blog__controls">
      <button type="button" className="hv-round" onClick={() => go(Math.max(0, page - 1))} aria-label="Previous articles" disabled={page === 0}><ArrowLeft size={18}/></button>
      <div className="nv-blog__dots">{Array.from({length: pages}, (_, i) => <button key={i} type="button" className={i === page ? 'is-active' : ''} onClick={() => go(i)} aria-label={`Show articles page ${i + 1} of ${pages}`} aria-current={i === page}/>)}</div>
      <button type="button" className="hv-round" onClick={() => go(Math.min(pages - 1, page + 1))} aria-label="Next articles" disabled={page === pages - 1}><ArrowRight size={18}/></button>
    </div>}
  </div>;
}
