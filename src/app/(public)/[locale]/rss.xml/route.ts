import { NextResponse } from "next/server";
import { isLocale, getDictionary } from "@/i18n/locales";
import { getPublishedArticles } from "@/lib/public-site";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const dict = getDictionary(locale);
  const items = await getPublishedArticles(locale);
  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

  const itemsXml = items
    .map((article) => {
      const url = `${siteUrl}/${locale}/${article.slug}`;
      const pubDate = article.publishedAt ? `<pubDate>${article.publishedAt.toUTCString()}</pubDate>` : "";
      return `<item><title>${escapeXml(article.title)}</title><link>${url}</link><guid>${url}</guid>${pubDate}</item>`;
    })
    .join("");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<rss version="2.0"><channel>` +
    `<title>${escapeXml(dict.siteName)}</title>` +
    `<link>${siteUrl}/${locale}</link>` +
    `<description>${escapeXml(dict.tagline)}</description>` +
    `<language>${locale}</language>` +
    itemsXml +
    `</channel></rss>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
