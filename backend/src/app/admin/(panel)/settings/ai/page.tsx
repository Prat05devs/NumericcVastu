import {can, requireAdmin} from '../../../../../lib/auth.ts';
import {AI_PROVIDERS, aiSettings, secretSummaries} from '../../../../../lib/settings.ts';
import Notice from '../../../../../components/Notice.tsx';
import SecretField from '../../../../../components/SecretField.tsx';
import {saveAiProvider, testAi} from './actions.ts';

export default async function AiModels({searchParams}: {searchParams: Promise<{ok?: string; error?: string}>}) {
  await requireAdmin(can.settings);
  const [settings, secrets] = await Promise.all([aiSettings(), secretSummaries('ai.')]);
  return <>
    <div className="topbar"><h1>AI models</h1></div>
    <Notice params={await searchParams}/>
    <p className="help" style={{marginBottom: 16}}>Keys for AI features (report writing, content drafts, a smarter site guide) are kept here, encrypted, instead of in code. Code asks for a provider with <code className="code">aiProvider(&apos;anthropic&apos;)</code> and receives the key and model only when the provider is switched on.</p>
    {AI_PROVIDERS.map((p) => {
      const config = settings[p.id];
      const secret = secrets[`ai.${p.id}.apiKey`];
      return <div className="card" key={p.id} id={p.id}>
        <div className="row spread"><h2>{p.name}</h2><span className={`chip ${config?.enabled && secret ? 'ok' : 'muted'}`}>{config?.enabled && secret ? 'On' : 'Off'}</span></div>
        <form action={saveAiProvider} className="grid" style={{marginTop: 10}}>
          <input type="hidden" name="provider" value={p.id}/>
          <div className="grid two">
            <SecretField name="apiKey" label="API key" summary={secret}/>
            <label>Default model <small>Use "Test key" to list the models this key can use.</small><input type="text" name="model" defaultValue={config?.model ?? ''} spellCheck={false}/></label>
          </div>
          <div className="checks">
            <label><input type="checkbox" name="enabled" defaultChecked={config?.enabled}/>Use this provider</label>
            {secret && <label><input type="checkbox" name="removeKey"/>Remove the saved key</label>}
          </div>
          <div className="row"><button className="btn" type="submit">Save</button></div>
        </form>
        <form action={testAi} style={{marginTop: 10}}><input type="hidden" name="provider" value={p.id}/><button className="btn small ghost" type="submit">Test key</button></form>
      </div>;
    })}
  </>;
}
