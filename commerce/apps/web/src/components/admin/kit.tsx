'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {call, newKey, type Result} from '@/lib/client';
import {paiseToRupees, rupeesToPaise} from '@/lib/format';

/** Loads an admin resource and exposes reload; errors are shown inline, never swallowed. */
export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [meta, setMeta] = useState<Record<string, unknown>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    const r = await call<T>('GET', path);
    if (r.ok) { setData(r.data); setMeta(r.meta); setError(''); } else setError(r.error.message);
    setLoading(false);
  }, [path]);
  useEffect(() => { void reload(); }, [reload]);
  return {data, meta, error, loading, reload};
}

export function Loading({error, loading}: {error: string; loading: boolean}) {
  if (error) return <div className="alert bad" role="alert">{error}</div>;
  return loading ? <p className="muted">Loading…</p> : null;
}

/** A write with confirmation, idempotency key (stable across retries of this action) and inline outcome. */
export function Action({label, method = 'POST', path, body, confirm: confirmText, onDone, className = 'btn small', idempotent, disabled}: {label: string; method?: 'POST' | 'PATCH' | 'PUT' | 'DELETE'; path: string; body?: unknown | (() => unknown); confirm?: string; onDone?: (r: Result<unknown>) => void; className?: string; idempotent?: boolean; disabled?: boolean}) {
  const [state, setState] = useState<{busy?: boolean; msg?: string; ok?: boolean}>({});
  const key = useRef(newKey());
  async function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    setState({busy: true});
    const r = await call(method, path, typeof body === 'function' ? (body as () => unknown)() : body ?? {}, idempotent ? {'Idempotency-Key': key.current} : {});
    if (r.ok) key.current = newKey();
    setState(r.ok ? {ok: true, msg: 'Done'} : {msg: r.error.message + (Array.isArray(r.error.details) ? ` — ${(r.error.details as {message?: string; path?: string}[]).map((d) => d.message ?? d.path).join('; ')}` : '')});
    onDone?.(r);
  }
  return <span className="row" style={{gap: '.4rem', display: 'inline-flex'}}><button className={className} onClick={run} disabled={state.busy || disabled}>{state.busy ? '…' : label}</button>{state.msg && <span className={`small ${state.ok ? 'ok' : 'err'}`} role="status">{state.msg}</span>}</span>;
}

export function Table<T>({rows, cols, empty = 'Nothing here yet.'}: {rows: T[] | null | undefined; cols: [string, (r: T) => React.ReactNode][]; empty?: string}) {
  if (!rows) return null;
  if (!rows.length) return <p className="muted">{empty}</p>;
  return <div className="tablewrap"><table className="data"><thead><tr>{cols.map(([h]) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{cols.map(([h, f]) => <td key={h} data-label={h}>{f(r)}</td>)}</tr>)}</tbody></table></div>;
}

// ── Schema-driven forms: settings groups and editors are declared as field specs and rendered by one component.
export type Spec =
  | {key: string; label: string; type: 'text' | 'textarea' | 'date' | 'datetime' | 'email' | 'url'; hint?: string; required?: boolean}
  | {key: string; label: string; type: 'number'; hint?: string; min?: number; max?: number}
  | {key: string; label: string; type: 'bool'; hint?: string}
  | {key: string; label: string; type: 'select'; options: [string, string][]; hint?: string}
  | {key: string; label: string; type: 'money'; hint?: string; nullable?: boolean} // rupees in the UI, paise string on the wire
  | {key: string; label: string; type: 'percent'; hint?: string} // percent in the UI, basis points on the wire
  | {key: string; label: string; type: 'map'; keyLabel: string; valueType: 'percent' | 'text'; hint?: string} // Record<string, …>
  | {key: string; label: string; type: 'rows'; fields: Spec[]; hint?: string; addLabel?: string};

type Obj = Record<string, unknown>;
export const get = (o: Obj, k: string) => k.split('.').reduce<unknown>((v, p) => (v as Obj | undefined)?.[p], o);
export function set(o: Obj, k: string, v: unknown): Obj {
  const [h, ...rest] = k.split('.');
  return {...o, [h!]: rest.length ? set(((o[h!] as Obj) ?? {}), rest.join('.'), v) : v};
}

function Input({spec, value, onChange, id}: {spec: Spec; value: unknown; onChange: (v: unknown) => void; id: string}) {
  switch (spec.type) {
    case 'textarea': return <textarea id={id} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />;
    case 'bool': return <input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />;
    case 'number': return <input id={id} type="number" min={spec.min} max={spec.max} value={value === undefined || value === null ? '' : String(value)} onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} />;
    case 'select': return <select id={id} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}><option value="">—</option>{spec.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>;
    case 'money': return <input id={id} inputMode="decimal" placeholder="₹" defaultValue={paiseToRupees(value as string | null)} onBlur={(e) => onChange(e.target.value.trim() === '' ? (spec.nullable ? null : undefined) : rupeesToPaise(e.target.value) ?? value)} />;
    case 'percent': return <input id={id} inputMode="decimal" placeholder="%" defaultValue={value === undefined || value === null ? '' : String(Number(value) / 100)} onBlur={(e) => onChange(e.target.value === '' ? null : Math.round(Number(e.target.value) * 100))} />;
    case 'datetime': return <input id={id} type="datetime-local" value={value ? new Date(String(value)).toISOString().slice(0, 16) : ''} onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)} />;
    case 'map': {
      const entries = Object.entries((value as Obj) ?? {});
      return <div className="rows">{entries.map(([k, v], i) => (
        <div key={i} className="rowedit">
          <label>{spec.keyLabel}<input defaultValue={k} onBlur={(e) => { const next: Obj = {}; entries.forEach(([kk, vv], j) => { next[j === i ? e.target.value : kk] = vv; }); onChange(next); }} /></label>
          <label>{spec.valueType === 'percent' ? 'Rate %' : 'Value'}<input defaultValue={spec.valueType === 'percent' ? String(Number(v) / 100) : String(v)} onBlur={(e) => onChange({...(value as Obj), [k]: spec.valueType === 'percent' ? Math.round(Number(e.target.value) * 100) : e.target.value})} /></label>
          <button type="button" className="btn small ghost" onClick={() => { const next = {...(value as Obj)}; delete next[k]; onChange(next); }}>Remove</button>
        </div>
      ))}<button type="button" className="btn small ghost" onClick={() => onChange({...(value as Obj), [`NEW_${entries.length + 1}`]: 0})}>Add</button></div>;
    }
    case 'rows': {
      const rows = (value as Obj[]) ?? [];
      return <div className="rows">{rows.map((row, i) => (
        <div key={i} className="rowedit">
          {spec.fields.map((f) => <div key={f.key}><label htmlFor={`${id}-${i}-${f.key}`}>{f.label}</label><Input spec={f} id={`${id}-${i}-${f.key}`} value={get(row, f.key)} onChange={(v) => onChange(rows.map((r, j) => (j === i ? set(r, f.key, v) : r)))} /></div>)}
          <button type="button" className="btn small ghost" onClick={() => onChange(rows.filter((_, j) => j !== i))}>Remove</button>
        </div>
      ))}<button type="button" className="btn small ghost" onClick={() => onChange([...rows, {}])}>{spec.addLabel ?? 'Add row'}</button></div>;
    }
    default: return <input id={id} type={spec.type === 'date' ? 'date' : spec.type === 'email' ? 'email' : 'text'} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} required={'required' in spec && spec.required} />;
  }
}

/** Renders specs, submits, and maps API validation errors back to fields. */
export function SpecForm({specs, initial, submitLabel = 'Save', onSubmit, idPrefix = 'f'}: {specs: Spec[]; initial: Obj; submitLabel?: string; onSubmit: (value: Obj) => Promise<Result<unknown>>; idPrefix?: string}) {
  const [value, setValue] = useState<Obj>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ok: boolean; text: string} | null>(null);
  useEffect(() => { setValue(initial); }, [initial]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErrors({}); setMsg(null);
    const r = await onSubmit(value);
    if (r.ok) return setMsg({ok: true, text: 'Saved.'});
    if (Array.isArray(r.error.details)) setErrors(Object.fromEntries((r.error.details as {path: string; message: string}[]).map((d) => [d.path, d.message])));
    setMsg({ok: false, text: r.error.message});
  }
  return (
    <form onSubmit={submit} className="stack">
      {specs.map((s) => (
        <div key={s.key} className="field">
          {s.type === 'bool' ? <label className="check"><Input spec={s} id={`${idPrefix}-${s.key}`} value={get(value, s.key)} onChange={(v) => setValue(set(value, s.key, v))} /> {s.label}</label>
            : <><label htmlFor={`${idPrefix}-${s.key}`}>{s.label}</label><Input spec={s} id={`${idPrefix}-${s.key}`} value={get(value, s.key)} onChange={(v) => setValue(set(value, s.key, v))} /></>}
          {s.hint && <div className="hint">{s.hint}</div>}
          {Object.entries(errors).filter(([p]) => p === s.key || p.startsWith(`${s.key}.`)).map(([p, m]) => <div key={p} className="err">{p !== s.key ? `${p}: ` : ''}{m}</div>)}
        </div>
      ))}
      {msg && <p className={msg.ok ? 'ok' : 'err'} role="status">{msg.text}</p>}
      <div><button className="btn">{submitLabel}</button></div>
    </form>
  );
}
