/** Exact crops of the three supplied graphic strips; no redrawn motif. */
export default function HeritageBand({kind='small',className=''}){
 return <div className={`heritage-band heritage-band-${kind} ${className}`} aria-hidden="true">{Array.from({length:48},(_,index)=><span key={index}/>)}</div>;
}
