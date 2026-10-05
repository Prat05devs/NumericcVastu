'use client';
import {useRef,useState} from 'react';
import {ChevronDown,CircleDot} from 'lucide-react';
export default function CourseCurriculum({modules}){
 const list=useRef(null);const [allOpen,setAllOpen]=useState(false);
 const sync=()=>setAllOpen([...list.current.querySelectorAll('details')].every(item=>item.open));
 const toggleAll=()=>{const next=!allOpen;list.current.querySelectorAll('details').forEach(item=>{item.open=next});setAllOpen(next)};
 const topics=modules.reduce((sum,module)=>sum+module.topics.length,0);
 return <div className="curriculum"><div className="curriculum-bar"><span>{modules.length} sections · {topics} listed topics</span><button type="button" onClick={toggleAll} aria-expanded={allOpen}>{allOpen?'Collapse all sections':'Expand all sections'}</button></div><div ref={list} className="curriculum-list">{modules.map((module,index)=><details key={module.title} open={index===0} onToggle={sync}><summary><ChevronDown size={18} aria-hidden="true"/><span>{module.title}</span><small>{module.topics.length} {module.topics.length===1?'topic':'topics'}</small></summary><div className="curriculum-body"><p>{module.summary}</p><ul>{module.topics.map(topic=><li key={topic}><CircleDot size={14} aria-hidden="true"/>{topic}</li>)}</ul></div></details>)}</div></div>;
}
