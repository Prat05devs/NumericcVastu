'use client';
import {useEffect,useRef,useState} from 'react';
import Image from 'next/image';
import {X,ArrowLeft,ArrowRight,Expand} from 'lucide-react';
export default function Gallery({photos,categories}){
 const [filter,setFilter]=useState('All');const [selected,setSelected]=useState(null);const dialog=useRef(null);const trigger=useRef(null);const touch=useRef(null);
 const list=filter==='All'?photos:photos.filter(p=>p.category===filter);
 const count=name=>name==='All'?photos.length:photos.filter(p=>p.category===name).length;
 function open(i){trigger.current=document.activeElement;setSelected(i)}
 function close(){setSelected(null);trigger.current?.focus()}
 function move(n){setSelected(current=>(current+n+list.length)%list.length)}
 useEffect(()=>{const el=dialog.current;if(selected!==null&&!el.open)el.showModal();if(selected===null&&el.open)el.close()},[selected]);
 const photo=selected!==null?list[selected]:null;
 return <>
  <div className="gallery-filters" role="group" aria-label="Filter photographs">{['All',...categories].map(item=><button key={item} aria-pressed={filter===item} className={filter===item?'active':''} onClick={()=>{setFilter(item);setSelected(null)}}>{item}<span aria-hidden="true">{count(item)}</span></button>)}</div>
  <p className="gallery-count" aria-live="polite">Showing {list.length} {list.length===1?'photograph':'photographs'}{filter==='All'?'':` in ${filter}`}</p>
  <div className="gallery-masonry">{list.map((item,i)=><button className="gallery-tile" key={item.src} onClick={()=>open(i)} aria-label={`Open ${item.category} photograph, ${i+1} of ${list.length}`}><span className="gallery-tile-image" style={{aspectRatio:`${item.w} / ${item.h}`}}><Image src={item.src} alt={item.caption||`${item.category} photograph of Adarshh Pandey`} fill sizes="(max-width:600px) 92vw, (max-width:1000px) 46vw, 31vw"/></span><span className="gallery-tile-caption"><small>{item.category}</small>{item.caption}</span><span className="gallery-tile-icon" aria-hidden="true"><Expand size={16}/></span></button>)}</div>
  <dialog className="gallery-overlay" ref={dialog} aria-label="Image viewer" onCancel={event=>{event.preventDefault();close()}} onKeyDown={event=>{if(event.key==='ArrowRight')move(1);if(event.key==='ArrowLeft')move(-1)}} onTouchStart={event=>{touch.current=event.touches[0].clientX}} onTouchEnd={event=>{if(touch.current===null)return;const dx=event.changedTouches[0].clientX-touch.current;touch.current=null;if(Math.abs(dx)>50)move(dx<0?1:-1)}}>
   <button className="gallery-close" onClick={close} aria-label="Close image viewer"><X/></button>
   {photo&&<><button className="gallery-nav" onClick={()=>move(-1)} aria-label="Previous image"><ArrowLeft/></button><figure><div className="gallery-stage"><Image key={photo.src} src={photo.src} alt={photo.caption||`${photo.category} photograph of Adarshh Pandey`} fill sizes="90vw"/></div><figcaption>{photo.caption&&<span>{photo.caption}</span>}<small>{photo.category} · {selected+1} of {list.length}</small></figcaption></figure><button className="gallery-nav" onClick={()=>move(1)} aria-label="Next image"><ArrowRight/></button></>}
  </dialog>
 </>;
}
