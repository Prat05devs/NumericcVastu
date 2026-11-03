import {getSecret} from '../../lib/secrets.js';

export const secretName = (provider: string, environment: 'test' | 'live', field: string) => `payments.${provider}.${environment}.${field}`;
export const readSecrets = async (provider: string, environment: 'test' | 'live', fields: readonly string[]) =>
  Object.fromEntries(await Promise.all(fields.map(async (f) => [f, await getSecret(secretName(provider, environment, f))] as const))) as Record<string, string | null>;
export const mask = (v: string | null) => (v ? `${v.slice(0, 9)}…${v.slice(-4)}` : null);
