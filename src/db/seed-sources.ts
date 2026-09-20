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
  // x = a curated X/Twitter personality or org account — fetched by a
  // SEPARATE once-a-day worker (src/workers/radar-x.ts /
  // .github/workflows/x-personalities.yml), never by the 30-min
  // radar.ts cron — X bills per post read, so these must not share that
  // cadence. The real account list lives in src/ingest/x-timeline.ts
  // (needs each account's numeric user id, not just its handle); the
  // entries below just make each account a real `sources` row so its
  // tweets can join into getFilteredRadarItems like any other source.
  // instagram-discovery = a public Business/Creator Instagram account —
  // INVESTIGATED 2026-09-20, NOT BUILT: Meta's Business Discovery feature
  // (the free, official way to read another account's public media)
  // turns out to be Facebook-Login-only — it does NOT work with the
  // "Instagram API with Instagram Login" app @atlasdepeche already has
  // (confirmed live: that's an IGAA-prefixed token against
  // graph.instagram.com; Business Discovery needs the older
  // Facebook-Login flow's EAA-prefixed token against graph.facebook.com,
  // which requires a linked Facebook Page + Business Verification — the
  // exact complexity src/distribution/instagram.ts's own comment
  // explains was deliberately avoided when @atlasdepeche's app was set
  // up). No connector exists for this type; the 4 entries below are kept
  // "paused" as a researched-and-documented dead end, not a guess.
  type: "rss" | "html" | "html_list" | "x" | "instagram-discovery";
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
    //
    // Paused later the same day: confirmed live that the radar (running on
    // GitHub Actions) got a 403 on every single run for 5+ hours straight
    // (roughly 11 consecutive 30-min cycles), while a direct fetch from a
    // different environment succeeded every time in that same window --
    // points at Cloudflare blocking GitHub Actions' shared runner IP range
    // specifically, not this project's polling behavior. Not something a
    // UA tweak fixes; needs an official arrangement or moving the radar
    // off GitHub Actions, neither done yet.
    name: "Medi1 News",
    type: "html_list",
    url: "https://www.medi1news.com/fr/categorie/news",
    language: "fr",
    category: "news",
    status: "paused",
    robotsPolicy: "allows all",
    tosNotes:
      "Reference media — corroboration signal only, never copy body text. Cloudflare appears to block GitHub Actions' IP range specifically (see status note above) — reachable fine from elsewhere.",
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
    // Paused 2026-09-19 (same day added): confirmed live that the radar
    // (running on GitHub Actions) got a 403 on every single run for 5+
    // hours straight, while a direct fetch from a different environment
    // succeeded every time in that same window — same pattern, same
    // apparent cause, as Medi1 News above (Cloudflare blocking GitHub
    // Actions' shared runner IP range specifically). This was one of the
    // most productive sources by volume before this started.
    name: "Hibapress (Français)",
    type: "rss",
    url: "https://fr.hibapress.com/feed",
    language: "fr",
    category: "news",
    status: "paused",
    robotsPolicy:
      "robots.txt has no blanket Disallow for our UA. Cloudflare appears to block GitHub Actions' IP range specifically — reachable fine from elsewhere.",
  },

  // --- Added 2026-09-19: international press covering Morocco/Moroccans ---
  // Explicitly requested: worldwide French and Arabic outlets, filtered
  // down to Morocco-relevant stories by the existing isMoroccoRelevant
  // keyword filter (radar-filters.ts) — same mechanism already used for
  // the domestic Moroccan outlets' occasional off-topic wire stories, just
  // pointed at feeds that are MOSTLY off-topic for us by design. Every URL
  // verified live (200, real RSS/XML body, robots.txt checked) before
  // being added. Rejected after checking, not skipped silently: Le Monde
  // Afrique (robots.txt explicitly prohibits automated crawling, citing
  // French database-producer IP law — a real legal notice, not a generic
  // block) and L'Équipe (its real public RSS path 403'd; the one URL that
  // did respond was an internal-looking API subdomain with no robots.txt
  // of its own, not something to rely on). Al Jazeera / Al Arabiya / Sky
  // News Arabia's RSS endpoints tried and 404/403'd — not pursued further.
  {
    name: "Jeune Afrique",
    type: "rss",
    url: "https://www.jeuneafrique.com/feed/",
    language: "fr",
    category: "news",
    status: "active",
    robotsPolicy: "robots.txt served empty — no Disallow rules at all",
    tosNotes: "Pan-African magazine, not Morocco-specific — relies on the Morocco-relevance filter.",
  },
  {
    name: "RFI Afrique",
    type: "rss",
    url: "https://www.rfi.fr/fr/afrique/rss",
    language: "fr",
    category: "news",
    status: "active",
    robotsPolicy: "robots.txt has no blanket Disallow for our UA",
    tosNotes: "Pan-African section of RFI, not Morocco-specific — relies on the Morocco-relevance filter.",
  },
  {
    name: "France 24 Afrique",
    type: "rss",
    url: "https://www.france24.com/fr/afrique/rss",
    language: "fr",
    category: "news",
    status: "active",
    robotsPolicy: "robots.txt has no blanket Disallow for our UA",
    tosNotes: "Pan-African section of France 24, not Morocco-specific — relies on the Morocco-relevance filter.",
  },
  {
    name: "Asharq Al-Awsat",
    type: "rss",
    url: "https://aawsat.com/feed",
    language: "ar",
    category: "news",
    status: "active",
    robotsPolicy: "robots.txt has no blanket Disallow for our UA",
    tosNotes: "Pan-Arab daily, not Morocco-specific — relies on the Morocco-relevance filter.",
  },
  {
    name: "Al Quds Al Arabi",
    type: "rss",
    url: "https://www.alquds.co.uk/feed/",
    language: "ar",
    category: "news",
    status: "active",
    robotsPolicy: "robots.txt allows all, but declares Crawl-delay: 120 — our 30-min polling interval already clears that by a wide margin.",
    tosNotes: "Pan-Arab daily, not Morocco-specific — relies on the Morocco-relevance filter.",
  },
  {
    name: "BBC Arabic",
    type: "rss",
    url: "https://feeds.bbci.co.uk/arabic/rss.xml",
    language: "ar",
    category: "news",
    status: "active",
    robotsPolicy: "robots.txt (feeds.bbci.co.uk) has no Disallow relevant to /arabic/rss.xml",
    tosNotes: "International outlet, not Morocco-specific — relies on the Morocco-relevance filter.",
  },

  // --- Added 2026-09-20: requested "all Moroccan newspapers, plus worldwide
  // fr/ar press covering Morocco/Moroccans" ---------------------------------
  // Every URL below verified live the same way (200, real RSS/XML body with
  // current-dated real items, robots.txt checked) before being added.
  // Candidates tried and rejected this round, not skipped silently:
  // Al Massae (almassae.press.ma) and Akhbar Al Yaoum (akhbaralyaoum24.com)
  // — both domains fully unreachable (DNS/connection failure, not a block);
  // Al Bayane (albayane.press.ma) — 403 on a polite fetch; L'Opinion
  // (lopinion.ma) — no RSS endpoint found and its homepage is
  // client-rendered with almost no server-side article links, would need
  // the same html_list investigation as Le360, not done this round; Maroc
  // Hebdo (maroc-hebdo.com) — its /feed path is just the homepage shell
  // (no real RSS), AND its robots.txt explicitly names and blocks
  // "ClaudeBot" — skipped out of respect for that even though our own UA
  // isn't the one named; Le Soir Échos (lesoir-echos.com) — feed responds
  // 200 but its content is stale/dead (a 2011 article resurfacing under a
  // Dec-2025 lastBuildDate) — same "hijacked/parked feed" pattern already
  // rejected once for sahara-question.com, not a real live source.
  {
    // A genuinely Moroccan Arabic outlet, not found in the original source
    // hunt — confirmed live 2026-09-20: real, current-dated Moroccan
    // stories (Casablanca festival, the Sept-23 legislative elections,
    // Settat prosecutor's office), not a generic pan-Arab wire.
    name: "Ahdath.info",
    type: "rss",
    url: "https://ahdath.info/feed",
    language: "ar",
    category: "news",
    status: "active",
    robotsPolicy: "robots.txt has no blanket Disallow for our UA",
  },
  // Middle East Eye (Français) was added here 2026-09-20, then removed the
  // same day: its /fr/rss "Section Feed" returns 200 with real-looking
  // French content, but every <pubDate> is frozen at May 2024 — 2+ years
  // dead — and rss-parser can't parse the French day/month names in that
  // date string anyway (isoDate ends up undefined), so every item landed
  // in source_items with publishedAt=null and sorted by fetchedAt instead,
  // making 2-year-old content display as published today. Same
  // "hijacked/parked feed" pattern already rejected once for
  // sahara-question.com and once for Le Soir Échos above — should have
  // checked pubDate recency before adding this one too, not just that it
  // 200'd with real-sounding content. The dead itok= image-derivative
  // tokens on its photos (all 404 now) were the symptom that surfaced
  // this, not the actual problem.
  {
    name: "Anadolu Agency (Français)",
    type: "rss",
    url: "https://www.aa.com.tr/fr/rss/default?cat=guncel",
    language: "fr",
    category: "news",
    status: "active",
    robotsPolicy: "robots.txt has no blanket Disallow for our UA",
    tosNotes: "Turkish state wire's French general-news feed, not Morocco-specific — relies on the Morocco-relevance filter.",
  },
  {
    name: "Anadolu Agency (Arabe)",
    type: "rss",
    url: "https://www.aa.com.tr/ar/rss/default?cat=guncel",
    language: "ar",
    category: "news",
    status: "active",
    robotsPolicy: "robots.txt has no blanket Disallow for our UA",
    tosNotes: "Turkish state wire's Arabic general-news feed, not Morocco-specific — relies on the Morocco-relevance filter.",
  },
  {
    name: "TV5MONDE Informations",
    type: "rss",
    url: "https://information.tv5monde.com/rss.xml",
    language: "fr",
    category: "news",
    status: "active",
    robotsPolicy: "robots.txt declares Crawl-delay: 10 for our UA — our 30-min polling interval clears that by a wide margin",
    tosNotes: "General international feed, not Africa/Morocco-specific (the dedicated /afrique/rss.xml 404s) — relies on the Morocco-relevance filter.",
  },

  // --- Added 2026-09-20: curated X/Twitter personalities & orgs ------------
  // Requested directly: auto-publish tweets from Moroccan footballers and
  // worldwide personalities/orgs that talk about Morocco/Moroccans. X's API
  // stopped being free in Feb 2026 (pay-per-read, no way around it — see
  // src/ingest/x-timeline.ts's own comment and the real free alternatives
  // tried and confirmed dead the same day: the unofficial syndication
  // endpoint, a public RSS-Bridge instance, two "live" Nitter instances).
  // User explicitly chose to pay (~$5/month, hard spend cap set on the X
  // developer account itself — requests simply stop once it's hit, can't
  // overspend). Every account's numeric user id was resolved against the
  // real API before being added (see X_ACCOUNTS in x-timeline.ts) — several
  // guessed handles for other players (Bounou, Ziyech, Amrabat, Mazraoui)
  // resolved to real-looking but fake/squatted accounts (0-500 followers,
  // 0-3 tweets) and were dropped rather than risk showing a stranger's
  // tweets under a real person's name.
  //
  // `url` here is only the profile link shown to a reader — the actual
  // fetch (numeric user id, once/day, never the 30-min radar.ts cron) is
  // src/workers/radar-x.ts, driven by X_ACCOUNTS, not by this array.
  {
    name: "Achraf Hakimi (X)",
    type: "x",
    url: "https://x.com/AchrafHakimi",
    language: "fr",
    category: "personalities",
    status: "active",
    robotsPolicy: "official X API, app-only Bearer Token, pay-per-read",
  },
  {
    name: "Ayoub El Kaabi (X)",
    type: "x",
    url: "https://x.com/Ayoub_ElKaabi",
    language: "fr",
    category: "personalities",
    status: "active",
    robotsPolicy: "official X API, app-only Bearer Token, pay-per-read",
  },
  {
    name: "FRMF (X)",
    type: "x",
    url: "https://x.com/FRMFOFFICIEL",
    language: "fr",
    category: "personalities",
    status: "active",
    robotsPolicy: "official X API, app-only Bearer Token, pay-per-read",
  },
  {
    // category "personalities-intl", not "personalities" — see
    // public-site.ts's getFilteredRadarItems: Moroccan personality
    // accounts show every tweet (no relevance filter needed, they ARE the
    // signal), but an international org posts about far more than
    // Morocco, so this category keeps the Morocco-relevance filter
    // applied to these three specifically.
    name: "CAF Français (X)",
    type: "x",
    url: "https://x.com/caf_online_FR",
    language: "fr",
    category: "personalities-intl",
    status: "active",
    robotsPolicy: "official X API, app-only Bearer Token, pay-per-read",
    tosNotes: "Pan-African confederation, not Morocco-specific content — kept anyway per explicit request to include worldwide orgs covering Morocco.",
  },
  {
    name: "CAF Arabe (X)",
    type: "x",
    url: "https://x.com/caf_online_AR",
    language: "ar",
    category: "personalities-intl",
    status: "active",
    robotsPolicy: "official X API, app-only Bearer Token, pay-per-read",
    tosNotes: "Pan-African confederation, not Morocco-specific content — kept anyway per explicit request to include worldwide orgs covering Morocco.",
  },

  // --- Added 2026-09-20: official Moroccan institutions ("before the
  // newspapers") — requested directly: government/police/institutional
  // sources that often report something first, hours before it becomes a
  // newspaper article. Researched Telegram, YouTube, Instagram Business
  // Discovery, and gov/institutional websites — real yield this round was
  // 2 websites; documenting the rest honestly rather than silently
  // dropping it:
  //   - Telegram: searched broadly (Interior, DGSN, Protection Civile,
  //     MAP, SNRT, 2M, generic "canal officiel Maroc"), found ZERO
  //     Moroccan government/state-media Telegram presence — this looks
  //     like a genuine regional finding (Morocco's official
  //     communication runs on X/Facebook, not Telegram), not a research
  //     gap to keep chasing.
  //   - YouTube: every candidate channel found (Al Aoula TV, 2M Maroc)
  //     was abandoned — years of zero uploads (2010, 2017-2018 last
  //     video). Their real current channel, if any, wasn't found this
  //     round — worth one more targeted pass someday.
  //   - Instagram Business Discovery: not attempted yet — needs starting
  //     from each institution's own site footer links rather than open
  //     search, not done this round.
  //   - diplomatie.ma (Foreign Affairs): active WAF rejects the polite
  //     bot UA outright ("Request Rejected"), not a robots.txt block —
  //     same "needs an arrangement, don't bypass" stance as map.ma.
  //   - dgsn.gov.ma (police), protectioncivile.gov.ma, rabat.ma,
  //     agriculture.gov.ma, travail.gov.ma, equipement.gov.ma,
  //     pm.gov.ma, minculture.gov.ma: real domains (several confirmed
  //     via the SGG's own official links directory), all unreachable
  //     (connection timeout) from this environment — same pattern as
  //     map.ma/cg.gov.ma already below.
  //   - social.gov.ma, parlement.ma, csefrs.ma: 403.
  //   - hcp.ma, men.gov.ma (Education): real dated content exists on
  //     each site, but neither has a clean listing page — their
  //     homepages mix real press items with static nav-menu links
  //     (HCP) or unrelated content (men.gov.ma's homepage pulled in a
  //     World Cup football article) — confirmed live via
  //     fetchArticleListItems, not assumed. Needs each site's real
  //     dedicated news-listing sub-path found before enabling, same as
  //     Maroc.ma's own earlier /fr/actualites upgrade.
  {
    name: "Ministère de la Justice (Maroc)",
    type: "rss",
    url: "https://www.justice.gov.ma/feed",
    language: "ar",
    category: "institutional",
    status: "active",
    robotsPolicy: "no robots.txt served (404) — nothing to restrict our UA",
    tosNotes: "Official ministry — signal only, quote and attribute, never claim as original reporting.",
  },
  {
    name: "Bank Al-Maghrib (Banque centrale)",
    type: "html_list",
    url: "https://www.bkam.ma/Communiques",
    language: "fr",
    category: "institutional",
    status: "active",
    robotsPolicy: "robots.txt only disallows /switch/; has a sitemap.xml",
    tosNotes: "Central bank communiqués (treasury bonds, monetary policy) — exactly the 'official, before the press' source requested. Signal only, never claim as original reporting.",
  },

  // --- Added 2026-09-20, second research pass: more official sources ------
  // AMMC (securities regulator) and ACAPS (insurance regulator) were both
  // tried and rejected — real dated content exists (AMMC: AXA/Cartier
  // Saada prospectus items; ACAPS similar) but each is mixed with static
  // nav-menu links sharing one identical timestamp — same "homepage isn't
  // a clean listing" problem as HCP/men.gov.ma above, confirmed live via
  // fetchArticleListItems, not assumed. Also rejected this round (all
  // genuinely unreachable/broken, not guessed): tanger.ma (its own
  // homepage links 404), mcinet.gov.ma (Industry/Commerce — everything
  // undated), ocpgroup.ma (403), oncf.ma/one.org.ma/onee.ma/cnss.ma/
  // anapec.org/finances.gov.ma (unreachable), tourisme.gov.ma (525),
  // casablanca.ma/marrakech.ma/fes.ma/rabat.ma (unreachable).
  {
    name: "Commune d'Agadir",
    type: "html_list",
    url: "https://agadir.ma/",
    language: "ar",
    category: "institutional",
    status: "active",
    robotsPolicy: "not fully inspected — check before relying on it at higher volume",
    tosNotes: "Municipal council session agendas + public hiring competition results, real Morocco-relevance beyond the capital/Casablanca. 6 of 8 confirmed real+dated live via fetchArticleListItems, 2 are undated static section links (acceptable ratio, isMoroccoRelevant/date-sort naturally deprioritize those).",
  },
  {
    // Corrects the earlier (2026-09-20, first research pass) finding of
    // an abandoned Al Aoula channel (youtube.com/AlAoulaTV,
    // UCbeZhY00sumc2gbVijM4wvg, dead since 2010) — that was the wrong
    // channel. This is SNRT's real, current one, confirmed live: 15 real
    // items, several dated THE SAME DAY this was added, French/Arabic/
    // Amazigh news bulletins ("Telediario Al Aoula", "الأخبار الأمازيغية
    // الأولى"...). A YouTube channel's RSS needs no API key — same plain
    // `rss` connector as everything else.
    name: "Al Aoula TV (YouTube)",
    type: "rss",
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCuSyI3P8JZOD1nPa_pqjutg",
    language: "fr",
    category: "institutional",
    status: "active",
    robotsPolicy: "official YouTube channel RSS feed — no auth, no scraping",
    tosNotes: "Public broadcaster's real, current channel — video titles only (no transcript), attribute and link back, never claim as original reporting.",
  },

  // --- Added 2026-09-20: Instagram Business Discovery candidates ---------
  // PAUSED, not active — see the "instagram-discovery" comment on the
  // type union above: this Meta feature turns out to require the older
  // Facebook-Login app flow, which @atlasdepeche's app deliberately
  // doesn't use. No connector exists to fetch these; kept here as a
  // record of real, verified-active accounts (by follower count/profile
  // page, not by a live API call) in case a future Facebook Page
  // linkage ever makes this worth revisiting, rather than losing the
  // research.
  {
    name: "Ministère de la Santé (Instagram)",
    type: "instagram-discovery",
    url: "https://www.instagram.com/msps_gov_ma",
    language: "fr",
    category: "institutional",
    status: "paused",
    robotsPolicy: "official Meta Graph API, Business Discovery — requires Facebook-Login app flow we don't have",
    tosNotes: "~405K followers, ~1865 posts at research time — genuinely active official account.",
  },
  {
    name: "MAP (Maghreb Arabe Presse) (Instagram)",
    type: "instagram-discovery",
    url: "https://www.instagram.com/agence_map",
    language: "fr",
    category: "institutional",
    status: "paused",
    robotsPolicy: "official Meta Graph API, Business Discovery — requires Facebook-Login app flow we don't have",
    tosNotes: "The national wire's own website (map.ma) and Telegram/YouTube presence were both dead ends — this was the one real access path found so far for MAP.",
  },
  {
    name: "Al Aoula TV (Instagram)",
    type: "instagram-discovery",
    url: "https://www.instagram.com/al_aoula",
    language: "ar",
    category: "institutional",
    status: "paused",
    robotsPolicy: "official Meta Graph API, Business Discovery — requires Facebook-Login app flow we don't have",
    tosNotes: "~2M followers at research time — genuinely active official account.",
  },
  {
    name: "OCP Group (Instagram)",
    type: "instagram-discovery",
    url: "https://www.instagram.com/ocpgroup",
    language: "fr",
    category: "institutional",
    status: "paused",
    robotsPolicy: "official Meta Graph API, Business Discovery — requires Facebook-Login app flow we don't have",
    tosNotes: "~40K followers at research time. ocpgroup.ma itself 403'd a polite fetch — this was the one real access path found so far for OCP.",
  },
  {
    name: "beIN SPORTS (X)",
    type: "x",
    url: "https://x.com/beINSPORTS",
    language: "ar",
    category: "personalities-intl",
    status: "active",
    robotsPolicy: "official X API, app-only Bearer Token, pay-per-read",
    tosNotes: "Pan-Arab sports broadcaster, not Morocco-specific content — kept anyway per explicit request to include worldwide orgs covering Morocco.",
  },
];
