'use client';
import {useState} from 'react';

/** A read-only value with a copy button, for affiliate links and new API keys. */
export default function CopyField({value, label = 'Copy'}: {value: string; label?: string}) {
  const [copied, setCopied] = useState(false);
  return <span className="copy">
    <input type="text" readOnly value={value} onFocus={(event) => event.currentTarget.select()} aria-label="Value to copy"/>
    <button type="button" className="btn small ghost" onClick={async () => { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'Copied' : label}</button>
  </span>;
}
