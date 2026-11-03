import type {SecretSummary} from '../lib/settings.ts';
import {formatIst} from '../lib/format.ts';

/** A write-only secret input: it never shows the stored value, only its last four characters. Empty keeps it. */
export default function SecretField({name, label, summary, placeholder}: {name: string; label: string; summary?: SecretSummary; placeholder?: string}) {
  return <label>{label}
    <input type="password" name={name} autoComplete="off" spellCheck={false} placeholder={summary ? `•••••••• ${summary.last4} (leave empty to keep)` : placeholder || 'Not set'}/>
    <span className="secret">{summary ? `Saved, ending ${summary.last4}, updated ${formatIst(summary.updatedAt)}` : 'Not saved yet'}</span>
  </label>;
}
