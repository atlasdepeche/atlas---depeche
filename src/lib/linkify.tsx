import type { ReactNode } from "react";

// Turns bare "https://..." URLs inside plain-text article body paragraphs
// into real clickable <a> links — needed so a source-attribution line
// (e.g. "source: https://example.com/article") actually functions as a
// backlink instead of unclickable text. Added 2026-09-21 for the first
// hand-published syndicated article (source: souss-actualites.com).
const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

export function linkifyText(text: string): ReactNode[] {
  const parts = text.split(URL_PATTERN);
  const nodes: ReactNode[] = [];
  parts.forEach((part, i) => {
    if (!part.match(URL_PATTERN)) {
      if (part) nodes.push(part);
      return;
    }
    // Strip trailing punctuation that's likely sentence-final, not part
    // of the URL (e.g. a period right after the link in prose) — keep it
    // as plain text after the link instead of dropping it.
    const trailingMatch = part.match(/[.,;:!?)\]]+$/);
    const trailing = trailingMatch ? trailingMatch[0] : "";
    const href = trailing ? part.slice(0, -trailing.length) : part;
    nodes.push(
      <a key={i} href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-accent)" }}>
        {href}
      </a>,
    );
    if (trailing) nodes.push(trailing);
  });
  return nodes;
}
