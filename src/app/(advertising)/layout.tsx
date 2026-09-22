import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Atlas Dépêche — Publicité",
  robots: { index: false, follow: false },
};

export default function AdvertisingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <nav
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.75rem 1.5rem",
            borderBottom: "1px solid #ddd",
            background: "#fafafa",
            fontSize: "0.85rem",
          }}
        >
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <Link
              href="/admin/events"
              style={{ color: "#666", textDecoration: "none", fontSize: "0.8rem" }}
            >
              ← Retour Admin
            </Link>
            <span style={{ color: "#ccc" }}>|</span>
            <Link
              href="/advertising"
              style={{ color: "#333", textDecoration: "none", fontWeight: 600 }}
            >
              Publicité
            </Link>
            <Link
              href="/advertising/companies"
              style={{ color: "#333", textDecoration: "none" }}
            >
              Entreprises
            </Link>
            <Link
              href="/advertising/creatives"
              style={{ color: "#333", textDecoration: "none" }}
            >
              Annonces
            </Link>
            <Link
              href="/advertising/campaigns"
              style={{ color: "#333", textDecoration: "none" }}
            >
              Campagnes
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
