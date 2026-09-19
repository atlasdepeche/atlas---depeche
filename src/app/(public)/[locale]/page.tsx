import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, getDictionary, type Locale } from "@/i18n/locales";
import { getRadarItems } from "@/lib/public-site";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function LocaleHomePage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);
  const { page: pageParam } = await searchParams;
  const requestedPage = Math.max(1, Number(pageParam) || 1);

  const { items, page, totalPages } = await getRadarItems(locale as Locale, requestedPage);

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
            {dict.noItemsYet}
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
        /* ── Radar cards ──────────────────────────────────── */
        <div>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "var(--text-3xl)",
              marginBlockEnd: "var(--space-8)",
              backgroundImage: "linear-gradient(135deg, var(--color-accent), #D62976)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {dict.homeLabel}
          </h1>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 16rem), 1fr))",
              gap: "var(--space-6)",
              marginBlockEnd: "var(--space-8)",
            }}
          >
            {items.map((item) => {
              const date = item.publishedAt ?? item.fetchedAt;
              return (
                <article
                  key={item.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    border: "1px solid var(--color-border-subtle)",
                    borderRadius: "6px",
                    overflow: "hidden",
                    background: "var(--color-bg-elevated)",
                  }}
                >
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener nofollow"
                    aria-label={item.title}
                    style={{ display: "block" }}
                  >
                    {item.imageUrl ? (
                      // Arbitrary external domains — a fixed next/image
                      // remotePatterns allowlist isn't practical for a
                      // radar that adds sources over time.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        style={{
                          width: "100%",
                          aspectRatio: "16 / 9",
                          objectFit: "cover",
                          display: "block",
                          background: "var(--color-bg-subtle)",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          aspectRatio: "16 / 9",
                          background: "var(--color-bg-subtle)",
                        }}
                      />
                    )}
                  </a>
                  <div
                    style={{
                      padding: "var(--space-4)",
                      display: "flex",
                      flexDirection: "column",
                      flex: 1,
                    }}
                  >
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener nofollow"
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "var(--text-lg)",
                        fontWeight: 600,
                        lineHeight: 1.3,
                        textDecoration: "none",
                        color: "var(--color-text)",
                        marginBlockEnd: "var(--space-2)",
                      }}
                    >
                      {item.title}
                    </a>
                    <div
                      style={{
                        marginBlockStart: "auto",
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        gap: "var(--space-2)",
                        fontFamily: "var(--font-sans)",
                        fontSize: "var(--text-xs)",
                        color: "var(--color-text-tertiary)",
                      }}
                    >
                      <span>{item.sourceName}</span>
                      {date && <time dateTime={date.toISOString()}>{date.toISOString().slice(0, 10)}</time>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* ── Pagination ─────────────────────────────────── */}
          {totalPages > 1 && (
            <nav
              aria-label={dict.pagination.pageOf(page, totalPages)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
              }}
            >
              {page > 1 ? (
                <Link href={`/${locale}?page=${page - 1}`} style={{ color: "var(--color-accent)" }}>
                  {dict.pagination.previous}
                </Link>
              ) : (
                <span />
              )}
              <span style={{ color: "var(--color-text-tertiary)" }}>
                {dict.pagination.pageOf(page, totalPages)}
              </span>
              {page < totalPages ? (
                <Link href={`/${locale}?page=${page + 1}`} style={{ color: "var(--color-accent)" }}>
                  {dict.pagination.next}
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
