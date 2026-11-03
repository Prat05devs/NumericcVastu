'use client';
import {useState} from 'react';
import {useResource, Loading, Table, SpecForm, Action} from '@/components/admin/kit';
import {useCan} from '@/components/admin/Shell';
import {call, post} from '@/lib/client';
import {date, label} from '@/lib/format';

type Page = {id: string; slug: string; title: string; kind: string; status: string; version: number; bodyBlocksJson: {type: string; text: string; items?: string[]}[]; seoTitle: string | null; seoDescription: string | null; legalApprovedBy: string | null; updatedAt: string};
type Article = {id: string; slug: string; title: string; summary: string; body: string; author: string; status: string; updatedAt: string};
type Review = {id: string; rating: number; body: string; authorName: string; product: {title: string}};

/** Plain-text block editor: "## " heading, "- " list item, "? question" + following lines for FAQ answers, "! " callout. */
const toText = (blocks: Page['bodyBlocksJson']) => blocks.map((b) => b.type === 'heading' ? `## ${b.text}` : b.type === 'list' ? (b.items ?? []).map((i) => `- ${i}`).join('\n') : b.type === 'faq' ? `? ${b.text}\n${(b.items ?? []).join('\n')}` : b.type === 'callout' ? `! ${b.text}` : b.text).join('\n\n');
const toBlocks = (text: string) => text.split(/\n{2,}/).map((chunk) => {
  const c = chunk.trim();
  if (c.startsWith('## ')) return {type: 'heading', text: c.slice(3)};
  if (c.startsWith('! ')) return {type: 'callout', text: c.slice(2)};
  if (c.startsWith('? ')) { const [q, ...a] = c.split('\n'); return {type: 'faq', text: q!.slice(2), items: a}; }
  if (c.split('\n').every((l) => l.startsWith('- '))) return {type: 'list', text: '', items: c.split('\n').map((l) => l.slice(2))};
  return {type: 'paragraph', text: c};
}).filter((b) => b.text || b.items?.length);

export default function Content() {
  const can = useCan();
  const pages = useResource<Page[]>('/admin/cms/pages');
  const articles = useResource<Article[]>('/admin/articles');
  const reviews = useResource<Review[]>('/admin/reviews');
  const [page, setPage] = useState<Page | null>(null);
  const [text, setText] = useState('');
  const [approver, setApprover] = useState('');
  const [msg, setMsg] = useState('');
  async function save(publish: boolean) {
    if (!page) return;
    const r = await call('PATCH', `/admin/cms/pages/${page.id}`, {version: page.version, bodyBlocks: toBlocks(text), ...(publish && {status: 'PUBLISHED'}), ...(approver && {legalApprovedBy: approver})});
    setMsg(r.ok ? (publish ? 'Published.' : 'Saved.') : r.error.message);
    if (r.ok) { setPage(null); pages.reload(); }
  }
  return (
    <div className="stack">
      <h1>Pages, guides & reviews</h1>
      <section className="stack"><h2>Pages & policies</h2>
        <div className="alert warn small">Policies (shipping, returns, privacy, terms, partner terms) are published only by the owner and only after a named legal reviewer has approved the exact text. Nothing is pre-written for you.</div>
        <Loading error={pages.error} loading={pages.loading} />
        <Table rows={pages.data} cols={[['Page', (p) => `${p.title} (/${p.kind === 'POLICY' ? 'policies/' : ''}${p.slug})`], ['Kind', (p) => p.kind], ['Status', (p) => label(p.status)], ['Legal approval', (p) => p.legalApprovedBy ?? '—'], ['Updated', (p) => date(p.updatedAt)], ['', (p) => <button className="btn small ghost" onClick={() => { setPage(p); setText(toText(p.bodyBlocksJson)); setApprover(p.legalApprovedBy ?? ''); setMsg(''); }}>Edit</button>]]} />
        {page && <div className="card stack"><h3>Editing {page.title}</h3>
          <p className="small muted">Blank line = new block. “## ” heading · “- ” list items · “? Question” followed by answer lines · “! ” highlighted note.</p>
          <textarea rows={16} value={text} onChange={(e) => setText(e.target.value)} />
          {page.kind === 'POLICY' && <label>Approved by (legal reviewer’s name / firm)<input value={approver} onChange={(e) => setApprover(e.target.value)} /></label>}
          {msg && <p className="small">{msg}</p>}
          <div className="row"><button className="btn ghost" onClick={() => save(false)}>Save draft</button>{(page.kind !== 'POLICY' || can('settings.write')) && <button className="btn" onClick={() => save(true)}>Publish</button>}<button className="btn small ghost" onClick={() => setPage(null)}>Close</button></div>
        </div>}
        <div className="card"><h3>New page</h3><SpecForm initial={{kind: 'POLICY'}} specs={[{key: 'title', label: 'Title', type: 'text'}, {key: 'slug', label: 'Slug (e.g. returns-policy)', type: 'text'}, {key: 'kind', label: 'Kind', type: 'select', options: [['POLICY', 'Policy'], ['PAGE', 'Page']]}]} submitLabel="Create draft" onSubmit={async (v) => { const r = await post('/admin/cms/pages', v); if (r.ok) pages.reload(); return r; }} /></div>
      </section>
      <section className="stack"><h2>Guides</h2>
        <Table rows={articles.data} cols={[['Guide', (a) => a.title], ['Status', (a) => label(a.status)], ['', (a) => <Action label={a.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'} className="btn small ghost" method="PATCH" path={`/admin/articles/${a.id}`} body={{status: a.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'}} onDone={articles.reload} />]]} />
        <div className="card"><h3>New guide</h3><SpecForm initial={{status: 'DRAFT', author: 'Adarshh Panndey'}} specs={[{key: 'title', label: 'Title', type: 'text'}, {key: 'slug', label: 'Slug', type: 'text'}, {key: 'summary', label: 'Summary', type: 'text'}, {key: 'body', label: 'Body (blank line between paragraphs)', type: 'textarea'}, {key: 'author', label: 'Author', type: 'text'}, {key: 'status', label: 'Status', type: 'select', options: [['DRAFT', 'Draft'], ['PUBLISHED', 'Published']]}]} submitLabel="Save guide" onSubmit={async (v) => { const r = await post('/admin/articles', v); if (r.ok) articles.reload(); return r; }} /></div>
      </section>
      <section className="stack"><h2>Reviews awaiting moderation</h2>
        <Table rows={reviews.data} cols={[['Product', (r) => r.product.title], ['Rating', (r) => `${r.rating}★`], ['Review', (r) => r.body], ['By', (r) => r.authorName], ['', (r) => <div className="row"><Action label="Approve" method="PATCH" path={`/admin/reviews/${r.id}`} body={{status: 'APPROVED'}} onDone={reviews.reload} /><Action label="Reject" className="btn small ghost" method="PATCH" path={`/admin/reviews/${r.id}`} body={() => ({status: 'REJECTED', moderation: prompt('Reason') ?? ''})} onDone={reviews.reload} /></div>]]} empty="No reviews waiting." />
      </section>
    </div>
  );
}
