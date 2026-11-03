import hi from './hi.json';
const lowerCase=Object.fromEntries(Object.entries(hi).map(([key,value])=>[key.toLowerCase(),value]));
const entries=Object.entries(hi).filter(([key])=>key.includes('{'));
const patterns=entries.map(([source,target])=>{
  const names=[];
  const escaped=source.split(/(\{\w+\})/).map(part=>{
    if(/^\{\w+\}$/.test(part)){names.push(part.slice(1,-1));return '(.+?)'}
    return part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  }).join('');
  return {regex:new RegExp(`^${escaped}$`),names,target};
});
/** Exact authored messages first; explicit variable templates second. Never changes unknown text. */
export function translate(text,locale='en') {
  if(locale!=='hi'||typeof text!=='string'||!/[A-Za-z]/.test(text))return text;
  const normalized=text.replace(/\s+/g,' ').trim();
  if(!normalized)return text;
  let translated=hi[normalized] ?? lowerCase[normalized.toLowerCase()];
  if(translated===undefined){
    for(const {regex,names,target}of patterns){
      const match=regex.exec(normalized);
      if(match){translated=target.replace(/\{(\w+)\}/g,(_,name)=>translate(match[names.indexOf(name)+1],locale));break}
    }
  }
  if(translated===undefined&&normalized.includes(', ')){
    const parts=normalized.split(', ');const mapped=parts.map(part=>translate(part,locale));
    if(mapped.some((part,i)=>part!==parts[i]))translated=mapped.join(', ');
  }
  if(translated===undefined)return text;
  return text.match(/^\s*/)[0]+translated+text.match(/\s*$/)[0];
}
