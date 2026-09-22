/**
 * Markdown-lite used by the content: `inline code` and **bold** only
 * (docs/ARCHITECTURE.md). Renders React nodes, never HTML strings.
 *   <p><Md text={lesson.concept.short} /></p>
 */
import { Fragment, type ReactNode } from 'react';

function mdNodes(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] != null)
      out.push(
        <code key={k++} className="i">
          {m[1]}
        </code>,
      );
    else out.push(<b key={k++}>{m[2]}</b>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Md({ text }: { text: string | null | undefined }) {
  return <Fragment>{mdNodes(String(text ?? ''))}</Fragment>;
}
