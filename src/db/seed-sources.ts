/**
 * v1 seed source list — see docs/MASTER_PROMPT.md section 23.
 *
 * Every URL here was verified reachable on 2026-09-18 with a polite,
 * identifying User-Agent (see src/ingest/fetch-utils.ts) before being
 * added — nothing here is guessed. `status: "paused"` entries are real
 * targets that returned HTTP 403 to that same polite request; they're kept
 * in the table so Source Intelligence has something to track, but the
 * connector must not attempt to bypass whatever is blocking them — that
 * needs investigation (different verified UA? an official arrangement?)
 * before flipping to "active", not a workaround.
 *
 * No "weather" source exists yet: the official DGM site (marocmeteo.ma)
 * is reachable but only publishes alerts as image maps (a separate
 * Drupal "vigilance" subdomain), not text bulletins our pipeline can
 * extract — investigated 2026-09-18, not guessed. OCR-ing alert
 * severity out of a map image was judged too risky (could misread a
 * warning level) rather than attempted.
 */

export interface SeedSource {
  name: string;
  // html_list = a listing/index page — real per-article links get
  // extracted and fetched individually (src/ingest/article-list.ts).
  // html = generic single-page "did this page's title change" signal
  // (src/ingest/html.ts) — the fallback when a site has no listing page
  // we can parse (e.g. it's client-rendered, see SNRT/snrtnews.com).
  type: "rss" | "html" | "html_list";
  url: string;
  language: "ar" | "fr";
  category: string;
  status: "active" | "paused";
  robotsPolicy: string;
  tosNotes?: string;
}

export const SEED_SOURCES: SeedSource[] = [
  {
    name: "Hespress (Arabic)",
    type: "rss",
    url: "https://hespress.com/feed",
    language: "ar",
    category: "news",
    status: "active",
    robotsPolicy: "robots.txt has no blanket Disallow for our UA",
  },
  {
    name: "Hespress Français",
    type: "rss",
    url: "https://fr.hespress.com/feed",
    language: "fr",
    category: "news",
    status: "active",
    robotsPolicy: "robots.txt has no blanket Disallow for our UA",
  },
  {
    // Was type "html" pointed at the homepage (just its static <title>) —
    // upgraded 2026-09-18 to the real /fr/actualites listing, which
    // yields actual per-article content (confirmed live: meta description
    // carries the full article text). This is what makes "1 official
    // primary source" a real possibility instead of a dead letter — see
    // CLAUDE.md's "structural corroboration gap" note.
    name: "Maroc.ma (portail officiel, FR)",
    type: "html_list",
    url: "https://www.maroc.ma/fr/actualites",
    language: "fr",
    category: "institutional",
    status: "active",
    robotsPolicy: "listing + article paths allowed; /admin, /search, /user disallowed",
    tosNotes:
      "Official government portal — signal only, quote and attribute, never claim as original reporting.",
  },
  {
    // Added 2026-09-18 while looking for a real "sports"-category source
    // for Phase 6. The official federation sites (FRMF, LNFP) are both
    // Cloudflare-blocked (403 + JS challenge) — same pattern as map.ma,
    // needs an official arrangement, not a bypass. The one reachable
    // "official"-sounding alternative (botola.ma) turned out to be
    // evergreen SEO guide content with no real dates, not actual match
    // news — rejected after inspecting its feed, not guessed. This is
    // Hespress's own sports desk instead: same trusted publisher already
    // active for "news" above, real dated articles (confirmed live).
    // NOT an official federation, so deliberately excluded from
    // AUTOMATED_CATEGORIES — see .env comment and automation-policy.ts;
    // it only auto-publishes via the confidence path, same as any other
    // category.
    name: "Hespress Sport (Français)",
    type: "rss",
    url: "https://fr.hespress.com/sport/feed",
    language: "fr",
    category: "sports",
    status: "active",
    robotsPolicy: "robots.txt has no blanket Disallow for our UA",
    tosNotes:
      "Sports desk of an already-trusted general news outlet, not the official football federation — do not add to AUTOMATED_CATEGORIES.",
  },
  {
    name: "Le360",
    type: "html",
    url: "https://fr.le360.ma",
    language: "fr",
    category: "news",
    status: "active",
    robotsPolicy: "allows all except /recherche",
    tosNotes: "Reference media — corroboration signal only, never copy body text.",
  },
  {
    name: "Medi1 News",
    type: "html",
    url: "https://www.medi1news.com",
    language: "fr",
    category: "news",
    status: "active",
    robotsPolicy: "allows all",
    tosNotes: "Reference media — corroboration signal only, never copy body text.",
  },
  {
    name: "SNRT (Al Aoula group)",
    type: "html",
    url: "https://www.snrt.ma",
    language: "fr",
    category: "institutional",
    status: "active",
    robotsPolicy: "homepage path allowed; /admin, /search, /user disallowed",
  },
  {
    name: "Chef du Gouvernement (SGG)",
    type: "html",
    url: "https://www.cg.gov.ma",
    language: "fr",
    category: "institutional",
    status: "paused",
    robotsPolicy: "unknown — site returned HTTP 403 to a polite fetch on 2026-09-18",
    tosNotes: "Blocked at the network layer, not by robots.txt. Do not bypass — investigate first.",
  },
  {
    name: "Maghreb Arabe Presse (MAP)",
    type: "html",
    url: "https://www.map.ma/fr",
    language: "fr",
    category: "news",
    status: "paused",
    robotsPolicy: "unknown — site returned HTTP 403 to a polite fetch on 2026-09-18",
    tosNotes:
      "National wire — highest-priority source to unblock properly (official arrangement, not scraping around the 403). See MASTER_PROMPT section 23.",
  },
  {
    name: "MAPNews",
    type: "html",
    url: "https://www.mapnews.ma",
    language: "ar",
    category: "news",
    status: "paused",
    robotsPolicy: "unknown — site returned HTTP 403 to a polite fetch on 2026-09-18",
  },
  {
    name: "2M (2m.ma)",
    type: "html",
    url: "https://www.2m.ma/fr",
    language: "fr",
    category: "news",
    status: "paused",
    robotsPolicy: "unknown — site returned HTTP 403 to a polite fetch on 2026-09-18",
  },
  {
    name: "Médias24",
    type: "html",
    url: "https://medias24.com",
    language: "fr",
    category: "economy",
    status: "paused",
    robotsPolicy: "unknown — site returned HTTP 403 to a polite fetch on 2026-09-18",
  },
];
