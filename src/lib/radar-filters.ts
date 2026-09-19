// Markers seen in real junk titles produced by the generic "html" connector
// (src/ingest/html.ts) when it has no real per-article listing to crawl and
// falls back to a homepage's own <title> — e.g. "Accueil | SNRT". Matched as
// whole words (see below) — "accueil" as a plain substring also matches
// real headlines using the French verb "accueillir" ("la MINURSO accueille
// son nouveau commandant", "4,1 millions de MRE accueillis"), confirmed
// live 2026-09-19 as a false-positive this exact list produced.
const HOMEPAGE_TITLE_MARKERS = ["accueil", "الرئيسية"];

function containsWholeWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:[^\\p{L}\\p{N}]|$)`, "iu").test(text);
}

/**
 * True when a source_items title looks like a homepage/masthead signal
 * rather than a real article — e.g. "Le360 - Le média des actualités du
 * Maroc" or "Accueil | SNRT". Used both to skip saving these at ingest time
 * (src/workers/radar.ts) and to filter any already-stored ones out of the
 * public aggregator homepage (src/lib/public-site.ts) — two call sites, one
 * rule, so a source added later can't reintroduce the same junk silently.
 */
export function isLikelyHomepageTitle(title: string, sourceName: string): boolean {
  if (HOMEPAGE_TITLE_MARKERS.some((marker) => containsWholeWord(title, marker))) {
    return true;
  }

  const normalizedSource = sourceName.toLowerCase().trim();
  return normalizedSource.length > 0 && title.toLowerCase().includes(normalizedSource);
}
