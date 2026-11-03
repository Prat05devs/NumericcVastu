'use client';
import {Children, cloneElement, isValidElement} from 'react';
import {useLocale} from './LocaleProvider';

const textAttributes=['alt','title','placeholder','aria-label','aria-description','aria-roledescription','data-label'];
/**
 * Localizes rendered copy without changing data, routes, event handlers or form values.
 * Works with server-rendered children and client-rendered content alike. Components own
 * their render boundary; nested component implementations are never invoked here.
 * Use translate="no" for user input, quotations, brand names and external titles.
 */
function localize(node,t) {
  if(typeof node==='string')return t(node);
  if(!isValidElement(node))return node;
  if(node.props.translate==='no'||['script','style','svg','code','pre','textarea'].includes(node.type))return node;
  const props={};
  for(const attr of textAttributes)if(typeof node.props[attr]==='string')props[attr]=t(node.props[attr]);
  // An option's implicit value is its text. Preserve the original value before translating its label.
  if(node.type==='option'&&node.props.value===undefined&&typeof node.props.children==='string')props.value=node.props.children;
  if(node.props.children!==undefined)props.children=Children.map(node.props.children,child=>localize(child,t));
  return cloneElement(node,props);
}
export default function LocalizedContent({children}) {
  const {t}=useLocale();
  return Children.map(children,child=>localize(child,t));
}
