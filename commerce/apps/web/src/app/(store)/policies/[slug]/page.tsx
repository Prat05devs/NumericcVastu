import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {apiGet} from '@/lib/server-api';
import {date} from '@/lib/format';
import {Blocks, type Block} from '@/components/store/Blocks';
import {SHOP} from '@/components/store/ui';

type Page = {title: string; blocks: Block[]; seo: {title: string; description: string | null}; updatedAt: string};
const PAGES: [string, string][] = [['shipping-policy', 'Delivery'], ['returns-policy', 'Returns and refunds'], ['privacy-policy', 'Privacy'], ['terms', 'Terms']];
const load = (slug: string) => apiGet<Page>(`/pages/${slug}`, {revalidate: 300, tags: ['cms']});
export async function generateMetadata({params}: {params: Promise<{slug: string}>}): Promise<Metadata> {
  const p = (await load((await params).slug))?.data;
  return p ? {title: p.seo.title, description: p.seo.description ?? undefined} : {title: 'Policy'};
}
export default async function PolicyPage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params;
  const p = (await load(slug))?.data;
  if (!p && !PAGES.some(([s]) => s === slug)) notFound();
  return (
    <div className="w" style={{paddingTop: 30}}>
      <div className="acct">
        <nav className="side-nav" aria-label="Policies">{PAGES.map(([s, t]) => <Link key={s} href={`/policies/${s}`} aria-current={s === slug ? 'page' : undefined}>{t}</Link>)}</nav>
        <article className="article" style={{margin: 0}}>
          <h1 className="disp" style={{fontSize: 'clamp(32px,4vw,44px)'}}>{p?.title ?? PAGES.find(([s]) => s === slug)![1]}</h1>
          {slug === 'shipping-policy' && <div className="facts" style={{marginTop: 18}}><div><span>Charges</span>Included in every price</div><div><span>Payment</span>Prepaid only</div><div><span>Courier</span>Partner courier; tracking link by email</div><div><span>Coverage</span>Insured, across India</div></div>}
          {p ? <><Blocks blocks={p.blocks} /><p className="hint" style={{marginTop: 22}}>Last updated {date(p.updatedAt)}</p></>
            : <p>This page is being finalised. For any question about delivery, returns or your data, write to <a className="lnk" href={`mailto:${SHOP.email}`}>{SHOP.email}</a> or <a className="lnk" href={`https://wa.me/${SHOP.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp {SHOP.phone}</a>.</p>}
        </article>
      </div>
    </div>
  );
}
