'use client';
import {useResource, Loading, Table, SpecForm, Action} from '@/components/admin/kit';
import {post} from '@/lib/client';
import {date, label} from '@/lib/format';

type U = {id: string; email: string; name: string; role: string; status: string; mfaEnabledAt: string | null; lastLoginAt: string | null};
const ROLES: [string, string][] = [['OWNER', 'Owner — everything'], ['SUPPORT', 'Support — orders, requests'], ['CATALOG_MANAGER', 'Catalogue manager — products, stock, content'], ['FULFILLMENT', 'Fulfilment — packing, shipping, stock'], ['FINANCE', 'Finance — refunds, reports, payouts'], ['MARKETING', 'Marketing — coupons, sales, partners, content']];
export default function Staff() {
  const {data, error, loading, reload} = useResource<U[]>('/admin/staff');
  return (
    <div className="stack"><h1>Staff</h1><p className="small muted">Everyone signs in with a password and an authenticator app. Changing a role or status signs the person out everywhere.</p><Loading error={error} loading={loading} />
      <Table rows={data} cols={[['Name', (u) => `${u.name} (${u.email})`], ['Role', (u) => label(u.role)], ['Status', (u) => label(u.status)], ['2FA', (u) => (u.mfaEnabledAt ? 'On' : 'Pending')], ['Last sign-in', (u) => date(u.lastLoginAt)],
        ['', (u) => <div className="row">
          <Action label="Change role" className="btn small ghost" method="PATCH" path={`/admin/staff/${u.id}`} body={() => ({role: prompt(`New role: ${ROLES.map(([r]) => r).join(', ')}`, u.role)?.toUpperCase()})} onDone={reload} />
          <Action label="Reset 2FA" className="btn small ghost" method="PATCH" path={`/admin/staff/${u.id}`} body={{resetMfa: true}} confirm="They will set up their authenticator again at next sign-in." onDone={reload} />
          <Action label={u.status === 'ACTIVE' ? 'Disable' : 'Enable'} className={`btn small ${u.status === 'ACTIVE' ? 'danger' : ''}`} method="PATCH" path={`/admin/staff/${u.id}`} body={{status: u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'}} onDone={reload} /></div>]]} />
      <div className="card"><h2>Add a staff member</h2><SpecForm initial={{role: 'SUPPORT'}} submitLabel="Create account" specs={[{key: 'name', label: 'Name', hint: 'Team member ka naam.', type: 'text'}, {key: 'email', label: 'Email', hint: 'Isi email se back office mein login karenge.', type: 'email'}, {key: 'role', label: 'Role', hint: 'Kya kya kar sakte hain. Kam se kam access do jitna kaam ke liye zaroori hai.', type: 'select', options: ROLES}, {key: 'temporaryPassword', label: 'Temporary password (min 12 characters; share it privately)', hint: 'Kam se kam 12 akshar. Privately bhejo; pehle login par badalna hoga.', type: 'text'}]}
        onSubmit={async (v) => { const r = await post('/admin/staff', v); if (r.ok) reload(); return r; }} /></div>
    </div>
  );
}
