import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "./admin/login/actions";

export const metadata: Metadata = {
  title: "Atlas Dépêche — Admin",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
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
          <div style={{ display: "flex", gap: "1rem" }}>
            <Link href="/admin/moderate" style={{ color: "#333", textDecoration: "none", fontWeight: 600 }}>
              Modération
            </Link>
            <Link href="/admin/events" style={{ color: "#333", textDecoration: "none" }}>
              Events
            </Link>
            <Link href="/admin/articles" style={{ color: "#333", textDecoration: "none" }}>
              Articles
            </Link>
            <Link href="/admin/analytics" style={{ color: "#333", textDecoration: "none" }}>
              Analytics
            </Link>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              style={{
                background: "none",
                border: "1px solid #ccc",
                borderRadius: 4,
                padding: "0.3rem 0.7rem",
                cursor: "pointer",
                fontSize: "0.8rem",
                color: "#666",
              }}
            >
              Déconnexion
            </button>
          </form>
        </nav>
        {children}
      </body>
    </html>
  );
}
