'use client';
import {use, useMemo, useState} from 'react';
import {useResource, Loading, Action, Table} from '@/components/admin/kit';
import {useCan} from '@/components/admin/Shell';
import {call, post} from '@/lib/client';
import {inr, label, paiseToRupees, rupeesToPaise} from '@/lib/format';

type AttrDef = {id: string; code: string; label: string; type: string; unit: string | null; required: boolean; options: {value: string; label: string}[]};
type Cat = {id: string; parentId: string | null; slug: string; title: string; kind: string; attributes: AttrDef[]};
type Val = {definition: {code: string}; valueText: string | null; valueNumber: string | null; variantId: string | null};
type P = {
  id: string; title: string; slug: string; status: string; version: number; productType: string; shortDescription: string; body: string; seoTitle: string | null; seoDescription: string | null; taxGroup: string | null; returnEligible: boolean | null; isDemo: boolean; categoryId: string;
  attributeValues: Val[]; media: {id: string; url: string; altText: string; authorized: boolean}[];
  variants: {id: string; sku: string; title: string; pricePaise: string; compareAtPaise: string | null; weightG: number; uniqueSpecimen: boolean; status: string; inventory: {onHandQty: number; reservedQty: number; version: number} | null; attributeValues: Val[]; certificates: {reportNo: string; verifiedStatus: string}[]}[];
  publishChecks: {code: string; ok: boolean; message: string}[];
};
const valueOf = (v: Val | undefined) => v?.valueText ?? v?.valueNumber ?? '';
const VARIANT_LEVEL = new Set(['gemstone_mineral', 'variety', 'carat_weight', 'ratti_weight', 'shape', 'treatment', 'gemstone_origin', 'color']);

function AttrField({def, value, onChange}: {def: AttrDef; value: string; onChange: (v: string) => void}) {
  return <label>{def.label}{def.unit ? ` (${def.unit})` : ''}{def.required ? ' *' : ''}{def.options.length
    ? <select value={value.toLowerCase()} onChange={(e) => onChange(def.options.find((o) => o.value === e.target.value)?.label ?? e.target.value)}><option value="">—</option>{def.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
    : <input value={value} inputMode={def.type === 'INT' || def.type === 'DECIMAL' ? 'decimal' : undefined} onChange={(e) => onChange(e.target.value)} />}</label>;
}

export default function ProductEditor({params}: {params: Promise<{id: string}>}) {
  const {id} = use(params);
  const can = useCan();
  const {data: p, error, loading, reload} = useResource<P>(`/admin/products/${id}`);
  const {data: cats} = useResource<Cat[]>('/admin/categories');
  const defs = useMemo(() => {
    if (!p || !cats) return [];
    const chain: Cat[] = []; let c = cats.find((x) => x.id === p.categoryId);
    while (c) { chain.push(c); c = cats.find((x) => x.id === c!.parentId); }
    return chain.flatMap((x) => x.attributes);
  }, [p, cats]);
  if (!p) return <Loading error={error} loading={loading} />;
  return (
    <div className="stack">
      <div className="row spread"><h1>{p.title}</h1><span className="badge">{label(p.status)}</span>{p.isDemo && <span className="badge demo">DEMO</span>}</div>
      <Checklist p={p} reload={reload} canPublish={can('catalogue.publish')} />
      <Details key={p.version} p={p} defs={defs.filter((d) => !VARIANT_LEVEL.has(d.code))} reload={reload} />
      <Variants p={p} defs={defs.filter((d) => VARIANT_LEVEL.has(d.code))} reload={reload} canStock={can('inventory.adjust')} />
      <Photos p={p} reload={reload} />
    </div>
  );
}

function Checklist({p, reload, canPublish}: {p: P; reload: () => void; canPublish: boolean}) {
  const failing = p.publishChecks.filter((c) => !c.ok);
  return (
    <div className="card">
      <h2>Publish checklist</h2>
      <ul>{p.publishChecks.map((c) => <li key={c.code} className={c.ok ? 'ok' : 'err'}>{c.ok ? '✓' : '✗'} {c.message}</li>)}</ul>
      {canPublish && <div className="row">{p.status !== 'PUBLISHED' ? <Action label="Publish" disabled={failing.length > 0} path={`/admin/products/${p.id}/publish`} onDone={reload} /> : <Action label="Unpublish" className="btn small ghost" path={`/admin/products/${p.id}/unpublish`} body={{archive: false}} onDone={reload} />}<Action label="Archive" className="btn small ghost" confirm="Archive this product?" path={`/admin/products/${p.id}/unpublish`} body={{archive: true}} onDone={reload} /></div>}
    </div>
  );
}

function Details({p, defs, reload}: {p: P; defs: AttrDef[]; reload: () => void}) {
  const [f, setF] = useState({title: p.title, shortDescription: p.shortDescription, body: p.body, seoTitle: p.seoTitle ?? '', seoDescription: p.seoDescription ?? '', taxGroup: p.taxGroup ?? '', returnEligible: p.returnEligible === null ? '' : String(p.returnEligible)});
  const [attrs, setAttrs] = useState<Record<string, string>>(Object.fromEntries(defs.map((d) => [d.code, valueOf(p.attributeValues.find((v) => v.definition.code === d.code && !v.variantId))])));
  const [msg, setMsg] = useState('');
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const attributes = Object.fromEntries(Object.entries(attrs).filter(([, v]) => v !== ''));
    const r = await call('PATCH', `/admin/products/${p.id}`, {version: p.version, title: f.title, shortDescription: f.shortDescription, body: f.body, ...(f.seoTitle && {seoTitle: f.seoTitle}), ...(f.seoDescription && {seoDescription: f.seoDescription}), taxGroup: f.taxGroup || null, ...(f.returnEligible !== '' && {returnEligible: f.returnEligible === 'true'}), attributes});
    setMsg(r.ok ? 'Saved.' : r.error.message); if (r.ok) reload();
  }
  return (
    <form className="card stack" onSubmit={save}>
      <h2>Details</h2>
      <label>Title<input value={f.title} onChange={(e) => setF({...f, title: e.target.value})} /></label>
      <label>Short description<input value={f.shortDescription} onChange={(e) => setF({...f, shortDescription: e.target.value})} maxLength={500} /></label>
      <label>Description (truthful: origin, treatment, natural/lab status; no guaranteed outcomes)<textarea value={f.body} onChange={(e) => setF({...f, body: e.target.value})} rows={8} /></label>
      <div className="grid" style={{gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))'}}>
        {defs.map((d) => <AttrField key={d.code} def={d} value={attrs[d.code] ?? ''} onChange={(v) => setAttrs({...attrs, [d.code]: v})} />)}
        <label>Tax group<input value={f.taxGroup} onChange={(e) => setF({...f, taxGroup: e.target.value.toUpperCase()})} placeholder="as defined in Settings → Tax" /></label>
        <label>Returnable?<select value={f.returnEligible} onChange={(e) => setF({...f, returnEligible: e.target.value})}><option value="">Not set</option><option value="true">Yes, under the returns policy</option><option value="false">No</option></select></label>
      </div>
      <label>SEO title<input value={f.seoTitle} maxLength={70} onChange={(e) => setF({...f, seoTitle: e.target.value})} /></label>
      <label>SEO description<input value={f.seoDescription} maxLength={170} onChange={(e) => setF({...f, seoDescription: e.target.value})} /></label>
      {msg && <p className={msg === 'Saved.' ? 'ok' : 'err'}>{msg}</p>}
      <div><button className="btn">Save details</button></div>
    </form>
  );
}

function Variants({p, defs, reload, canStock}: {p: P; defs: AttrDef[]; reload: () => void; canStock: boolean}) {
  const blank = {id: '', sku: '', title: '', rupees: '', compareRupees: '', weightGrams: 50, uniqueSpecimen: false, attrs: {} as Record<string, string>};
  const [v, setV] = useState(blank);
  const [msg, setMsg] = useState('');
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await post(`/admin/products/${p.id}/variants`, {...(v.id && {id: v.id}), sku: v.sku, title: v.title, pricePaise: rupeesToPaise(v.rupees) ?? '', compareAtPaise: v.compareRupees ? rupeesToPaise(v.compareRupees) : null, weightGrams: Number(v.weightGrams), uniqueSpecimen: v.uniqueSpecimen, attributes: Object.fromEntries(Object.entries(v.attrs).filter(([, x]) => x !== ''))});
    setMsg(r.ok ? 'Saved.' : r.error.message); if (r.ok) { setV(blank); reload(); }
  }
  return (
    <div className="card stack">
      <h2>Variants, price & stock</h2>
      <Table rows={p.variants} cols={[['SKU', (x) => x.sku], ['Option', (x) => x.title], ['Price', (x) => inr(x.pricePaise)], ['On hand / held', (x) => `${x.inventory?.onHandQty ?? 0} / ${x.inventory?.reservedQty ?? 0}`],
        ['Stock', (x) => canStock && x.inventory ? <Action label="Adjust…" className="btn small ghost" method="PATCH" path={`/admin/inventory/${x.id}`} body={() => ({delta: Number(prompt('Change in stock (e.g. 5 received, -1 damaged)') ?? 0), reason: 'RECEIPT', note: 'Adjusted from product page', expectedVersion: x.inventory!.version})} onDone={reload} /> : null],
        ['', (x) => <button className="btn small ghost" onClick={() => setV({id: x.id, sku: x.sku, title: x.title, rupees: paiseToRupees(x.pricePaise), compareRupees: paiseToRupees(x.compareAtPaise), weightGrams: x.weightG, uniqueSpecimen: x.uniqueSpecimen, attrs: Object.fromEntries(defs.map((d) => [d.code, valueOf(x.attributeValues.find((a) => a.definition.code === d.code))]))})}>Edit</button>]]} empty="No variants yet." />
      <form className="stack" onSubmit={save}>
        <h3>{v.id ? `Edit ${v.sku}` : 'Add a variant'}</h3>
        <div className="grid" style={{gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))'}}>
          <label>SKU<input value={v.sku} onChange={(e) => setV({...v, sku: e.target.value.toUpperCase()})} required /></label>
          <label>Option name<input value={v.title} onChange={(e) => setV({...v, title: e.target.value})} placeholder="e.g. 8 mm, Medium" required /></label>
          <label>Price (₹)<input value={v.rupees} onChange={(e) => setV({...v, rupees: e.target.value})} inputMode="decimal" required /></label>
          <label>Compare-at (₹, optional)<input value={v.compareRupees} onChange={(e) => setV({...v, compareRupees: e.target.value})} inputMode="decimal" /></label>
          <label>Weight (g)<input type="number" min={1} value={v.weightGrams} onChange={(e) => setV({...v, weightGrams: Number(e.target.value)})} /></label>
          {defs.map((d) => <AttrField key={d.code} def={d} value={v.attrs[d.code] ?? ''} onChange={(x) => setV({...v, attrs: {...v.attrs, [d.code]: x}})} />)}
        </div>
        <label className="check"><input type="checkbox" checked={v.uniqueSpecimen} onChange={(e) => setV({...v, uniqueSpecimen: e.target.checked})} /> One-of-a-kind specimen (stock max 1; the photographed piece is shipped)</label>
        {msg && <p className={msg === 'Saved.' ? 'ok' : 'err'}>{msg}</p>}
        <div className="row"><button className="btn small">{v.id ? 'Save variant' : 'Add variant'}</button>{v.id && <button type="button" className="btn small ghost" onClick={() => setV(blank)}>Cancel</button>}</div>
      </form>
    </div>
  );
}

function Photos({p, reload}: {p: P; reload: () => void}) {
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [msg, setMsg] = useState('');
  async function upload(e: React.FormEvent) {
    e.preventDefault(); if (!file) return; setMsg('Uploading…');
    const pre = await post<{url: string; headers: Record<string, string>; objectKey: string}>(`/admin/products/${p.id}/media/presign`, {contentType: file.type, purpose: 'product'});
    if (!pre.ok) return setMsg(pre.error.message);
    const csrf = decodeURIComponent(document.cookie.split('; ').find((c) => c.startsWith('sc_csrf='))?.slice(8) ?? '');
    const sameOrigin = pre.data.url.includes('/api/v1/admin/uploads/');
    const target = sameOrigin ? pre.data.url.slice(pre.data.url.indexOf('/api/v1/')) : pre.data.url;
    const put = await fetch(target, {method: 'PUT', body: file, headers: {...pre.data.headers, ...(sameOrigin && {'X-CSRF-Token': csrf})}, credentials: sameOrigin ? 'include' : 'omit'});
    if (!put.ok) return setMsg('Upload failed.');
    const img = await createImageBitmap(file).catch(() => null);
    const r = await post(`/admin/products/${p.id}/media`, {objectKey: pre.data.objectKey, altText: alt, authorized, ...(img && {width: img.width, height: img.height}), position: p.media.length});
    setMsg(r.ok ? 'Added.' : r.error.message); if (r.ok) { setFile(null); setAlt(''); setAuthorized(false); reload(); }
  }
  return (
    <div className="card stack">
      <h2>Photos</h2>
      <div className="grid cards">{p.media.map((m) => <figure key={m.id} style={{margin: 0}}><img src={m.url} alt={m.altText} /><figcaption className="small">{m.altText}</figcaption><Action label="Remove" className="btn small ghost" method="DELETE" path={`/admin/media/${m.id}`} confirm="Remove this photo?" onDone={reload} /></figure>)}</div>
      <form className="stack" onSubmit={upload}>
        <label>Photo (JPEG, PNG, WebP or AVIF, up to 10 MB)<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
        <label>Alt text (describe the photo)<input value={alt} onChange={(e) => setAlt(e.target.value)} minLength={5} required /></label>
        <label className="check"><input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} /> This is our own original photo of this item (or properly licensed). No competitor or stock images.</label>
        {msg && <p className="small" role="status">{msg}</p>}
        <div><button className="btn small" disabled={!file || !authorized}>Upload photo</button></div>
      </form>
    </div>
  );
}
