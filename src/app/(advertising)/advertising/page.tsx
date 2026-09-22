import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db/client";
import { adCompanies, adCreatives, adCampaigns } from "@/db/schema";
import { sql, eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Publicité — Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function getStats() {
  const [companyCount] = await db
    .select({ count: sql<string>`count(*)` })
    .from(adCompanies);

  const [creativeCount] = await db
    .select({ count: sql<string>`count(*)` })
    .from(adCreatives);

  const [pendingCount] = await db
    .select({ count: sql<string>`count(*)` })
    .from(adCreatives)
    .where(eq(adCreatives.status, "pending_review"));

  const [activeCampaignCount] = await db
    .select({ count: sql<string>`count(*)` })
    .from(adCampaigns)
    .where(eq(adCampaigns.status, "active"));

  const [totalImpressions] = await db
    .select({ total: sql<string>`coalesce(sum(${adCampaigns.impressions}), 0)` })
    .from(adCampaigns);

  const [totalClicks] = await db
    .select({ total: sql<string>`coalesce(sum(${adCampaigns.clicks}), 0)` })
    .from(adCampaigns);

  const imp = parseInt(totalImpressions?.total ?? "0");
  const clk = parseInt(totalClicks?.total ?? "0");

  return {
    companies: parseInt(companyCount?.count ?? "0"),
    creatives: parseInt(creativeCount?.count ?? "0"),
    pendingReview: parseInt(pendingCount?.count ?? "0"),
    activeCampaigns: parseInt(activeCampaignCount?.count ?? "0"),
    totalImpressions: imp,
    totalClicks: clk,
    ctr: imp > 0 ? ((clk / imp) * 100).toFixed(2) : "0.00",
  };
}

export default async function AdvertisingDashboardPage() {
  const stats = await getStats();

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 1100 }}>
      <h1>Publicité — Dashboard</h1>
      <p style={{ color: "#666" }}>
        Gestion des annonces publicitaires Atlas Dépêche. Module indépendant
        du système éditorial.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <StatCard label="Entreprises" value={stats.companies} href="/advertising/companies" />
        <StatCard label="Annonces" value={stats.creatives} href="/advertising/creatives" />
        <StatCard
          label="En attente"
          value={stats.pendingReview}
          href="/advertising/creatives"
          highlight={stats.pendingReview > 0}
        />
        <StatCard label="Campagnes actives" value={stats.activeCampaigns} href="/advertising/campaigns" />
        <StatCard label="Impressions" value={stats.totalImpressions} />
        <StatCard label="Clics" value={stats.totalClicks} />
        <StatCard label="CTR" value={`${stats.ctr}%`} />
      </div>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Link
          href="/advertising/companies/add"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            background: "#1a1a2e",
            color: "white",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          + Ajouter une entreprise
        </Link>
        <Link
          href="/advertising/companies"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            background: "#f0f0f0",
            color: "#333",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Voir les entreprises
        </Link>
        <Link
          href="/advertising/campaigns"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            background: "#f0f0f0",
            color: "#333",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Gérer les campagnes
        </Link>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: string | number;
  href?: string;
  highlight?: boolean;
}) {
  const content = (
    <div
      style={{
        padding: "1rem",
        background: highlight ? "#fff3cd" : "white",
        border: `1px solid ${highlight ? "#ffc107" : "#e0e0e0"}`,
        borderRadius: 8,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "2rem", fontWeight: 700, color: "#1a1a2e" }}>
        {value}
      </div>
      <div style={{ fontSize: "0.85rem", color: "#666" }}>{label}</div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
        {content}
      </Link>
    );
  }
  return content;
}
