import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {getDb} from '../../../lib/db.ts';
import {currentAdmin} from '../../../lib/auth.ts';
import Notice from '../../../components/Notice.tsx';
import {createOwner, signIn} from './actions.ts';

export const metadata: Metadata = {title: 'Sign in'};

export default async function Login({searchParams}: {searchParams: Promise<{error?: string}>}) {
  if (await currentAdmin()) redirect('/admin');
  const params = await searchParams;
  const firstRun = (await (await getDb()).one<{n: number}>('select count(*) as n from admin_users'))!.n === 0;
  return <main className="auth"><div className="card">
    <h1>NumericcVaastu Back Office</h1>
    <p className="help">{firstRun ? 'Create the owner account to finish setting up.' : 'Sign in to manage offers, affiliates, sales and settings.'}</p>
    <Notice params={params}/>
    {firstRun ? <form action={createOwner}>
      {!process.env.ADMIN_SETUP_TOKEN && <p className="notice warn">Set ADMIN_SETUP_TOKEN in the server environment, then enter it here. Or run <code className="code">npm run admin:create</code>.</p>}
      <label>Setup token<input type="password" name="token" required autoComplete="off"/></label>
      <label>Your name<input type="text" name="name" required autoComplete="name"/></label>
      <label>Email<input type="email" name="email" required autoComplete="email"/></label>
      <label>Password <small>At least 12 characters.</small><input type="password" name="password" required minLength={12} autoComplete="new-password"/></label>
      <button className="btn" type="submit">Create owner account</button>
    </form> : <form action={signIn}>
      <label>Email<input type="email" name="email" required autoComplete="username"/></label>
      <label>Password<input type="password" name="password" required autoComplete="current-password"/></label>
      <button className="btn" type="submit">Sign in</button>
    </form>}
  </div></main>;
}
