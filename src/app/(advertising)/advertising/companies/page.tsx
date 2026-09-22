import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db/client";
import { adCompanies } from "@/db/schema";
import { sql } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Entreprises — Publicité",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function getCompanies() {
  const rows = await db
    .select({
      id: adCompanies.id,
      name: adCompanies.name,
      url: adCompanies.url,
      domain: adCompanies.domain,
      activity: adCompanies.activity,
      logoUrl: adCompanies.logoUrl,
      status: adCompanies.status,
      createdAt: adCompanies.createdAt,
      campaignCount: sql<string>`(
        SELECT count(*) FROM ad_campaigns WHERE ad_campaigns.company_id = ad_companies.id
      )`,
      activeCampaignCount: sql<string>`(
        SELECT count(*) FROM ad_campaigns
        WHERE ad_campaigns.company_id = ad_companies.id AND ad_campaigns.status = 'active'
      )`,
    })
    .from(adCompanies)
    .orderBy(sql`${adCompanies.createdAt} DESC`);

  return rows;
}

export default async function CompaniesPage() {
  const companies = await getCompanies();

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Entreprises</h1>
        <Link
          href="/advertising/companies/add"
          style={{
            padding: "0.5rem 1rem",
            background: "#1a1a2e",
            color: "white",
            borderRadius: 6,
            textDecoration: "none",
            fontSize: "0.9rem",
          }}
        >
          + Ajouter
        </Link>
      </div>

      {companies.length === 0 && (
        <p style={{ color: "#666" }}>
          Aucune entreprise.{" "}
          <Link href="/advertising/companies/add">Ajouter la première</Link>.
        </p>
      )}

      <div style={{ display: "grid", gap: "1rem" }}>
        {companies.map((c) => (
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
            {c.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.logoUrl}
                alt={c.name}
                style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 6 }}
              />
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  background: "#e0e0e0",
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: "#666",
                }}
              >
                {c.name.charAt(0)}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{c.name}</div>
              <div style={{ fontSize: "0.85rem", color: "#666" }}>
                {c.domain} · {c.activity ?? "N/A"}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#999" }}>
                {parseInt(c.campaignCount)} campagne(s) · {parseInt(c.activeCampaignCount)} active(s)
              </div>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#999" }}>
              Ajouté {c.createdAt ? new Date(c.createdAt).toLocaleDateString("fr-FR") : "N/A"}
            </div>
            <Link
              href={`/advertising/companies/${c.id}`}
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
