'use client';
import {useState} from 'react';
import {useResource, Loading, Table} from '@/components/admin/kit';
import {dateTime} from '@/lib/format';

type A = {id: string; createdAt: string; actorId: string | null; action: string; entityType: string; entityId: string | null; changesRedactedJson: unknown};
export default function Audit() {
  const [entityType, setType] = useState('');
  const [before, setBefore] = useState<string | undefined>();
  const {data, error, loading} = useResource<A[]>(`/admin/audit?${new URLSearchParams({...(entityType && {entityType}), ...(before && {before})})}`);
  return (
    <div className="stack"><h1>Audit log</h1><p className="small muted">Every staff action, with sensitive values redacted.</p>
      <input aria-label="Entity type" placeholder="Filter by entity (order, product, setting…)" value={entityType} onChange={(e) => { setType(e.target.value); setBefore(undefined); }} style={{maxWidth: 320}} />
      <Loading error={error} loading={loading} />
      <Table rows={data} cols={[['When', (a) => dateTime(a.createdAt)], ['Action', (a) => a.action], ['Entity', (a) => `${a.entityType} ${a.entityId ?? ''}`], ['Actor', (a) => <code className="small">{a.actorId?.slice(-8) ?? 'system'}</code>], ['Details', (a) => <code className="small">{JSON.stringify(a.changesRedactedJson).slice(0, 160)}</code>]]} />
      {data && data.length === 100 && <button className="btn small ghost" onClick={() => setBefore(data.at(-1)!.id)}>Older →</button>}
    </div>
  );
}
