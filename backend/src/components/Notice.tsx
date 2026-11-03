const MESSAGES: Record<string, [string, 'ok' | 'bad' | 'warn']> = {
  saved: ['Saved.', 'ok'],
  created: ['Created.', 'ok'],
  deleted: ['Deleted.', 'ok'],
  forbidden: ['Your role cannot open that page. Ask the owner.', 'bad'],
  'no-key': ['SETTINGS_ENCRYPTION_KEY is not set on the server, so keys cannot be saved yet.', 'bad'],
};

type Params = {notice?: string; ok?: string; error?: string};

/** Feedback after a form: ?notice=<code>, ?ok=<text> or ?error=<text>. */
export default function Notice({params}: {params: Params}) {
  if (params.error) return <p className="notice bad" role="alert">{params.error}</p>;
  if (params.ok) return <p className="notice ok" role="status">{params.ok}</p>;
  const known = params.notice ? MESSAGES[params.notice] : undefined;
  return known ? <p className={`notice ${known[1]}`} role="status">{known[0]}</p> : null;
}
