import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { adCompanies, adCreatives, adCampaigns } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import GenerateButton from "./GenerateButton";

export const metadata: Metadata = {
  title: "Détail entreprise — Publicité",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function getCompany(id: string) {
  const rows = await db
    .select({
      id: adCompanies.id,
      name: adCompanies.name,
      url: adCompanies.url,
      domain: adCompanies.domain,
      description: adCompanies.description,
      activity: adCompanies.activity,
      logoUrl: adCompanies.logoUrl,
      website: adCompanies.website,
      contact: adCompanies.contact,
      socialLinks: adCompanies.socialLinks,
      services: adCompanies.services,
      products: adCompanies.products,
      tone: adCompanies.tone,
      primaryColor: adCompanies.primaryColor,
      secondaryColor: adCompanies.secondaryColor,
      status: adCompanies.status,
      authorizationConfirmed: adCompanies.authorizationConfirmed,
      notes: adCompanies.notes,
      createdAt: adCompanies.createdAt,
    })
    .from(adCompanies)
    .where(eq(adCompanies.id, id))
    .limit(1);

  return rows[0] ?? null;
}

async function getCreatives(companyId: string) {
  return db
    .select({
      id: adCreatives.id,
      version: adCreatives.version,
      status: adCreatives.status,
      format: adCreatives.format,
      durationMs: adCreatives.durationMs,
      headline: adCreatives.headline,
      cta: adCreatives.cta,
      createdAt: adCreatives.createdAt,
    })
    .from(adCreatives)
    .where(eq(adCreatives.companyId, companyId))
    .orderBy(sql`${adCreatives.createdAt} DESC`);
}

async function getCampaigns(companyId: string) {
  return db
    .select({
      id: adCampaigns.id,
      name: adCampaigns.name,
      status: adCampaigns.status,
      priority: adCampaigns.priority,
      impressions: adCampaigns.impressions,
      clicks: adCampaigns.clicks,
      startsAt: adCampaigns.startsAt,
      endsAt: adCampaigns.endsAt,
    })
    .from(adCampaigns)
    .where(eq(adCampaigns.companyId, companyId))
    .orderBy(sql`${adCampaigns.createdAt} DESC`);
}

const STATUS_COLORS: Record<string, string> = {
  generating: "#6c757d",
  pending_review: "#ffc107",
  approved: "#28a745",
  published: "#17a2b8",
  rejected: "#dc3545",
  error: "#dc3545",
  paused: "#6c757d",
  draft: "#6c757d",
  scheduled: "#6f42c1",
  active: "#28a745",
  completed: "#17a2b8",
  cancelled: "#dc3545",
};

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await getCompany(id);

  if (!company) {
    notFound();
  }

  const [creatives, campaigns] = await Promise.all([
    getCreatives(id),
    getCampaigns(id),
  ]);

  const contact = company.contact as {
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
  const socialLinks = company.socialLinks as Record<string, string> | null;
  const services = (company.services as string[]) ?? [];
  const products = (company.products as string[]) ?? [];

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 1100 }}>
      <Link
        href="/advertising/companies"
        style={{ color: "#666", textDecoration: "none", fontSize: "0.85rem" }}
      >
        ← Retour entreprises
      </Link>

      {/* Company header */}
      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          alignItems: "flex-start",
          marginTop: "1rem",
          padding: "1.5rem",
          border: "1px solid #e0e0e0",
          borderRadius: 12,
        }}
      >
        {company.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={company.logoUrl}
            alt={company.name}
            style={{
              width: 80,
              height: 80,
              objectFit: "contain",
              borderRadius: 8,
              border: "1px solid #eee",
            }}
          />
        ) : (
          <div
            style={{
              width: 80,
              height: 80,
              background: company.primaryColor ?? "#e0e0e0",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              fontWeight: 700,
              color: "white",
            }}
          >
            {company.name.charAt(0)}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>{company.name}</h1>
          <div style={{ color: "#666", fontSize: "0.9rem", marginTop: 4 }}>
            {company.domain} · {company.activity ?? "N/A"}
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: "0.5rem" }}>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: "0.75rem",
                background: STATUS_COLORS[company.status] ?? "#ccc",
                color: "white",
              }}
            >
              {company.status}
            </span>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: "0.75rem",
                background: company.authorizationConfirmed ? "#28a745" : "#ffc107",
                color: "white",
              }}
            >
              {company.authorizationConfirmed ? "Autorisé" : "Non autorisé"}
            </span>
          </div>
        </div>
        <GenerateButton companyId={id} />
      </div>

      {/* Description */}
      {company.description && (
        <div style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", color: "#333" }}>Description</h2>
          <p style={{ color: "#666", lineHeight: 1.6 }}>{company.description}</p>
        </div>
      )}

      {/* Services & Products */}
      {(services.length > 0 || products.length > 0) && (
        <div style={{ marginTop: "1rem", display: "flex", gap: "2rem" }}>
          {services.length > 0 && (
            <div>
              <h3 style={{ fontSize: "0.9rem", color: "#333" }}>Services</h3>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {services.map((s) => (
                  <span
                    key={s}
                    style={{
                      padding: "2px 8px",
                      background: "#f0f0f0",
                      borderRadius: 4,
                      fontSize: "0.8rem",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {products.length > 0 && (
            <div>
              <h3 style={{ fontSize: "0.9rem", color: "#333" }}>Produits</h3>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {products.map((p) => (
                  <span
                    key={p}
                    style={{
                      padding: "2px 8px",
                      background: "#f0f0f0",
                      borderRadius: 4,
                      fontSize: "0.8rem",
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contact & Social */}
      <div style={{ marginTop: "1.5rem", display: "flex", gap: "2rem" }}>
        {contact && (contact.phone || contact.email || contact.address) && (
          <div>
            <h3 style={{ fontSize: "0.9rem", color: "#333" }}>Contact</h3>
            <div style={{ fontSize: "0.85rem", color: "#666" }}>
              {contact.phone && <div>Tel: {contact.phone}</div>}
              {contact.email && <div>Email: {contact.email}</div>}
              {contact.address && <div>Adresse: {contact.address}</div>}
            </div>
          </div>
        )}
        {socialLinks && Object.keys(socialLinks).length > 0 && (
          <div>
            <h3 style={{ fontSize: "0.9rem", color: "#333" }}>Réseaux sociaux</h3>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {Object.entries(socialLinks).map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "2px 8px",
                    background: "#f0f0f0",
                    borderRadius: 4,
                    fontSize: "0.8rem",
                    textDecoration: "none",
                    color: "#333",
                  }}
                >
                  {platform}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Creatives */}
      <div style={{ marginTop: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "1.1rem", margin: 0 }}>
            Annonces ({creatives.length})
          </h2>
        </div>
        {creatives.length === 0 ? (
          <p style={{ color: "#999", fontStyle: "italic" }}>
            Aucune annonce. Cliquez sur &quot;Générer un anuncio&quot; pour commencer.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.75rem" }}>
            {creatives.map((cr) => (
              <Link
                key={cr.id}
                href={`/advertising/creatives/${cr.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "0.75rem 1rem",
                  border: "1px solid #e0e0e0",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                    {cr.headline ?? `Version ${cr.version}`}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#666" }}>
                    {cr.format} · {cr.durationMs / 1000}s
                  </div>
                </div>
                <div
                  style={{
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: "0.75rem",
                    background: STATUS_COLORS[cr.status] ?? "#ccc",
                    color: "white",
                  }}
                >
                  {cr.status}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#999" }}>
                  {cr.createdAt
                    ? new Date(cr.createdAt).toLocaleDateString("fr-FR")
                    : "N/A"}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Campaigns */}
      <div style={{ marginTop: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "1.1rem", margin: 0 }}>
            Campagnes ({campaigns.length})
          </h2>
          {creatives.some((c) => c.status === "approved") && (
            <Link
              href={`/advertising/campaigns/new?companyId=${id}`}
              style={{
                padding: "0.4rem 0.8rem",
                background: "#28a745",
                color: "white",
                borderRadius: 4,
                textDecoration: "none",
                fontSize: "0.85rem",
              }}
            >
              + Campagne
            </Link>
          )}
        </div>
        {campaigns.length === 0 ? (
          <p style={{ color: "#999", fontStyle: "italic" }}>
            Aucune campagne.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.75rem" }}>
            {campaigns.map((camp) => {
              const ctr =
                camp.impressions > 0
                  ? ((camp.clicks / camp.impressions) * 100).toFixed(1)
                  : "0.0";
              return (
                <div
                  key={camp.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "0.75rem 1rem",
                    border: "1px solid #e0e0e0",
                    borderRadius: 8,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {camp.name ?? "Sans nom"}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#666" }}>
                      {camp.startsAt
                        ? `Du ${new Date(camp.startsAt).toLocaleDateString("fr-FR")}`
                        : "Sans date"}
                      {camp.endsAt
                        ? ` au ${new Date(camp.endsAt).toLocaleDateString("fr-FR")}`
                        : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "center", minWidth: 60 }}>
                    <div style={{ fontWeight: 600 }}>{camp.impressions}</div>
                    <div style={{ fontSize: "0.7rem", color: "#666" }}>impressions</div>
                  </div>
                  <div style={{ textAlign: "center", minWidth: 60 }}>
                    <div style={{ fontWeight: 600 }}>{camp.clicks}</div>
                    <div style={{ fontSize: "0.7rem", color: "#666" }}>clics</div>
                  </div>
                  <div style={{ textAlign: "center", minWidth: 50 }}>
                    <div style={{ fontWeight: 600 }}>{ctr}%</div>
                    <div style={{ fontSize: "0.7rem", color: "#666" }}>CTR</div>
                  </div>
                  <div
                    style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: "0.75rem",
                      background: STATUS_COLORS[camp.status] ?? "#ccc",
                      color: "white",
                    }}
                  >
                    {camp.status}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
