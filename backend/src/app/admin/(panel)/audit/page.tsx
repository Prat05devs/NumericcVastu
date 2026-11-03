import {getDb} from '../../../../lib/db.ts';
import {can, requireAdmin} from '../../../../lib/auth.ts';
import {formatIst} from '../../../../lib/format.ts';

export default async function AuditLog() {
  await requireAdmin(can.audit);
  const rows = await (await getDb()).query<{id: string; action: string; entity: string; entity_id: string | null; details: Record<string, unknown>; created_at: Date; name: string | null}>(
    'select l.id, l.action, l.entity, l.entity_id, l.details, l.created_at, a.name from audit_log l left join admin_users a on a.id = l.admin_id order by l.created_at desc limit 300');
  return <>
    <div className="topbar"><h1>Audit log</h1></div>
    <div className="card">{rows.length === 0 ? <p className="empty">Nothing recorded yet.</p> : <table>
      <thead><tr><th>When</th><th>Who</th><th>What</th><th>Details</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id}><td><small>{formatIst(r.created_at)}</small></td><td>{r.name ?? '—'}</td><td><code>{r.action}</code><br/><small className="help">{r.entity} {r.entity_id ?? ''}</small></td>
        <td><small className="mono">{Object.keys(r.details).length ? JSON.stringify(r.details) : ''}</small></td></tr>)}</tbody>
    </table>}</div>
  </>;
}
