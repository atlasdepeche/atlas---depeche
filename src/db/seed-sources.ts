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
 */

export interface SeedSource {
  name: string;
  type: "rss" | "html";
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
    name: "Maroc.ma (portail officiel, FR)",
    type: "html",
    url: "https://www.maroc.ma/fr",
    language: "fr",
    category: "institutional",
    status: "active",
    robotsPolicy: "homepage path allowed; /admin, /search, /user disallowed",
    tosNotes:
      "Official government portal — signal only, quote and attribute, never claim as original reporting.",
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
