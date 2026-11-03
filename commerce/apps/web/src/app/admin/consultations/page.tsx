'use client';
import {useState} from 'react';
import {useResource, Loading, Table, Action} from '@/components/admin/kit';
import {call} from '@/lib/client';
import {dateTime, label} from '@/lib/format';

type L = {id: string; topic: string; status: string; createdAt: string};
export default function Consultations() {
  const {data, error, loading, reload} = useResource<L[]>('/admin/consultation-leads');
  const [open, setOpen] = useState<Record<string, Record<string, string>>>({});
  return <div className="stack"><h1>Consultation enquiries</h1><Loading error={error} loading={loading} />
    <Table rows={data} cols={[['Received', (l) => dateTime(l.createdAt)], ['Topic', (l) => label(l.topic)], ['Status', (l) => label(l.status)],
      ['Contact', (l) => open[l.id] ? <div className="small">{Object.entries(open[l.id]!).map(([k, v]) => <div key={k}><strong>{k}:</strong> {v}</div>)}</div> : <button className="btn small ghost" onClick={async () => { const r = await call<{contact: Record<string, string>}>('GET', `/admin/consultation-leads/${l.id}`); if (r.ok) setOpen({...open, [l.id]: r.data.contact}); }}>Open (audited)</button>],
      ['', (l) => <div className="row">{['CONTACTED', 'BOOKED', 'CLOSED'].filter((s) => s !== l.status).map((s) => <Action key={s} label={label(s)} className="btn small ghost" method="PATCH" path={`/admin/consultation-leads/${l.id}`} body={{status: s}} onDone={reload} />)}</div>]]} /></div>;
}
