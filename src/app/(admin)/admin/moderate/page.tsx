import type { Metadata } from "next";
import { getFilteredRadarItems } from "@/lib/public-site";
import { hideSourceItem } from "./actions";

export const metadata: Metadata = {
  title: "Modération",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Requested directly: "si no me gusta algo, la borro" — a page showing
 * exactly what's currently live on the public homepage (both locales,
 * same getFilteredRadarItems the site itself uses — see
 * src/lib/public-site.ts), with a one-click removal per item. Removal
 * sets hiddenAt (src/app/(admin)/admin/moderate/actions.ts) rather than
 * deleting — see that file's comment.
 */
export default async function ModeratePage() {
  const [fr, ar] = await Promise.all([getFilteredRadarItems("fr"), getFilteredRadarItems("ar")]);
  const items = [...fr, ...ar].sort(
    (a, b) => (b.publishedAt ?? b.fetchedAt).getTime() - (a.publishedAt ?? a.fetchedAt).getTime(),
  );

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: 900 }}>
      <h1 style={{ fontSize: "1.3rem", marginBottom: "0.25rem" }}>Modération</h1>
      <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "1.5rem" }}>
        Ce que le public voit actuellement sur le site (fr + ar), le plus récent en premier.
        Supprimer un article ici l’enlève du site et de la file Instagram — il ne republie ni
        ne retire un post Instagram déjà publié.
      </p>

      {items.length === 0 ? (
        <p style={{ color: "#666" }}>Rien à afficher.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map((item) => (
            <li
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "0.75rem 0",
                borderBottom: "1px solid #eee",
              }}
            >
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  style={{ width: "3.5rem", height: "3.5rem", objectFit: "cover", borderRadius: 4, flexShrink: 0, background: "#eee" }}
                />
              ) : (
                <div style={{ width: "3.5rem", height: "3.5rem", borderRadius: 4, flexShrink: 0, background: "#eee" }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1a1a1a", textDecoration: "none" }}
                >
                  {item.title}
                </a>
                <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.15rem" }}>
                  {item.sourceName}
                  {(item.publishedAt ?? item.fetchedAt) && (
                    <> · {(item.publishedAt ?? item.fetchedAt).toISOString().slice(0, 16).replace("T", " ")}</>
                  )}
                </div>
              </div>
              <form
                action={async () => {
                  "use server";
                  await hideSourceItem(item.id);
                }}
              >
                <button
                  type="submit"
                  style={{
                    background: "#fdecea",
                    color: "#a01c1c",
                    border: "1px solid #f3c6c2",
                    borderRadius: 4,
                    padding: "0.4rem 0.8rem",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Supprimer
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
