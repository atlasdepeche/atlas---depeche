/**
 * A plain YouTube/Vimeo watch/share URL (what anyone actually copies from
 * their address bar) isn't embeddable as-is in an <iframe> — this converts
 * the common shapes to their embed-URL form. Anything not recognized
 * returns null, and the caller falls back to a plain outbound link
 * (src/app/(public)/[locale]/[slug]/page.tsx) rather than guessing.
 */
export function toEmbeddableVideoUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = parsed.searchParams.get("v");
    if (id) return `https://www.youtube.com/embed/${id}`;
    const shortsMatch = parsed.pathname.match(/^\/shorts\/([^/]+)/);
    if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
    return null;
  }

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  if (host === "vimeo.com") {
    const id = parsed.pathname.match(/^\/(\d+)/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }

  return null;
}
