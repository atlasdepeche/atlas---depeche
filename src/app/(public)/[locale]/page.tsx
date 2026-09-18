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
      <h1>{dict.homeLabel}</h1>
      {items.length === 0 && <p>{dict.noArticlesYet}</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {items.map((article) => (
          <li key={article.id} style={{ marginBottom: "1.75rem" }}>
            <Link
              href={`/${locale}/${article.slug}`}
              style={{ fontSize: "1.15rem", fontWeight: 600, textDecoration: "none", color: "inherit" }}
            >
              {article.title}
            </Link>
            {article.publishedAt && (
              <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.25rem" }}>
                {article.publishedAt.toISOString().slice(0, 10)}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
