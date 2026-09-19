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

// Confirmed live 2026-09-19: a Hibapress (FR) item — "L'armée yéménite
// reprend des positions aux Houthis à l'ouest de la ville de Taëz" — showed
// up on the homepage. Every active source is a general Moroccan outlet, not
// a Morocco-only wire, so it also republishes unrelated international
// stories. This is a keyword filter, not AI judgment — the free-aggregator
// pivot's whole point was zero per-item AI cost — so it trades some recall
// (a hyper-local story naming only a small town not listed below would
// still get excluded) for precision, matching what was explicitly asked:
// strict Morocco relevance, not "whatever the outlet happens to publish".
// Country/nationality terms are the highest-precision signal and alone
// cover almost every case this is meant for, including Moroccan athletes/
// citizens abroad (a story about them almost always says "marocain(e)" or
// "مغربي/ة" somewhere) — city/region names (src/db/seed-gazetteer.ts) are
// a secondary signal for domestic stories that don't happen to say "Maroc"
// explicitly.
const MOROCCO_KEYWORDS = [
  // Country / nationality
  "maroc",
  "marocain",
  "marocaine",
  "marocains",
  "marocaines",
  "morocco",
  "moroccan",
  "المغرب",
  "مغربي",
  "مغربية",
  "مغاربة",
  "مغربيات",
  // Regions (2015 territorial reform)
  "tanger-tétouan",
  "طنجة-تطوان",
  "fès-meknès",
  "فاس-مكناس",
  "rabat-salé",
  "الرباط-سلا",
  "béni mellal",
  "بني ملال",
  "casablanca-settat",
  "الدار البيضاء-سطات",
  "marrakech-safi",
  "مراكش-آسفي",
  "drâa-tafilalet",
  "درعة-تافيلالت",
  "souss-massa",
  "سوس-ماسة",
  "guelmim",
  "كلميم",
  // Major cities
  "casablanca",
  "الدار البيضاء",
  "rabat",
  "الرباط",
  "marrakech",
  "marrakesh",
  "مراكش",
  "tanger",
  "tangier",
  "طنجة",
  "agadir",
  "أكادير",
  "fès",
  "fez",
  "فاس",
  "meknès",
  "مكناس",
  "oujda",
  "وجدة",
  "tétouan",
  "تطوان",
  "kénitra",
  "القنيطرة",
  "laâyoune",
  "العيون",
  "dakhla",
  "الداخلة",
  "sahara marocain",
  "الصحراء المغربية",
  // Institutions / national sports team
  "frmf",
  "lions de l'atlas",
  "أسود الأطلس",
  "bank al-maghrib",
  "بنك المغرب",
];

/**
 * True when a title/summary looks genuinely relevant to Morocco — its
 * people, places, or institutions — rather than an unrelated wire story
 * that happened to come through a Moroccan outlet's general feed. Used
 * both to skip saving irrelevant items at ingest time (src/workers/radar.ts)
 * and to filter any already-stored ones out of the public homepage/ticker
 * (src/lib/public-site.ts).
 */
export function isMoroccoRelevant(title: string, summary: string | null): boolean {
  const haystack = `${title} ${summary ?? ""}`.toLowerCase();
  return MOROCCO_KEYWORDS.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

/**
 * Loose equality key for "is this the same article" — confirmed live
 * 2026-09-19: Hespress cross-posts the exact same sport articles into both
 * its general FR feed and its dedicated Sport FR feed (two different
 * `sources` rows, same URL, same title), which showed up as two identical
 * cards on the homepage. Diacritics/punctuation are stripped so trivial
 * formatting differences ("«»" vs plain quotes, accents) don't defeat it.
 */
export function normalizeForDedupe(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Drops later duplicates (same URL, or same normalized title) — assumes
 * `items` is already sorted newest-first, so the surviving copy of a
 * duplicate pair is the one that sorts first. Used both to hide duplicates
 * already sitting in the DB (src/lib/public-site.ts) and, going forward, to
 * stop the radar from storing a second identical row in the first place
 * (src/workers/radar.ts's cross-source URL check).
 */
export function dedupeRadarItems<T extends { url: string; title: string }>(items: T[]): T[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const normTitle = normalizeForDedupe(item.title);
    if (seenUrls.has(item.url) || seenTitles.has(normTitle)) continue;
    seenUrls.add(item.url);
    seenTitles.add(normTitle);
    result.push(item);
  }

  return result;
}
