import type { MetadataRoute } from "next";
import { SUPPORTED_LOCALES } from "@/i18n/locales";

const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

/**
 * Dynamic sitemap — lists all published articles for both locales.
 * Uses a DB query in production; for now, generates the locale roots
 * and lets crawlers discover articles via the RSS feeds and internal links.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const locales = SUPPORTED_LOCALES;

  // Static pages per locale
  const staticPages: MetadataRoute.Sitemap = locales.flatMap((locale) => [
    {
      url: `${SITE_URL}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/${locale}/legal/mentions`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/${locale}/legal/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/${locale}/legal/corrections`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/${locale}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.3,
    },
  ]);

  return staticPages;
}
