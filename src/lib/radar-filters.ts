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

// Words too common to mean anything on their own — without dropping these,
// two unrelated headlines sharing only "في"/"de"/"le" would inflate the
// similarity score below for no real reason.
const DEDUPE_STOPWORDS = new Set([
  "في", "من", "إلى", "الى", "على", "عن", "مع", "أن", "إن", "لا", "ما",
  "هذا", "هذه", "ذلك", "التي", "الذي", "او", "أو", "ثم", "بعد", "قبل", "كل", "بين",
  "le", "la", "les", "de", "des", "du", "un", "une", "et", "à", "a",
  "au", "aux", "en", "sur", "dans", "pour", "par", "ce", "ces", "sa", "son", "que", "qui",
]);

function significantWords(title: string): Set<string> {
  return new Set(
    normalizeForDedupe(title)
      .split(" ")
      .filter((word) => word.length > 2 && !DEDUPE_STOPWORDS.has(word)),
  );
}

// intersection / smaller-set-size rather than Jaccard (intersection /
// union) — two outlets rarely write headlines of the same length, and
// Jaccard over-penalizes that size gap. Confirmed live 2026-09-19: Kifache
// ("من الدعم إلى المعاشات والضرائب.. بنسعيد يكشف التزامات «البام» في
// الرباط", 8 significant words) and Hespress ("بنسعيد يبرز التزامات
// «البام» بأكدال", 5 words) covering the same event share 3 words
// (بنسعيد/التزامات/البام) — Jaccard gives 3/10 = 0.30 (misses it), the
// overlap coefficient gives 3/5 = 0.60 (catches it).
function overlapCoefficient(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) if (b.has(word)) intersection += 1;
  return intersection / Math.min(a.size, b.size);
}

const NEAR_DUPLICATE_THRESHOLD = 0.5;
// Require at least this many shared significant words too, not just a
// high ratio — otherwise two 2-word titles sharing one word (ratio 0.5)
// would collapse on a single coincidental match.
const NEAR_DUPLICATE_MIN_SHARED_WORDS = 2;
// How many recently-kept items to compare a candidate against. Bounded so
// this stays cheap and so it only ever catches duplicates from roughly the
// same news cycle, not a same-name-recurs-later false match weeks apart.
const NEAR_DUPLICATE_WINDOW = 40;

/**
 * Drops later duplicates — assumes `items` is already sorted newest-first,
 * so the surviving copy of a duplicate is the one that sorts first. Catches
 * three real cases, all confirmed live 2026-09-19:
 *   1. Same URL (Hespress cross-posting one article into two of its own
 *      feeds).
 *   2. Same normalized title at a different URL.
 *   3. Different outlets, different URLs, each with their OWN headline
 *      wording, covering the same real event (Kifache vs Hespress both
 *      covering the same Bensaid/PAM story) — caught by significant-word
 *      overlap, not exact matching, since #1/#2 can't catch this at all.
 * Used both to hide duplicates already sitting in the DB
 * (src/lib/public-site.ts) and, for #1, to stop the radar from storing a
 * second identical row going forward (src/workers/radar.ts's cross-source
 * URL check) — #3 is display-only, there's no reliable way to know two
 * independently-worded ingests are "the same event" before both exist.
 */
export function dedupeRadarItems<T extends { url: string; title: string }>(items: T[]): T[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const keptWordSets: Set<string>[] = [];
  const result: T[] = [];

  for (const item of items) {
    const normTitle = normalizeForDedupe(item.title);
    if (seenUrls.has(item.url) || seenTitles.has(normTitle)) continue;

    const words = significantWords(item.title);
    const isNearDuplicate = keptWordSets.slice(-NEAR_DUPLICATE_WINDOW).some((kept) => {
      let shared = 0;
      for (const word of words) if (kept.has(word)) shared += 1;
      return shared >= NEAR_DUPLICATE_MIN_SHARED_WORDS && overlapCoefficient(words, kept) >= NEAR_DUPLICATE_THRESHOLD;
    });
    if (isNearDuplicate) continue;

    seenUrls.add(item.url);
    seenTitles.add(normTitle);
    keptWordSets.push(words);
    result.push(item);
  }

  return result;
}
