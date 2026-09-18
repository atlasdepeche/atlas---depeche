import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  SUPPORTED_LOCALES,
  LOCALE_DIR,
  isLocale,
  getDictionary,
  type Locale,
} from "@/i18n/locales";

/**
 * A second root layout (route group) alongside `(admin)` — each defines its
 * own <html>/<body>, per Next.js's documented "multiple root layouts"
 * pattern. This one owns the public, bilingual product; `(admin)` owns the
 * internal dev tools. See CLAUDE.md — Publication modes / Language policy.
 */

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: { default: dict.siteName, template: `%s — ${dict.siteName}` },
    description: dict.tagline,
  };
}

export default async function PublicLocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);
  const otherLocale: Locale = locale === "ar" ? "fr" : "ar";

  return (
    <html lang={locale} dir={LOCALE_DIR[locale]}>
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, color: "#1a1a1a" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1.25rem 2rem",
            borderBottom: "1px solid #ddd",
          }}
        >
          <Link href={`/${locale}`} style={{ fontWeight: 700, fontSize: "1.25rem", textDecoration: "none", color: "inherit" }}>
            {dict.siteName}
          </Link>
          <Link href={`/${otherLocale}`} style={{ color: "#555" }}>
            {dict.otherLocaleLabel}
          </Link>
        </header>

        <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem" }}>{children}</main>

        <footer
          style={{
            borderTop: "1px solid #ddd",
            marginTop: "3rem",
            padding: "1.5rem 2rem",
            fontSize: "0.9rem",
            color: "#666",
          }}
        >
          <p>{dict.tagline}</p>
          <nav style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem" }}>
            <Link href={`/${locale}/legal/mentions`}>{dict.legal.mentions}</Link>
            <Link href={`/${locale}/legal/privacy`}>{dict.legal.privacy}</Link>
            <Link href={`/${locale}/legal/corrections`}>{dict.legal.corrections}</Link>
            <Link href={`/${locale}/contact`}>{dict.legal.contact}</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
