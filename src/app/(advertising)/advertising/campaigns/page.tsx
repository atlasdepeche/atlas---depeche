import type { Metadata } from "next";
import { db } from "@/db/client";
import { adCampaigns, adCompanies, adCreatives } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Campagnes — Publicité",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function getCampaigns() {
  return db
    .select({
      id: adCampaigns.id,
      companyId: adCampaigns.companyId,
      companyName: adCompanies.name,
      creativeId: adCampaigns.creativeId,
      headline: adCreatives.headline,
      status: adCampaigns.status,
      priority: adCampaigns.priority,
      startsAt: adCampaigns.startsAt,
      endsAt: adCampaigns.endsAt,
      impressions: adCampaigns.impressions,
      clicks: adCampaigns.clicks,
      createdAt: adCampaigns.createdAt,
    })
    .from(adCampaigns)
    .innerJoin(adCompanies, eq(adCampaigns.companyId, adCompanies.id))
    .innerJoin(adCreatives, eq(adCampaigns.creativeId, adCreatives.id))
    .orderBy(desc(adCampaigns.createdAt));
}

const STATUS_COLORS: Record<string, string> = {
  draft: "#6c757d",
  scheduled: "#6f42c1",
  active: "#28a745",
  paused: "#ffc107",
  completed: "#17a2b8",
  cancelled: "#dc3545",
};

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 1100 }}>
      <h1>Campagnes</h1>

      {campaigns.length === 0 && (
        <p style={{ color: "#666" }}>
          Aucune campagne. Créez une entreprise et une annonce, puis
          programmez une campagne.
        </p>
      )}

      <div style={{ display: "grid", gap: "1rem" }}>
        {campaigns.map((c) => {
          const ctr =
            c.impressions > 0
              ? ((c.clicks / c.impressions) * 100).toFixed(2)
              : "0.00";
          return (
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
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{c.companyName}</div>
                <div style={{ fontSize: "0.85rem", color: "#666" }}>
                  {c.headline ?? "Annonce"} · Priorité: {c.priority}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#999" }}>
                  {c.startsAt
                    ? `Du ${new Date(c.startsAt).toLocaleDateString("fr-FR")}`
                    : "Sans date de début"}
                  {c.endsAt
                    ? ` au ${new Date(c.endsAt).toLocaleDateString("fr-FR")}`
                    : ""}
                </div>
              </div>
              <div style={{ textAlign: "center", minWidth: 80 }}>
                <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>
                  {c.impressions}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#666" }}>
                  impressions
                </div>
              </div>
              <div style={{ textAlign: "center", minWidth: 80 }}>
                <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>
                  {c.clicks}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#666" }}>clics</div>
              </div>
              <div style={{ textAlign: "center", minWidth: 60 }}>
                <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>
                  {ctr}%
                </div>
                <div style={{ fontSize: "0.75rem", color: "#666" }}>CTR</div>
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
                {c.status}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
