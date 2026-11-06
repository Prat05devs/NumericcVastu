export type Block = {type: 'heading' | 'paragraph' | 'list' | 'faq' | 'callout'; text: string; items?: string[]};
/** Renders CMS blocks as plain elements (no HTML injection from content). */
export function Blocks({blocks}: {blocks: Block[]}) {
  return <>{blocks.map((b, i) => {
    if (b.type === 'heading') return <h2 key={i}>{b.text}</h2>;
    if (b.type === 'list') return <div key={i}>{b.text && <p>{b.text}</p>}<ul>{b.items?.map((x, j) => <li key={j}>{x}</li>)}</ul></div>;
    if (b.type === 'faq') return <details key={i}><summary>{b.text}</summary>{b.items?.map((x, j) => <p key={j}>{x}</p>)}</details>;
    if (b.type === 'callout') return <div key={i} className="callout">{b.text}</div>;
    return <p key={i}>{b.text}</p>;
  })}</>;
}
