'use client';
import {useResource, Loading, Table, SpecForm} from '@/components/admin/kit';
import {useCan} from '@/components/admin/Shell';
import {post} from '@/lib/client';

type Cat = {id: string; parentId: string | null; slug: string; title: string; kind: string; status: string; storefrontId: string; attributes: {code: string; label: string; type: string; filterable: boolean; required: boolean; options: {label: string}[]}[]; _count: {products: number}};
const KINDS: [string, string][] = ['RUDRAKSHA', 'GEMSTONE', 'CRYSTAL', 'YANTRA', 'WATCH', 'COURSE', 'CONSULTATION', 'OTHER'].map((k) => [k, k]);
export default function Categories() {
  const can = useCan();
  const {data, error, loading, reload} = useResource<Cat[]>('/admin/categories');
  return (
    <div className="stack"><h1>Categories & filters</h1><Loading error={error} loading={loading} />
      <Table rows={data} cols={[['Category', (c) => <><strong>{c.title}</strong><div className="small muted">/{c.slug} · {c.storefrontId}</div></>], ['Family', (c) => c.kind], ['Parent', (c) => data?.find((x) => x.id === c.parentId)?.title ?? '—'], ['Products', (c) => c._count.products],
        ['Attributes (filters)', (c) => <div className="small">{c.attributes.map((a) => <div key={a.code}>{a.label}{a.required ? ' *' : ''}{a.filterable ? ' · filter' : ''}{a.options.length ? ` · ${a.options.map((o) => o.label).join(', ')}` : ''}</div>)}</div>]]} />
      {can('catalogue.write') && data && <div className="two">
        <div className="card"><h2>Add a category</h2><SpecForm idPrefix="cat" initial={{storefrontId: 'crystal', kind: 'CRYSTAL', status: 'ACTIVE', sortOrder: 0}} specs={[{key: 'title', label: 'Title', hint: 'Category ka naam jo shop par dikhega, jaise Rudraksha.', type: 'text'}, {key: 'slug', label: 'URL slug', hint: 'Web address ka hissa, jaise rudraksha. Chhote letters aur hyphen (-) hi.', type: 'text'}, {key: 'kind', label: 'Family', hint: 'Ye kis family mein aata hai. Isi se filters aur coupons sahi lagte hain.', type: 'select', options: KINDS}, {key: 'parentId', label: 'Parent', hint: 'Kisi badi category ke andar rakhna ho toh chuno, warna khaali.', type: 'select', options: data.map((c) => [c.id, c.title])}, {key: 'storefrontId', label: 'Storefront', hint: 'Kis shop mein dikhe. Crystal shop ke liye crystal.', type: 'select', options: [['crystal', 'Crystal shop'], ['numericcvaastu', 'Main site']]}, {key: 'intro', label: 'Intro text', hint: 'Category page ke upar 1–2 line ka intro.', type: 'textarea'}, {key: 'sortOrder', label: 'Sort order', hint: 'Chhota number pehle dikhta hai. 0, 10, 20 jaise rakho.', type: 'number'}]}
          onSubmit={async (v) => { const r = await post('/admin/categories', {...v, parentId: v['parentId'] || null}); if (r.ok) reload(); return r; }} submitLabel="Add category" /></div>
        <div className="card"><h2>Add a filter attribute</h2><SpecForm idPrefix="att" initial={{type: 'ENUM', filterable: true, options: []}} specs={[{key: 'code', label: 'Code (lower_case)', hint: 'Andar ka naam, jaise bead_size. Chhote letters aur _ (underscore).', type: 'text'}, {key: 'label', label: 'Label', hint: 'Customer ko dikhne wala naam, jaise Bead size.', type: 'text'}, {key: 'type', label: 'Type', hint: 'Choice = list se chunna, Number = naap (mm, carat), Text = kuch bhi likhna.', type: 'select', options: [['ENUM', 'Choice'], ['TEXT', 'Text'], ['INT', 'Whole number'], ['DECIMAL', 'Decimal'], ['BOOL', 'Yes/No']]}, {key: 'unit', label: 'Unit', hint: 'Naap ki unit, jaise mm, ct, g. Na ho toh khaali.', type: 'text'}, {key: 'categoryId', label: 'Category', hint: 'Ye filter kis category ke products par lagega.', type: 'select', options: data.map((c) => [c.id, c.title])}, {key: 'filterable', label: 'Show as a shop filter', hint: 'Tick karo toh shop ke filter sidebar mein dikhega.', type: 'bool'}, {key: 'required', label: 'Required before publishing', hint: 'Tick karo toh ye bhare bina product publish nahi hoga.', type: 'bool'}, {key: 'optionsText', label: 'Choices (one per line)', hint: 'Har line par ek option, jaise Nepal, Java, India.', type: 'textarea'}]}
          onSubmit={async (v) => { const r = await post('/admin/attributes', {...v, options: String(v['optionsText'] ?? '').split('\n').map((s) => s.trim()).filter(Boolean), optionsText: undefined, categoryId: v['categoryId'] || null}); if (r.ok) reload(); return r; }} submitLabel="Add attribute" /></div>
      </div>}
    </div>
  );
}
