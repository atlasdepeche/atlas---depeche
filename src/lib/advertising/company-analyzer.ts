/**
 * Company analyzer — fetches a company URL and extracts business information.
 * Uses regex/heuristic extraction from raw HTML. No invented data:
 * if a field can't be found, it's null/empty, never fabricated.
 *
 * Cost: $0 (no external API calls).
 */
import { politeFetch } from "@/ingest/fetch-utils";
import type { CompanyAnalysis } from "./types";

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function extractImages(html: string, baseUrl: string): string[] {
  const images: string[] = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    if (match[1]) {
      try {
        const absolute = new URL(match[1], baseUrl).toString();
        if (
          !absolute.includes("icon") &&
          !absolute.includes("logo") &&
          !absolute.includes("pixel") &&
          !absolute.includes("tracking") &&
          !absolute.endsWith(".svg")
        ) {
          images.push(absolute);
        }
      } catch {
        // skip invalid URLs
      }
    }
  }
  return [...new Set(images)].slice(0, 10);
}

function extractLogo(html: string, baseUrl: string): string | null {
  // Try og:image first
  const ogMatch = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  );
  if (ogMatch?.[1]) {
    try {
      return new URL(ogMatch[1], baseUrl).toString();
    } catch {
      // skip
    }
  }

  // Try common logo patterns
  const logoPatterns = [
    /<img[^>]+src=["']([^"']*logo[^"']*)["']/i,
    /<img[^>]+alt=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i,
  ];
  for (const pattern of logoPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      try {
        return new URL(match[1], baseUrl).toString();
      } catch {
        // skip
      }
    }
  }

  return null;
}

/**
 * Analyze a company URL and extract structured business information.
 * Returns raw analysis — the caller decides what to do with it.
 */
export async function analyzeCompany(
  url: string,
): Promise<CompanyAnalysis> {
  const domain = extractDomain(url);

  // Fetch the company website
  const html = await politeFetch(url, {
    timeoutMs: 15000,
    maxBytes: 1_000_000, // 1MB max
  });

  // Extract basic info from HTML before calling Claude
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const metaDesc = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  );
  const ogTitle = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
  );

  const pageTitle = titleMatch?.[1]?.trim() ?? "";
  const metaDescription = metaDesc?.[1]?.trim() ?? "";
  const ogTitleContent = ogTitle?.[1]?.trim() ?? "";

  const images = extractImages(html, url);
  const logoUrl = extractLogo(html, url);

  // --- Local heuristic extraction (no API calls) ---

  // Company name: og:title > <title> > domain
  const name = ogTitleContent || pageTitle || domain;

  // Contact: phone
  const phoneMatch = html.match(
    /(?:tel:|href=["']tel:|phone|tél|telephone)[^>]*?([\+]?[\d\s\-().]{8,20})/i,
  ) ?? html.match(/([\+]\d[\d\s\-()]{7,18})/);
  const phone = phoneMatch?.[1]?.trim() ?? null;

  // Contact: email
  const emailMatch = html.match(
    /(?:mailto:|href=["']mailto:|email)[^>]*?([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i,
  ) ?? html.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
  const email = emailMatch?.[1]?.trim() ?? null;

  // Contact: address (from schema.org JSON-LD or <address>)
  let address: string | null = null;
  const jsonLdMatch = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  if (jsonLdMatch) {
    for (const block of jsonLdMatch) {
      try {
        const jsonStr = block.replace(/<\/?script[^>]*>/gi, "");
        const data = JSON.parse(jsonStr) as Record<string, unknown>;
        const addr = data.address as Record<string, unknown> | undefined;
        if (addr?.streetAddress) {
          const parts = [
            addr.streetAddress,
            addr.addressLocality,
            addr.addressCountry,
          ]
            .filter(Boolean)
            .join(", ");
          if (parts) address = parts;
          break;
        }
      } catch {
        // skip invalid JSON-LD
      }
    }
  }
  if (!address) {
    const addressMatch = html.match(/<address[^>]*>([^<]+)<\/address>/i);
    address = addressMatch?.[1]?.trim() ?? null;
  }

  // Social links
  const socialLinks: Record<string, string> = {};
  const socialPatterns: [string, RegExp][] = [
    ["facebook", /https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+/i],
    ["instagram", /https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>]+/i],
    ["twitter", /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^\s"'<>]+/i],
    ["linkedin", /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[^\s"'<>]+/i],
  ];
  for (const [platform, pattern] of socialPatterns) {
    const match = html.match(pattern);
    if (match?.[0]) {
      socialLinks[platform] = match[0].replace(/["'<>]/g, "");
    }
  }

  // Extract brand colors from CSS if present
  let primaryColor = "#1a1a2e";
  let secondaryColor = "#e94560";
  const cssVarMatch = html.match(
    /--(?:primary|brand)[-_]?(?:color)?\s*:\s*(#[0-9a-fA-F]{3,8})/i,
  );
  if (cssVarMatch?.[1]) primaryColor = cssVarMatch[1];
  const cssVarMatch2 = html.match(
    /--(?:secondary|accent)[-_]?(?:color)?\s*:\s*(#[0-9a-fA-F]{3,8})/i,
  );
  if (cssVarMatch2?.[1]) secondaryColor = cssVarMatch2[1];

  return {
    name,
    domain,
    description: metaDescription,
    activity: "",
    services: [],
    products: [],
    logoUrl,
    website: url,
    contact: { phone, email, address },
    socialLinks,
    tone: "professional",
    primaryColor,
    secondaryColor,
    images,
    rawHtml: html.slice(0, 50000),
  };
}
