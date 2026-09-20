import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/locales";
import { getRecentInstagramLinks } from "@/lib/public-site";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

/**
 * The single link @atlasdepeche's Instagram bio points to. Instagram
 * captions can't carry a clickable link (see
 * src/distribution/instagram.ts's comment on that platform limit) and a
 * Story link sticker can't be added via the Graph API either — this page
 * is the actual workaround: every article @atlasdepeche has posted,
 * newest first, each one tapping straight through to its real source.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const title = locale === "ar" ? "روابط أطلس ديبيش" : "Liens Atlas Dépêche";
  const description =
    locale === "ar"
      ? "آخر المقالات التي شاركها أطلس ديبيش على إنستغرام، مع رابط مباشر لكل مقال."
      : "Les derniers articles partagés par Atlas Dépêche sur Instagram, avec un lien direct vers chacun.";

  return { title, description, robots: { index: false, follow: true } };
}

export default async function LinksPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const items = await getRecentInstagramLinks();

  return (
    <div style={{ maxInlineSize: "28rem", marginInline: "auto" }}>
      <h1
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "var(--text-2xl)",
          textAlign: "center",
          marginBlockEnd: "var(--space-2)",
          backgroundImage: "linear-gradient(135deg, var(--color-accent), #D62976)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
        }}
      >
        {locale === "ar" ? "روابط أطلس ديبيش" : "Liens Atlas Dépêche"}
      </h1>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          color: "var(--color-text-tertiary)",
          textAlign: "center",
          marginBlockEnd: "var(--space-8)",
        }}
      >
        {locale === "ar"
          ? "آخر المقالات المنشورة على انستغرام @atlasdepeche"
          : "Les derniers articles publiés sur Instagram @atlasdepeche"}
      </p>

      {items.length === 0 ? (
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--color-text-tertiary)",
            textAlign: "center",
          }}
        >
          {locale === "ar" ? "لا توجد منشورات بعد." : "Aucune publication pour le moment."}
        </p>
      ) : (
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener nofollow"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  padding: "var(--space-3)",
                  border: "2px solid #D4AF37",
                  borderRadius: "10px",
                  background: "var(--color-bg-elevated)",
                  textDecoration: "none",
                  color: "var(--color-text)",
                }}
              >
                {item.imageUrl ? (
                  // Arbitrary external domains — same reasoning as the
                  // homepage's radar cards, see src/app/(public)/[locale]/page.tsx.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    style={{
                      width: "3.5rem",
                      height: "3.5rem",
                      objectFit: "cover",
                      borderRadius: "6px",
                      flexShrink: 0,
                      background: "var(--color-bg-subtle)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "3.5rem",
                      height: "3.5rem",
                      borderRadius: "6px",
                      flexShrink: 0,
                      background: "var(--color-bg-subtle)",
                    }}
                  />
                )}
                <div style={{ minInlineSize: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "var(--text-sm)",
                      fontWeight: 600,
                      lineHeight: 1.3,
                      marginBlockEnd: "var(--space-1)",
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "var(--text-xs)",
                      color: "var(--color-text-tertiary)",
                    }}
                  >
                    {item.sourceName}
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
