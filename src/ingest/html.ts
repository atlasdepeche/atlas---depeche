import { createHash } from "node:crypto";
import { politeFetch } from "./fetch-utils";
import type { RawItem } from "./types";

/**
 * Generic "authorized HTML fetch" connector for sources with no RSS feed
 * (mostly official institutional pages). It does not scrape structured
 * content per-site — it just detects that the page changed since last poll
 * and surfaces the page itself as a signal. Site-specific extraction can be
 * layered on later per source; this is deliberately coarse for Phase 1.
 *
 * Idempotency: externalId = sha256 of the stripped page text, so an
 * unchanged page produces the same externalId on every poll and the
 * `source_items` unique index (source_id, external_id) makes re-ingesting
 * it a no-op — no "previous hash" lookup needed here.
 */

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const captured = match?.[1];
  return captured ? captured.replace(/\s+/g, " ").trim() : "(no title)";
}

function extractOgImage(html: string): string | undefined {
  const match =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  return match?.[1];
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchHtmlChangeSignal(pageUrl: string): Promise<RawItem> {
  const html = await politeFetch(pageUrl);
  const text = stripTags(html).slice(0, 20_000);
  const hash = createHash("sha256").update(text).digest("hex");

  return {
    externalId: hash,
    url: pageUrl,
    title: extractTitle(html),
    summary: text.slice(0, 400) || undefined,
    publishedAt: undefined,
    imageUrl: extractOgImage(html),
  };
}
