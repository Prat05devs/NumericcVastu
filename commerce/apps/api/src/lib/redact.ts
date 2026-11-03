import {createHash} from 'node:crypto';
import {jsonReplacer} from './http.js';

export const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const SENSITIVE = /pass|secret|token|key|otp|code$|email|phone|dob|dateofbirth|birth|address|line1|line2|requirements|contact/i;

/** Deep copy with sensitive fields replaced; used for audit rows and logs. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = SENSITIVE.test(k) && v != null && typeof v !== 'boolean' ? '[redacted]' : redact(v, depth + 1);
  return out;
}
export const toPlainSafe = (value: unknown) => redact(JSON.parse(JSON.stringify(value ?? {}, jsonReplacer)));

export function maskEmail(email: string): string {
  const [user = '', domain = ''] = email.split('@');
  const [host = '', ...rest] = domain.split('.');
  return `${user.slice(0, 1)}***@${host.slice(0, 1)}***${rest.length ? '.' + rest.join('.') : ''}`;
}
