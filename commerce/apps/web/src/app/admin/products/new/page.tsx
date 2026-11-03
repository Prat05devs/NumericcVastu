'use client';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {useResource} from '@/components/admin/kit';
import {post} from '@/lib/client';

type Cat = {id: string; slug: string; title: string; kind: string};
export default function NewProduct() {
  const router = useRouter();
  const {data: cats} = useResource<Cat[]>('/admin/categories');
  const [f, setF] = useState({categoryId: '', title: '', slug: '', productType: 'PRODUCT'});
  const [err, setErr] = useState('');
  const slugify = (t: string) => t.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-');
  return (
    <form className="card stack" style={{maxWidth: 620}} onSubmit={async (e) => { e.preventDefault(); const r = await post<{id: string}>('/admin/products', {...f, body: ''}); if (r.ok) router.push(`/admin/products/${r.data.id}`); else setErr(r.error.message); }}>
      <h1>New product</h1>
      <p className="small muted">Products start as drafts. Add details, original photos, variants and stock, then publish — the publish checklist tells you what is missing.</p>
      <label>Category<select value={f.categoryId} onChange={(e) => { const c = cats?.find((x) => x.id === e.target.value); setF({...f, categoryId: e.target.value, productType: c?.kind === 'WATCH' ? 'CUSTOM_REQUEST' : 'PRODUCT'}); }} required><option value="">Choose…</option>{cats?.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
      <label>Title<input value={f.title} onChange={(e) => setF({...f, title: e.target.value, slug: slugify(e.target.value)})} required /></label>
      <label>URL slug<input value={f.slug} onChange={(e) => setF({...f, slug: e.target.value})} required pattern="[a-z0-9]+(-[a-z0-9]+)*" /></label>
      {err && <p className="err">{err}</p>}
      <button className="btn">Create draft</button>
    </form>
  );
}
