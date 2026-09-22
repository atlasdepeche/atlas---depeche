import type { Metadata } from "next";
import { db } from "@/db/client";
import { adCreatives, adCompanies } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Annonces — Publicité",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function getCreatives() {
  return db
    .select({
      id: adCreatives.id,
      companyId: adCreatives.companyId,
      companyName: adCompanies.name,
      version: adCreatives.version,
      status: adCreatives.status,
      format: adCreatives.format,
      durationMs: adCreatives.durationMs,
      headline: adCreatives.headline,
      cta: adCreatives.cta,
      rejectionReason: adCreatives.rejectionReason,
      createdAt: adCreatives.createdAt,
    })
    .from(adCreatives)
    .innerJoin(adCompanies, eq(adCreatives.companyId, adCompanies.id))
    .orderBy(desc(adCreatives.createdAt));
}

const STATUS_COLORS: Record<string, string> = {
  generating: "#ffc107",
  pending_review: "#17a2b8",
  approved: "#28a745",
  scheduled: "#6f42c1",
  published: "#20c997",
  paused: "#6c757d",
  rejected: "#dc3545",
  error: "#dc3545",
};

const STATUS_LABELS: Record<string, string> = {
  generating: "Génération...",
  pending_review: "En attente de révision",
  approved: "Approuvé",
  scheduled: "Programmé",
  published: "Publié",
  paused: "En pause",
  rejected: "Rejeté",
  error: "Erreur",
};

export default async function CreativesPage() {
  const creatives = await getCreatives();

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 1100 }}>
      <h1>Annonces</h1>

      {creatives.length === 0 && (
        <p style={{ color: "#666" }}>
          Aucune annonce.{" "}
          <Link href="/advertising/companies">Ajouter une entreprise</Link> puis
          générez une annonce depuis sa page.
        </p>
      )}

      <div style={{ display: "grid", gap: "1rem" }}>
        {creatives.map((c) => (
          <div
            key={c.id}
            style={{
              border: "1px solid #e0e0e0",
              borderRadius: 8,
              padding: "1rem",
              display: "flex",
              gap: "1rem",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 80,
                height: 50,
                background: "#f0f0f0",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
                color: "#666",
              }}
            >
              {c.format === "horizontal" ? "16:9" : c.format === "vertical" ? "9:16" : "1:1"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>
                {c.companyName} <span style={{ color: "#999" }}>v{c.version}</span>
              </div>
              <div style={{ fontSize: "0.85rem", color: "#666" }}>
                {c.headline ?? "Pas de titre"} · {c.durationMs / 1000}s
              </div>
            </div>
            <div
              style={{
                padding: "0.25rem 0.75rem",
                background: STATUS_COLORS[c.status] ?? "#ccc",
                color: "white",
                borderRadius: 12,
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              {STATUS_LABELS[c.status] ?? c.status}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#999" }}>
              {c.createdAt ? new Date(c.createdAt).toLocaleDateString("fr-FR") : "N/A"}
            </div>
            <Link
              href={`/advertising/creatives/${c.id}`}
              style={{
                padding: "0.4rem 0.8rem",
                background: "#f0f0f0",
                borderRadius: 4,
                textDecoration: "none",
                color: "#333",
                fontSize: "0.85rem",
              }}
            >
              Voir
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
