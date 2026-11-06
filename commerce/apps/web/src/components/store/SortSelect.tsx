'use client';
/** Sort menu: submits its form as soon as a choice is made (the form still works without JavaScript via Apply). */
export function SortSelect({value, options, form}: {value: string; options: readonly (readonly [string, string])[]; form: string}) {
  return (
    <label className="row" style={{gap: 6}}><span className="sr">Sort</span>
      <select className="sel" name="sort" form={form} defaultValue={value} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
