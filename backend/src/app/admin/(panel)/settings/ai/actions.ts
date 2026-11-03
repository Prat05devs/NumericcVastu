'use server';
import {redirect} from 'next/navigation';
import {can, requireAdmin} from '../../../../../lib/auth.ts';
import {audit} from '../../../../../lib/audit.ts';
import {EncryptionKeyError} from '../../../../../lib/crypto.ts';
import {AI_PROVIDERS, aiSettings, deleteSecret, setSecret, setSetting, testAiProvider, type AiProviderId} from '../../../../../lib/settings.ts';

const PAGE = '/admin/settings/ai';
const provider = (form: FormData) => {
  const id = String(form.get('provider')) as AiProviderId;
  if (!AI_PROVIDERS.some((p) => p.id === id)) throw new Error('Unknown provider.');
  return id;
};

export async function saveAiProvider(form: FormData) {
  const admin = await requireAdmin(can.settings);
  let error = '';
  let id = '' as AiProviderId;
  try {
    id = provider(form);
    const settings = await aiSettings();
    settings[id] = {enabled: form.get('enabled') === 'on', model: String(form.get('model') || '').trim()};
    await setSecret(`ai.${id}.apiKey`, String(form.get('apiKey') || ''), admin.id);
    if (form.get('removeKey') === 'on') await deleteSecret(`ai.${id}.apiKey`);
    await setSetting('ai.providers', settings, admin.id);
    await audit(admin.id, 'settings.ai.update', 'settings', id, {enabled: settings[id]!.enabled, model: settings[id]!.model, keyRemoved: form.get('removeKey') === 'on'});
  } catch (e) { error = e instanceof EncryptionKeyError ? 'SETTINGS_ENCRYPTION_KEY is not set on the server, so keys cannot be saved.' : (e as Error).message; }
  redirect(`${PAGE}?${error ? `error=${encodeURIComponent(error)}` : `ok=${encodeURIComponent('Saved.')}`}#${id}`);
}

export async function testAi(form: FormData) {
  await requireAdmin(can.settings);
  let result;
  try { result = await testAiProvider(provider(form)); } catch (e) { result = {ok: false, message: (e as Error).message, models: undefined}; }
  const models = result.models?.slice(0, 40).join(', ');
  redirect(`${PAGE}?${result.ok ? `ok=${encodeURIComponent(`${result.message}${models ? ` ${models}` : ''}`)}` : `error=${encodeURIComponent(result.message)}`}`);
}
