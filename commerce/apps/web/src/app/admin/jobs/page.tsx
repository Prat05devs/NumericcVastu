'use client';
import {useState} from 'react';
import {useResource, Loading, Table, Action} from '@/components/admin/kit';
import {post} from '@/lib/client';
import {dateTime} from '@/lib/format';

type J = {outbox: Record<string, number>; webhooksLast24h: Record<string, number>; dead: {id: string; type: string; attempts: number; lastError: string | null; createdAt: string}[]};
export default function Jobs() {
  const {data, error, loading, reload} = useResource<J>('/admin/jobs');
  const [run, setRun] = useState('');
  return (
    <div className="stack"><h1>Jobs & webhooks</h1>
      <p className="small muted">Scheduled work (stock-hold expiry, unpaid-order cancellation, payment reconciliation, emails, partner approvals, tracking sync, clean-up) runs every minute from Hostinger Cron. You can run it now.</p>
      <div className="row"><button className="btn small" onClick={async () => { const r = await post('/admin/jobs/run', {}); setRun(r.ok ? JSON.stringify(r.data, null, 2) : r.error.message); reload(); }}>Run all jobs now</button></div>
      {run && <pre className="code">{run}</pre>}
      <Loading error={error} loading={loading} />
      {data && <>
        <div className="kpis">{Object.entries(data.outbox).map(([k, v]) => <div key={k} className="kpi"><b>{v}</b>{k}</div>)}{Object.entries(data.webhooksLast24h).map(([k, v]) => <div key={k} className="kpi"><b>{v}</b>webhooks {k.toLowerCase()} (24h)</div>)}</div>
        <h2>Failed jobs</h2>
        <Table rows={data.dead} cols={[['Created', (j) => dateTime(j.createdAt)], ['Type', (j) => j.type], ['Attempts', (j) => j.attempts], ['Error', (j) => <span className="small">{j.lastError}</span>], ['', (j) => <Action label="Retry" path={`/admin/jobs/${j.id}/retry`} onDone={reload} />]]} empty="No failed jobs." />
      </>}
    </div>
  );
}
