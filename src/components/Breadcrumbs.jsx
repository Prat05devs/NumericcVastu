import LocalizedContent from '../i18n/LocalizedContent';
import Link from 'next/link';
import {breadcrumbs} from '../lib/schema';
import {jsonLdHtml} from '../lib/site';

/**
 * Visible breadcrumb trail plus the matching BreadcrumbList structured data, so Google can show the path in results.
 * items: [label, path] pairs after Home; the last one is the current page.
 */
export default function Breadcrumbs({items, className = 'breadcrumbs'}) {
  return <LocalizedContent><nav className={className} aria-label="Breadcrumb">
    <Link href="/">Home</Link>
    {items.map(([label, path], i) => <span key={path}>{'/ '}{i === items.length - 1 ? <span aria-current="page">{label}</span> : <Link href={path}>{label}</Link>}</span>)}
  </nav><script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(breadcrumbs(items))}/></LocalizedContent>;
}
