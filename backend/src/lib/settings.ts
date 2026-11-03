import {getDb} from './db.ts';
import {decryptSecret, encryptSecret, lastFour} from './crypto.ts';

/**
 * Configuration managed from the back office instead of code or hosting variables.
 * Non-secret values (mode, key ids, model names) live in `settings`; secrets (key secrets, webhook secrets, API keys)
 * live encrypted in `secrets`. Only server code may call the functions that return decrypted secrets.
 */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await (await getDb()).one<{value: T}>('select value from settings where setting_key = ?', [key]);
  return row ? {...fallback, ...row.value} : fallback;
}

export async function setSetting(key: string, value: unknown, adminId: string | null): Promise<void> {
  await (await getDb()).execute(
    `INSERT INTO settings (setting_key, value, updated_by) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE value = VALUES(value), updated_by = VALUES(updated_by), updated_at = NOW(3)`,
    [key, JSON.stringify(value), adminId],
  );
}

/** Saves a secret. An empty value keeps the current one, so forms never need to show existing secrets. */
export async function setSecret(name: string, value: string, adminId: string | null): Promise<boolean> {
  const plain = value.trim();
  if (!plain) return false;
  await (await getDb()).execute(
    `INSERT INTO secrets (name, ciphertext, last4, updated_by) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE ciphertext = VALUES(ciphertext), last4 = VALUES(last4), updated_by = VALUES(updated_by), updated_at = NOW(3)`,
    [name, encryptSecret(plain), lastFour(plain), adminId],
  );
  return true;
}

export async function deleteSecret(name: string): Promise<void> {
  await (await getDb()).execute('delete from secrets where name = ?', [name]);
}

export async function getSecret(name: string): Promise<string | null> {
  const row = await (await getDb()).one<{ciphertext: string}>('select ciphertext from secrets where name = ?', [name]);
  return row ? decryptSecret(row.ciphertext) : null;
}

export type SecretSummary = {last4: string; updatedAt: Date};
/** What the dashboard may show about stored secrets: the last four characters and when they changed. */
export async function secretSummaries(prefix: string): Promise<Record<string, SecretSummary>> {
  const rows = await (await getDb()).query<{name: string; last4: string; updated_at: Date}>('select name, last4, updated_at from secrets where name like ?', [`${prefix}%`]);
  return Object.fromEntries(rows.map((r) => [r.name, {last4: r.last4, updatedAt: r.updated_at}]));
}

// ---------------------------------------------------------------- Payments

export type RazorpayMode = 'test' | 'live';
export type PaypalMode = 'sandbox' | 'live';
export type RazorpaySettings = {mode: RazorpayMode; test: {keyId: string}; live: {keyId: string}; international: boolean};
export type PaypalSettings = {mode: PaypalMode; sandbox: {clientId: string}; live: {clientId: string}};

export const razorpaySettings = () => getSetting<RazorpaySettings>('payments.razorpay', {mode: 'test', test: {keyId: ''}, live: {keyId: ''}, international: false});
export const paypalSettings = () => getSetting<PaypalSettings>('payments.paypal', {mode: 'sandbox', sandbox: {clientId: ''}, live: {clientId: ''}});
export const paypalApiBase = (mode: PaypalMode) => (mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');

/** Keys a storefront's browser may see: the public key ids and which mode is on. */
export async function publicPaymentConfig() {
  const [razorpay, paypal] = await Promise.all([razorpaySettings(), paypalSettings()]);
  return {
    razorpay: {mode: razorpay.mode, keyId: razorpay[razorpay.mode].keyId || null, international: razorpay.international},
    paypal: {mode: paypal.mode, clientId: paypal[paypal.mode].clientId || null},
  };
}

/** Everything a server needs to take a payment in the current mode. Server-only. */
export async function paymentCredentials() {
  const [razorpay, paypal] = await Promise.all([razorpaySettings(), paypalSettings()]);
  return {
    razorpay: {
      mode: razorpay.mode, international: razorpay.international, keyId: razorpay[razorpay.mode].keyId,
      keySecret: await getSecret(`razorpay.${razorpay.mode}.keySecret`),
      webhookSecret: await getSecret(`razorpay.${razorpay.mode}.webhookSecret`),
    },
    paypal: {
      mode: paypal.mode, apiBase: paypalApiBase(paypal.mode), clientId: paypal[paypal.mode].clientId,
      clientSecret: await getSecret(`paypal.${paypal.mode}.clientSecret`),
    },
  };
}

export type TestResult = {ok: boolean; message: string};
const basic = (user: string, pass: string) => `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;

export async function testRazorpay(mode: RazorpayMode): Promise<TestResult> {
  const keyId = (await razorpaySettings())[mode].keyId;
  const secret = await getSecret(`razorpay.${mode}.keySecret`);
  if (!keyId || !secret) return {ok: false, message: `Add the ${mode} key id and key secret first.`};
  if (!keyId.startsWith(`rzp_${mode}_`)) return {ok: false, message: `A ${mode} key id starts with rzp_${mode}_.`};
  try {
    const response = await fetch('https://api.razorpay.com/v1/payments?count=1', {headers: {Authorization: basic(keyId, secret)}, signal: AbortSignal.timeout(10_000)});
    return response.ok ? {ok: true, message: `Razorpay accepted the ${mode} keys.`} : {ok: false, message: `Razorpay rejected the ${mode} keys (HTTP ${response.status}).`};
  } catch (error) {
    return {ok: false, message: `Could not reach Razorpay: ${(error as Error).message}`};
  }
}

export async function testPaypal(mode: PaypalMode): Promise<TestResult> {
  const clientId = (await paypalSettings())[mode].clientId;
  const secret = await getSecret(`paypal.${mode}.clientSecret`);
  if (!clientId || !secret) return {ok: false, message: `Add the ${mode} client id and secret first.`};
  try {
    const response = await fetch(`${paypalApiBase(mode)}/v1/oauth2/token`, {
      method: 'POST', body: 'grant_type=client_credentials', signal: AbortSignal.timeout(10_000),
      headers: {Authorization: basic(clientId, secret), 'Content-Type': 'application/x-www-form-urlencoded'},
    });
    return response.ok ? {ok: true, message: `PayPal accepted the ${mode} credentials.`} : {ok: false, message: `PayPal rejected the ${mode} credentials (HTTP ${response.status}).`};
  } catch (error) {
    return {ok: false, message: `Could not reach PayPal: ${(error as Error).message}`};
  }
}

// ---------------------------------------------------------------- AI models

export type AiProviderId = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'moonshot';
type ProviderDef = {id: AiProviderId; name: string; models: string; headers: (key: string) => Record<string, string>; ids: (body: any) => string[]};

/** Add a provider here to make it configurable in Settings → AI models. */
export const AI_PROVIDERS: ProviderDef[] = [
  {id: 'openai', name: 'OpenAI (ChatGPT)', models: 'https://api.openai.com/v1/models', headers: (k) => ({Authorization: `Bearer ${k}`}), ids: (b) => b.data?.map((m: any) => m.id) ?? []},
  {id: 'anthropic', name: 'Anthropic (Claude)', models: 'https://api.anthropic.com/v1/models', headers: (k) => ({'x-api-key': k, 'anthropic-version': '2023-06-01'}), ids: (b) => b.data?.map((m: any) => m.id) ?? []},
  {id: 'google', name: 'Google (Gemini)', models: 'https://generativelanguage.googleapis.com/v1beta/models', headers: (k) => ({'x-goog-api-key': k}), ids: (b) => b.models?.map((m: any) => String(m.name).replace(/^models\//, '')) ?? []},
  {id: 'deepseek', name: 'DeepSeek', models: 'https://api.deepseek.com/models', headers: (k) => ({Authorization: `Bearer ${k}`}), ids: (b) => b.data?.map((m: any) => m.id) ?? []},
  {id: 'moonshot', name: 'Moonshot (Kimi)', models: 'https://api.moonshot.ai/v1/models', headers: (k) => ({Authorization: `Bearer ${k}`}), ids: (b) => b.data?.map((m: any) => m.id) ?? []},
];

export type AiProviderSettings = {enabled: boolean; model: string};
export const aiSettings = () => getSetting<Partial<Record<AiProviderId, AiProviderSettings>>>('ai.providers', {});

/** For future AI features: the key and chosen model of an enabled provider. Server-only. */
export async function aiProvider(id: AiProviderId): Promise<{apiKey: string; model: string} | null> {
  const config = (await aiSettings())[id];
  const apiKey = await getSecret(`ai.${id}.apiKey`);
  return config?.enabled && apiKey ? {apiKey, model: config.model} : null;
}

export async function testAiProvider(id: AiProviderId): Promise<TestResult & {models?: string[]}> {
  const provider = AI_PROVIDERS.find((p) => p.id === id);
  const key = await getSecret(`ai.${id}.apiKey`);
  if (!provider) return {ok: false, message: 'Unknown provider.'};
  if (!key) return {ok: false, message: `Add a ${provider.name} API key first.`};
  try {
    const response = await fetch(provider.models, {headers: provider.headers(key), signal: AbortSignal.timeout(10_000)});
    if (!response.ok) return {ok: false, message: `${provider.name} rejected the key (HTTP ${response.status}).`};
    const models = provider.ids(await response.json()).sort();
    return {ok: true, message: `${provider.name} accepted the key: ${models.length} models available.`, models};
  } catch (error) {
    return {ok: false, message: `Could not reach ${provider.name}: ${(error as Error).message}`};
  }
}
