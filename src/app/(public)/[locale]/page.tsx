import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, getDictionary } from "@/i18n/locales";
import { getPublishedArticles } from "@/lib/public-site";

export const dynamic = "force-dynamic";

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);
  const items = await getPublishedArticles(locale);

  return (
    <div>
      {items.length === 0 ? (
        /* ── Empty state — honest, not embarrassing ──────── */
        <div
          style={{
            textAlign: "center",
            paddingBlock: "var(--space-16)",
            paddingInline: "var(--space-4)",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "var(--text-3xl)",
              color: "var(--color-text)",
              marginBlockEnd: "var(--space-4)",
            }}
          >
            {dict.siteName}
          </h1>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "var(--text-lg)",
              color: "var(--color-text-secondary)",
              maxInlineSize: "30rem",
              marginInline: "auto",
              marginBlockEnd: "var(--space-2)",
            }}
          >
            {dict.noArticlesYet}
          </p>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              color: "var(--color-text-tertiary)",
            }}
          >
            {locale === "ar"
              ? "يمكنك متابعة آخر الأخبار عبر خدمة RSS."
              : "Suivez les dernières actualités via notre flux RSS."}
          </p>
          <Link
            href={`/${locale}/rss.xml`}
            style={{
              display: "inline-block",
              marginBlockStart: "var(--space-4)",
              paddingBlock: "var(--space-2)",
              paddingInline: "var(--space-4)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              color: "var(--color-accent)",
              border: "1px solid var(--color-accent)",
              borderRadius: "4px",
              textDecoration: "none",
              transition: "background-color var(--transition-fast), color var(--transition-fast)",
            }}
          >
            RSS
          </Link>
        </div>
      ) : (
        /* ── Article list ────────────────────────────────── */
        <div>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "var(--text-3xl)",
              marginBlockEnd: "var(--space-8)",
            }}
          >
            {dict.homeLabel}
          </h1>

          {/* Lead story (first article) */}
          {items[0] && (
            <article
              style={{
                paddingBlockEnd: "var(--space-8)",
                marginBlockEnd: "var(--space-8)",
                borderBlockEnd: "1px solid var(--color-border)",
              }}
            >
              <Link
                href={`/${locale}/${items[0].slug}`}
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "var(--text-3xl)",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  textDecoration: "none",
                  color: "var(--color-text)",
                  display: "block",
                  marginBlockEnd: "var(--space-2)",
                }}
              >
                {items[0].title}
              </Link>
              {items[0].publishedAt && (
                <time
                  dateTime={items[0].publishedAt.toISOString()}
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-sm)",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  {items[0].publishedAt.toISOString().slice(0, 10)}
                </time>
              )}
            </article>
          )}

          {/* Secondary stories grid */}
          {items.length > 1 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 20rem), 1fr))",
                gap: "var(--space-6)",
                marginBlockEnd: "var(--space-8)",
              }}
            >
              {items.slice(1).map((article) => (
                <article key={article.id}>
                  <Link
                    href={`/${locale}/${article.slug}`}
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "var(--text-xl)",
                      fontWeight: 600,
                      lineHeight: 1.3,
                      textDecoration: "none",
                      color: "var(--color-text)",
                      display: "block",
                      marginBlockEnd: "var(--space-2)",
                    }}
                  >
                    {article.title}
                  </Link>
                  {article.publishedAt && (
                    <time
                      dateTime={article.publishedAt.toISOString()}
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "var(--text-xs)",
                        color: "var(--color-text-tertiary)",
                      }}
                    >
                      {article.publishedAt.toISOString().slice(0, 10)}
                    </time>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
