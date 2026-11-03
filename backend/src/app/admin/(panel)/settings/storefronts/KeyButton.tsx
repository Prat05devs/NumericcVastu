'use client';
import {useActionState} from 'react';
import CopyField from '../../../../../components/CopyField.tsx';
import {rotateKey} from './actions.ts';

/** Generates a storefront API key and shows it once, without ever putting it in a URL. */
export default function KeyButton({id, hasKey}: {id: string; hasKey: boolean}) {
  const [state, action, pending] = useActionState(rotateKey, null);
  return <form action={action} className="grid">
    <input type="hidden" name="id" value={id}/>
    {state?.key ? <div className="notice ok"><p><b>Copy this key now.</b> It will not be shown again. Put it in the website&apos;s server environment as BACKOFFICE_API_KEY.</p><CopyField value={state.key}/></div>
      : state?.error ? <p className="notice bad">{state.error}</p> : null}
    <div className="row"><button className="btn small ghost" type="submit" disabled={pending}>{hasKey ? 'Replace API key' : 'Create API key'}</button>
      {hasKey && <span className="help">Replacing it stops the old key immediately.</span>}</div>
  </form>;
}
