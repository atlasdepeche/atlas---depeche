import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, getDictionary, type Locale } from "@/i18n/locales";
import { searchArticles } from "@/lib/public-site";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return { title: dict.searchLabel };
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query ? await searchArticles(locale as Locale, query) : [];

  return (
    <div style={{ maxInlineSize: "var(--max-width-content)", marginInline: "auto" }}>
      <h1
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "var(--text-3xl)",
          marginBlockEnd: "var(--space-6)",
        }}
      >
        {dict.searchLabel}
      </h1>

      {/* Search form */}
      <form
        method="get"
        action={`/${locale}/search`}
        style={{ marginBlockEnd: "var(--space-8)" }}
      >
        <label htmlFor="search-input" style={{ display: "block", marginBlockEnd: "var(--space-2)" }}>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              color: "var(--color-text-secondary)",
            }}
          >
            {dict.searchLabel}
          </span>
        </label>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <input
            id="search-input"
            name="q"
            type="search"
            defaultValue={query}
            placeholder={dict.searchPlaceholder}
            required
            style={{
              flex: 1,
              padding: "var(--space-3) var(--space-4)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-base)",
              border: "1px solid var(--color-border)",
              borderRadius: "4px",
              background: "var(--color-bg-elevated)",
              color: "var(--color-text)",
              outline: "none",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "var(--space-3) var(--space-6)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              background: "var(--color-accent)",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {dict.searchLabel}
          </button>
        </div>
      </form>

      {/* Results */}
      {query && (
        <div>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              color: "var(--color-text-tertiary)",
              marginBlockEnd: "var(--space-4)",
            }}
          >
            {dict.searchResults} : « {query} » ({results.length})
          </p>

          {results.length === 0 ? (
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "var(--text-lg)",
                color: "var(--color-text-secondary)",
                paddingBlock: "var(--space-8)",
              }}
            >
              {dict.searchNoResults}
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {results.map((article) => (
                <li
                  key={article.id}
                  style={{
                    paddingBlockEnd: "var(--space-6)",
                    marginBlockEnd: "var(--space-6)",
                    borderBlockEnd: "1px solid var(--color-border-subtle)",
                  }}
                >
                  <Link
                    href={`/${locale}/${article.slug}`}
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "var(--text-xl)",
                      fontWeight: 600,
                      textDecoration: "none",
                      color: "var(--color-text)",
                      display: "block",
                      marginBlockEnd: "var(--space-1)",
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
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
