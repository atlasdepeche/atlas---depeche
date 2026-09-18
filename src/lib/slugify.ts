/**
 * Pure, dependency-free slug generator for hand-written articles (see
 * src/app/(admin)/admin/articles/actions.ts's createManualArticle). Only
 * handles Latin-script input meaningfully — Arabic titles produce an
 * empty string (nothing to transliterate to safely without guessing),
 * and the caller falls back to an id-based slug in that case. Never
 * invents a transliteration.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
