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
    // Was type "html" pointed at the homepage — that only ever produced
    // the homepage's own <title> ("Le360 - Le média des actualités du
    // Maroc"), which showed up as junk cards on the public aggregator
    // homepage. Upgraded 2026-09-19 to html_list: the homepage's raw HTML
    // does contain real per-article links (confirmed live — category
    // pages like /politique/ mixed in with real article slugs like
    // /politique/legislatives-2026-...-chellah_43RR2OHFXJGSDH3BGUAPNRNSLQ/),
    // so no dedicated listing path is needed here — article-list.ts's
    // looksLikeArticleSlug heuristic separates the two.
    name: "Le360",
    type: "html_list",
    url: "https://fr.le360.ma",
    language: "fr",
    category: "news",
    status: "active",
    robotsPolicy: "allows all except /recherche",
    tosNotes: "Reference media — corroboration signal only, never copy body text.",
  },
  {
    // Was type "html" pointed at the homepage — its raw HTML has no
    // French article links at all (confirmed live, including on /fr
    // directly: every /article/ link present is under /ar/), so the old
    // connector was really just grabbing the (French-titled) homepage
    // shell. Upgraded 2026-09-19 to html_list pointed at the French "news"
    // category listing instead, which does carry real /fr/article/NNN.html
    // links with og:image + article:published_time (confirmed live).
    name: "Medi1 News",
    type: "html_list",
    url: "https://www.medi1news.com/fr/categorie/news",
    language: "fr",
    category: "news",
    status: "active",
    robotsPolicy: "allows all",
    tosNotes: "Reference media — corroboration signal only, never copy body text.",
  },
  {
    // Paused 2026-09-19: confirmed live that the homepage's raw HTML has
    // no real text-article links, only dated video bulletin ("JT") pages
    // (/fr/jt/.../YYYY-MM-DD) — not article content an aggregator card can
    // meaningfully show (no headline, no photo, no article page). Matches
    // this project's existing "don't force a bad source, investigate an
    // official arrangement instead" stance (see map.ma/cg.gov.ma above).
    name: "SNRT (Al Aoula group)",
    type: "html",
    url: "https://www.snrt.ma",
    language: "fr",
    category: "institutional",
    status: "paused",
    robotsPolicy: "homepage path allowed; /admin, /search, /user disallowed",
    tosNotes:
      "Public broadcaster's site only exposes dated video bulletin pages in raw HTML, not text articles — would need per-JT-page handling or a headless browser to do properly, out of proportion for now.",
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

  // --- Added 2026-09-19: more RSS to reach real aggregator volume ---------
  // Every URL below was verified live with the same polite, identifying
  // User-Agent before being added (200 response, real RSS/XML body with
  // current Moroccan news items, robots.txt checked) — not guessed. Sites
  // that 403'd a polite fetch (lematin.ma, leconomiste.com, ledesk.ma,
  // medias24.com's own /feed, maroc-diplomatique.net, mapexpress.ma,
  // h24info.ma) or whose robots.txt explicitly disallows /feed for a
  // generic User-Agent (alyaoum24.com) were tried and rejected, not
  // skipped silently. sahara-question.com's "feed" is live but its items
  // are gambling spam ("1xbet") — a hijacked/parked feed, not a real
  // source — rejected after inspecting the actual content.
  {
    name: "Aujourd'hui le Maroc",
    type: "rss",
    url: "https://aujourdhui.ma/feed",
    language: "fr",
    category: "news",
    status: "active",
    robotsPolicy: "robots.txt has no blanket Disallow for our UA",
    tosNotes:
      "Overwhelmingly French; occasionally publishes a same-day Arabic op-ed under the same feed (confirmed live, ~1 in 10 items) — a known minor language-purity gap in this feed, not a bug in our connector.",
  },
  {
    name: "TelQuel",
    type: "rss",
    url: "https://telquel.ma/feed",
    language: "fr",
    category: "news",
    status: "active",
    robotsPolicy: "robots.txt has no blanket Disallow for our UA",
  },
  {
    name: "Yabiladi (Français)",
    type: "rss",
    url: "https://www.yabiladi.com/rss/rss.xml",
    language: "fr",
    category: "news",
    status: "active",
    robotsPolicy:
      "robots.txt disallows a handful of named bots (GPTBot, MJ12bot, Exabot, proximic, 008), no blanket Disallow for our UA",
  },
  {
    name: "Yabiladi (Arabe)",
    type: "rss",
    url: "https://ar.yabiladi.com/rss/rss.xml",
    language: "ar",
    category: "news",
    status: "active",
    robotsPolicy:
      "robots.txt disallows a handful of named bots (GPTBot, MJ12bot, Exabot, proximic, 008), no blanket Disallow for our UA",
  },
  {
    name: "Libération (Libe.ma)",
    type: "rss",
    url: "https://libe.ma/feed/",
    language: "fr",
    category: "news",
    status: "active",
    robotsPolicy: "no robots.txt served — nothing to restrict our UA",
  },
  {
    name: "Barlamane",
    type: "rss",
    url: "https://barlamane.com/feed/",
    language: "ar",
    category: "news",
    status: "active",
    robotsPolicy: "robots.txt has no blanket Disallow for our UA",
  },
  {
    name: "Assabah",
    type: "rss",
    url: "https://assabah.ma/feed",
    language: "ar",
    category: "news",
    status: "active",
    robotsPolicy:
      "robots.txt only declares the newer 'content-signal' comments (no active signal values set) — no classic Disallow for our UA",
  },
  {
    name: "Kifache",
    type: "rss",
    url: "https://kifache.com/feed/",
    language: "ar",
    category: "news",
    status: "active",
    robotsPolicy: "robots.txt has no blanket Disallow for our UA",
  },
  {
    name: "Hibapress (Français)",
    type: "rss",
    url: "https://fr.hibapress.com/feed",
    language: "fr",
    category: "news",
    status: "active",
    robotsPolicy: "robots.txt has no blanket Disallow for our UA",
  },
];
