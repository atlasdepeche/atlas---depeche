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
import { inter, lora } from "@/lib/fonts";
import { notoNaskhArabic } from "@/lib/fonts-ar";
import { ShareLinks } from "@/components/ShareLinks";
import { BreakingTicker } from "@/components/BreakingTicker";
import "@/app/globals.css";

/**
 * Second root layout (route group) alongside (admin) — each defines its
 * own <html>/<body>, per Next.js's documented "multiple root layouts"
 * pattern. This one owns the public, bilingual product.
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
    alternates: {
      languages: {
        ar: "/ar",
        fr: "/fr",
      },
    },
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

  // Apply font variables conditionally based on locale
  const fontClasses =
    locale === "ar"
      ? `${inter.variable} ${lora.variable} ${notoNaskhArabic.variable}`
      : `${inter.variable} ${lora.variable}`;

  return (
    <html lang={locale} dir={LOCALE_DIR[locale]} className={fontClasses}>
      <body>
        {/* Skip link for keyboard navigation — WCAG 2.2 AA */}
        <a href="#main-content" className="skip-link">
          {locale === "ar" ? "تخطي إلى المحتوى" : "Aller au contenu principal"}
        </a>

        {/* ── Masthead ─────────────────────────────────────── */}
        <header
          role="banner"
          style={{
            borderBlockEnd: "1px solid var(--color-border)",
            paddingBlock: "var(--space-4)",
            paddingInline: "var(--space-6)",
          }}
        >
          <div
            className="masthead-row"
            style={{
              maxWidth: "var(--max-width-page)",
              margin: "0 auto",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              rowGap: "var(--space-3)",
            }}
          >
            <Link
              href={`/${locale}`}
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 700,
                fontSize: "var(--text-2xl)",
                textDecoration: "none",
                letterSpacing: "-0.02em",
                backgroundImage: "linear-gradient(135deg, var(--color-accent), #D62976)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                // Without this, some mobile browsers keep the fallback
                // `color` instead of clipping to the gradient — the
                // gradient showed on desktop but rendered plain/blank on
                // mobile. WebkitTextFillColor is the actual color mobile
                // WebKit paints the glyphs with; color: transparent alone
                // isn't enough there.
                WebkitTextFillColor: "transparent",
                color: "transparent",
              }}
            >
              {dict.siteName}
            </Link>

            <nav aria-label={locale === "ar" ? "التنقل" : "Navigation"} style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
              <ShareLinks locale={locale} />
              <Link
                href={`/${otherLocale}`}
                style={{
                  color: "#ffffff",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  textDecoration: "none",
                  paddingBlock: "var(--space-1)",
                  paddingInline: "var(--space-3)",
                  borderRadius: "999px",
                  border: "none",
                  backgroundImage: "linear-gradient(135deg, var(--color-accent), #4F5BD5)",
                  boxShadow: "0 4px 10px rgba(0, 0, 0, 0.25)",
                  transition: "box-shadow var(--transition-fast), transform var(--transition-fast)",
                }}
              >
                {dict.otherLocaleLabel}
              </Link>
            </nav>
          </div>
        </header>

        <BreakingTicker locale={locale} />

        {/* ── Main content ────────────────────────────────── */}
        <main
          id="main-content"
          role="main"
          style={{
            maxWidth: "var(--max-width-page)",
            marginInline: "auto",
            paddingInline: "var(--space-6)",
            paddingBlock: "var(--space-8)",
          }}
        >
          {children}
        </main>

        {/* ── Footer ──────────────────────────────────────── */}
        <footer
          role="contentinfo"
          style={{
            borderBlockStart: "1px solid var(--color-border)",
            paddingBlock: "var(--space-6)",
            paddingInline: "var(--space-6)",
            marginTop: "var(--space-16)",
          }}
        >
          <div
            style={{
              maxWidth: "var(--max-width-page)",
              margin: "0 auto",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--color-text-tertiary)",
                marginBlockEnd: "var(--space-4)",
              }}
            >
              {dict.tagline}
            </p>
            <nav
              aria-label={locale === "ar" ? "روابط قانونية" : "Legal links"}
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-4)",
              }}
            >
              {[ 
                { href: `/${locale}/legal/mentions`, label: dict.legal.mentions },
                { href: `/${locale}/legal/privacy`, label: dict.legal.privacy },
                { href: `/${locale}/legal/corrections`, label: dict.legal.corrections },
                { href: `/${locale}/contact`, label: dict.legal.contact },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-sm)",
                    color: "var(--color-text-secondary)",
                    textDecoration: "none",
                    transition: "color var(--transition-fast)",
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-xs)",
                color: "var(--color-text-tertiary)",
                marginBlockStart: "var(--space-6)",
              }}
            >
              {locale === "ar"
                ? "© 2026 Atlas Dépêche. جميع الحقوق محفوظة."
                : "© 2026 Atlas Dépêche. Tous droits réservés."}
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
