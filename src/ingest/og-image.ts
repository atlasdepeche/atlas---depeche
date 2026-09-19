import { politeFetch } from "./fetch-utils";

/** Pure regex extraction — no network — so it's unit-testable on its own. */
export function extractOgImage(html: string): string | undefined {
  const match =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  return match?.[1];
}

/**
 * Fallback for items whose connector found no photo (most often RSS items
 * with no enclosure/media tag): fetch the item's own URL and read its
 * og:image, the same way a link preview card would. Never throws — a
 * failed fetch just means "still no image", not a broken radar run.
 */
export async function fetchOgImage(url: string): Promise<string | undefined> {
  try {
    const html = await politeFetch(url);
    return extractOgImage(html);
  } catch {
    return undefined;
  }
}
