import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db/client";
import { adCompanies, adCreatives } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import CampaignForm from "./CampaignForm";

export const metadata: Metadata = {
  title: "Nouvelle campagne — Publicité",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function getApprovedCreatives(companyId?: string) {
  if (companyId) {
    return db
      .select({
        id: adCreatives.id,
        companyId: adCreatives.companyId,
        headline: adCreatives.headline,
        format: adCreatives.format,
        durationMs: adCreatives.durationMs,
        companyName: adCompanies.name,
      })
      .from(adCreatives)
      .innerJoin(adCompanies, eq(adCreatives.companyId, adCompanies.id))
      .where(
        and(
          eq(adCreatives.status, "approved"),
          eq(adCreatives.companyId, companyId),
        ),
      );
  }
  return db
    .select({
      id: adCreatives.id,
      companyId: adCreatives.companyId,
      headline: adCreatives.headline,
      format: adCreatives.format,
      durationMs: adCreatives.durationMs,
      companyName: adCompanies.name,
    })
    .from(adCreatives)
    .innerJoin(adCompanies, eq(adCreatives.companyId, adCompanies.id))
    .where(eq(adCreatives.status, "approved"));
}

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; creativeId?: string }>;
}) {
  const { companyId, creativeId } = await searchParams;
  const creatives = await getApprovedCreatives(companyId);

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 800 }}>
      <Link
        href="/advertising/campaigns"
        style={{ color: "#666", textDecoration: "none", fontSize: "0.85rem" }}
      >
        ← Retour campagnes
      </Link>

      <h1 style={{ marginTop: "1rem" }}>Nouvelle campagne</h1>

      {creatives.length === 0 ? (
        <div
          style={{
            padding: "2rem",
            background: "#f8f9fa",
            borderRadius: 8,
            textAlign: "center",
            color: "#666",
          }}
        >
          <p>Aucune annonce approuvée disponible.</p>
          <p>
            <Link href="/advertising/companies">
              Ajoutez une entreprise et générez une annonce
            </Link>{" "}
            d&apos;abord.
          </p>
        </div>
      ) : (
        <CampaignForm
          creatives={creatives}
          preselectedCompanyId={companyId}
          preselectedCreativeId={creativeId}
        />
      )}
    </main>
  );
}
