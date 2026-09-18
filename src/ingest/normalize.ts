import { createHash } from "node:crypto";

const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Lowercases, strips Latin diacritics and punctuation, collapses
 * whitespace. Deliberately simple for Phase 1 — no Arabic morphological
 * analysis yet (see docs/MASTER_PROMPT.md section 20); this is enough to
 * catch near-identical titles from the same or different sources.
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "") // Latin diacritics, e.g. e-acute -> e
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // punctuation -> space (keeps Arabic letters)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fingerprint used by the dedup engine to group items about the same event.
 * Scoped by category so two unrelated stories that happen to share a short
 * generic title (e.g. a routine weather bulletin) don't collide across
 * categories.
 */
export function eventFingerprint(params: { category: string; title: string }): string {
  const normalized = normalizeTitle(params.title);
  return createHash("sha1").update(`${params.category}::${normalized}`).digest("hex");
}
