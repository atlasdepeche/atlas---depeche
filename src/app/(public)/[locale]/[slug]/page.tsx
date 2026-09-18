import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";
import { getPublishedArticleBySlug } from "@/lib/public-site";

export const dynamic = "force-dynamic";

type Params = { locale: string; slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const article = await getPublishedArticleBySlug(locale, slug);
  if (!article) return {};

  const description = article.body.slice(0, 160);

  return {
    title: article.title,
    description,
    openGraph: {
      title: article.title,
      description,
      type: "article",
      locale,
      publishedTime: article.publishedAt?.toISOString(),
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const article = await getPublishedArticleBySlug(locale, slug);
  if (!article) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    inLanguage: locale,
  };

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 style={{ marginBottom: "0.5rem" }}>{article.title}</h1>
      {article.publishedAt && (
        <p style={{ color: "#666", fontSize: "0.9rem" }}>
          {article.publishedAt.toISOString().slice(0, 10)}
        </p>
      )}
      {article.status === "corrected" && (
        <p style={{ color: "#a15c00", fontSize: "0.9rem", fontWeight: 600 }}>
          {locale === "ar"
            ? `تم تصحيح هذا المقال بتاريخ ${article.updatedAt.toISOString().slice(0, 10)}`
            : `Cet article a été corrigé le ${article.updatedAt.toISOString().slice(0, 10)}`}
        </p>
      )}
      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, fontSize: "1.05rem" }}>{article.body}</div>
    </article>
  );
}
