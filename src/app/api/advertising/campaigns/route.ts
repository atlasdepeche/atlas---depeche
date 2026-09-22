/**
 * API route: POST /api/advertising/campaigns
 * Creates a new campaign linking a creative to placements with scheduling.
 *
 * Body: { companyId, creativeId, name?, status?, priority?, startsAt?, endsAt?, placements?, budgetUsd?, maxImpressions? }
 */
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { adCampaigns, adCreatives, adCompanies } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      companyId,
      creativeId,
      name,
      status = "draft",
      priority = "normal",
      startsAt,
      endsAt,
      placements = ["homepage"],
      budgetUsd,
      maxImpressions,
    } = body;

    if (!companyId || !creativeId) {
      return NextResponse.json(
        { error: "companyId et creativeId sont requis" },
        { status: 400 },
      );
    }

    // Verify company exists
    const [company] = await db
      .select({ id: adCompanies.id, name: adCompanies.name })
      .from(adCompanies)
      .where(eq(adCompanies.id, companyId))
      .limit(1);

    if (!company) {
      return NextResponse.json(
        { error: "Entreprise non trouvée" },
        { status: 404 },
      );
    }

    // Verify creative exists and belongs to this company
    const [creative] = await db
      .select({ id: adCreatives.id, status: adCreatives.status, headline: adCreatives.headline })
      .from(adCreatives)
      .where(
        and(eq(adCreatives.id, creativeId), eq(adCreatives.companyId, companyId)),
      )
      .limit(1);

    if (!creative) {
      return NextResponse.json(
        { error: "Annonce non trouvée ou n'appartient pas à cette entreprise" },
        { status: 404 },
      );
    }

    if (creative.status !== "approved") {
      return NextResponse.json(
        { error: "Seules les annonces approuvées peuvent avoir des campagnes" },
        { status: 400 },
      );
    }

    // Validate dates
    if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) {
      return NextResponse.json(
        { error: "La date de fin doit être après la date de début" },
        { status: 400 },
      );
    }

    const [campaign] = await db
      .insert(adCampaigns)
      .values({
        companyId,
        creativeId,
        name: name ?? `${company.name} — ${creative.headline ?? "Campagne"}`,
        status,
        priority,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        placements: placements,
        budgetUsd: budgetUsd?.toString() ?? null,
        maxImpressions: maxImpressions ?? null,
      })
      .returning({ id: adCampaigns.id });

    if (!campaign) {
      return NextResponse.json(
        { error: "Erreur lors de la création de la campagne" },
        { status: 500 },
      );
    }

    return NextResponse.json({ campaignId: campaign.id, status });
  } catch (err) {
    console.error("[advertising/campaigns POST]", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
