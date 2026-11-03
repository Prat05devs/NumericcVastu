import {getDb} from '../../../../lib/db.ts';
import {can, requireAdmin} from '../../../../lib/auth.ts';
import {formatIst} from '../../../../lib/format.ts';
import Notice from '../../../../components/Notice.tsx';
import {addMember, setActive} from './actions.ts';

export default async function Team({searchParams}: {searchParams: Promise<{notice?: string; error?: string}>}) {
  const me = await requireAdmin(can.team);
  const rows = await (await getDb()).query<{id: string; name: string; email: string; role: string; active: boolean; last_login_at: Date | null}>('select id, name, email, role, active, last_login_at from admin_users order by created_at');
  return <>
    <div className="topbar"><h1>Team</h1></div>
    <Notice params={await searchParams}/>
    <div className="card"><table>
      <thead><tr><th>Name</th><th>Role</th><th>Last sign-in</th><th/></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id}><td><b>{r.name}</b><br/><small className="help">{r.email}</small></td><td>{r.role}</td><td>{formatIst(r.last_login_at)}</td>
        <td>{r.id !== me.id && <form action={setActive}><input type="hidden" name="id" value={r.id}/><button className={`btn small ${r.active ? 'ghost' : ''}`} type="submit">{r.active ? 'Switch off' : 'Switch on'}</button></form>}</td></tr>)}</tbody>
    </table></div>
    <form action={addMember} className="card grid"><h2>Add someone</h2>
      <p className="hint">Owner: everything. Admin: offers, affiliates, sales, catalogue and the audit log. Marketing: offers, affiliates and sales.</p>
      <div className="grid four">
        <label>Name<input type="text" name="name" required/></label>
        <label>Email<input type="email" name="email" required/></label>
        <label>Role<select name="role" defaultValue="marketing"><option value="marketing">Marketing</option><option value="admin">Admin</option><option value="owner">Owner</option></select></label>
        <label>Temporary password<input type="password" name="password" minLength={12} required autoComplete="new-password"/></label>
      </div>
      <div className="row"><button className="btn" type="submit">Add</button></div>
    </form>
  </>;
}
