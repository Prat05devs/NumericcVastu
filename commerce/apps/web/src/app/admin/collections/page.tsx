'use client';
import {useResource, Loading, Table, SpecForm, Action} from '@/components/admin/kit';
import {post} from '@/lib/client';
import {label} from '@/lib/format';

type C = {id: string; slug: string; title: string; status: string; _count: {products: number}};
type P = {id: string; title: string; status: string};
export default function Collections() {
  const {data, error, loading, reload} = useResource<C[]>('/admin/collections');
  const {data: products} = useResource<P[]>('/admin/products?status=PUBLISHED');
  return (
    <div className="stack"><h1>Collections</h1><p className="muted small">Curated groups (e.g. “Diwali edit”, “For new beginnings”) with their own page at /collections/&lt;slug&gt;.</p><Loading error={error} loading={loading} />
      <Table rows={data} cols={[['Title', (c) => c.title], ['Page', (c) => <a href={`/collections/${c.slug}`} target="_blank">/collections/{c.slug}</a>], ['Products', (c) => c._count.products], ['Status', (c) => label(c.status)], ['', (c) => <Action label={c.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'} className="btn small ghost" method="PATCH" path={`/admin/collections/${c.id}`} body={{status: c.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'}} onDone={reload} />]]} />
      {products && <div className="card"><h2>New collection</h2><SpecForm initial={{status: 'DRAFT', productIds: []}} specs={[{key: 'title', label: 'Title', type: 'text'}, {key: 'slug', label: 'URL slug', type: 'text'}, {key: 'description', label: 'Description', type: 'textarea'}, {key: 'seoDescription', label: 'SEO description', type: 'text'}, {key: 'status', label: 'Status', type: 'select', options: [['DRAFT', 'Draft'], ['PUBLISHED', 'Published']]}]}
        onSubmit={async (v) => { const ids = prompt(`Product numbers to include (comma separated):\n${products.map((p, i) => `${i + 1}. ${p.title}`).join('\n')}`) ?? ''; const productIds = ids.split(',').map((x) => products[Number(x.trim()) - 1]?.id).filter(Boolean); const r = await post('/admin/collections', {...v, productIds}); if (r.ok) reload(); return r; }} submitLabel="Create collection" /></div>}
    </div>
  );
}
