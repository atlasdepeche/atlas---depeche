/**
 * Campaign manager — handles ad rotation, scheduling, and statistics.
 * Simple round-robin rotation for Phase 1 (2–5 companies).
 */
import { db } from "@/db/client";
import {
  adCampaigns,
  adCreatives,
  adCompanies,
  adImpressions,
  adClicks,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Get the next ad to display (round-robin rotation).
 * Returns the active ad with the lowest impression count for fair rotation.
 */
export async function getNextAd(
  placement: string = "homepage",
): Promise<{
  creativeId: string;
  companyId: string;
  companyName: string;
  companyWebsite: string;
  playerData: unknown;
  headline: string | null;
  cta: string | null;
  ctaUrl: string | null;
} | null> {
  const now = new Date();

  // Find active campaigns that are within their date range
  const activeCampaigns = await db
    .select({
      campaignId: adCampaigns.id,
      creativeId: adCampaigns.creativeId,
      companyId: adCampaigns.companyId,
      impressions: adCampaigns.impressions,
      priority: adCampaigns.priority,
    })
    .from(adCampaigns)
    .innerJoin(adCreatives, eq(adCampaigns.creativeId, adCreatives.id))
    .where(
      and(
        eq(adCampaigns.status, "active"),
        eq(adCreatives.status, "approved"),
        // Within date range (or no dates set)
        sql`(${adCampaigns.startsAt} IS NULL OR ${adCampaigns.startsAt} <= ${now})`,
        sql`(${adCampaigns.endsAt} IS NULL OR ${adCampaigns.endsAt} >= ${now})`,
        // Has this placement
        sql`${adCampaigns.placements} @> ${JSON.stringify([placement])}`,
      ),
    )
    .orderBy(
      // Sort by priority first, then by impressions (least shown first)
      sql`CASE ${adCampaigns.priority} WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 WHEN 'low' THEN 4 END`,
      adCampaigns.impressions,
    )
    .limit(1);

  if (activeCampaigns.length === 0) {
    return null;
  }

  const campaign = activeCampaigns[0]!;

  // Get the creative and company details
  const [creative] = await db
    .select({
      id: adCreatives.id,
      playerData: adCreatives.playerData,
      headline: adCreatives.headline,
      cta: adCreatives.cta,
      ctaUrl: adCreatives.ctaUrl,
    })
    .from(adCreatives)
    .where(eq(adCreatives.id, campaign.creativeId))
    .limit(1);

  const [company] = await db
    .select({
      id: adCompanies.id,
      name: adCompanies.name,
      website: adCompanies.website,
    })
    .from(adCompanies)
    .where(eq(adCompanies.id, campaign.companyId))
    .limit(1);

  if (!creative || !company) return null;

  // Increment impression count on the campaign
  await db
    .update(adCampaigns)
    .set({
      impressions: sql`${adCampaigns.impressions} + 1`,
      updatedAt: sql`now()`,
    })
    .where(eq(adCampaigns.id, campaign.campaignId));

  // Log the impression
  await db.insert(adImpressions).values({
    creativeId: creative.id,
    companyId: company.id,
    campaignId: campaign.campaignId,
    placement,
    deviceType: null,
    userAgent: null,
    country: null,
  });

  return {
    creativeId: creative.id,
    companyId: company.id,
    companyName: company.name,
    companyWebsite: company.website ?? "",
    playerData: creative.playerData,
    headline: creative.headline,
    cta: creative.cta,
    ctaUrl: creative.ctaUrl,
  };
}

/**
 * Record a click on an ad.
 */
export async function recordClick(params: {
  creativeId: string;
  companyId: string;
  campaignId: string | null;
  placement: string;
  targetUrl: string;
}): Promise<void> {
  await db.insert(adClicks).values({
    creativeId: params.creativeId,
    companyId: params.companyId,
    campaignId: params.campaignId,
    placement: params.placement,
    targetUrl: params.targetUrl,
    deviceType: null,
    country: null,
  });

  // Increment click count on the campaign
  if (params.campaignId) {
    await db
      .update(adCampaigns)
      .set({
        clicks: sql`${adCampaigns.clicks} + 1`,
        updatedAt: sql`now()`,
      })
      .where(eq(adCampaigns.id, params.campaignId));
  }
}

/**
 * Get campaign statistics.
 */
export async function getCampaignStats(campaignId: string) {
  const [campaign] = await db
    .select()
    .from(adCampaigns)
    .where(eq(adCampaigns.id, campaignId))
    .limit(1);

  if (!campaign) return null;

  const imp = campaign.impressions ?? 0;
  const clk = campaign.clicks ?? 0;
  const ctr =
    imp > 0
      ? ((clk / imp) * 100).toFixed(2)
      : "0.00";

  return {
    ...campaign,
    ctr: `${ctr}%`,
  };
}

/**
 * Get company-level statistics.
 */
export async function getCompanyStats(companyId: string) {
  const [company] = await db
    .select()
    .from(adCompanies)
    .where(eq(adCompanies.id, companyId))
    .limit(1);

  if (!company) return null;

  const campaigns = await db
    .select({
      id: adCampaigns.id,
      status: adCampaigns.status,
      impressions: adCampaigns.impressions,
      clicks: adCampaigns.clicks,
    })
    .from(adCampaigns)
    .where(eq(adCampaigns.companyId, companyId));

  const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
  const ctr =
    totalImpressions > 0
      ? ((totalClicks / totalImpressions) * 100).toFixed(2)
      : "0.00";

  return {
    ...company,
    campaignCount: campaigns.length,
    activeCampaigns: campaigns.filter((c) => c.status === "active").length,
    totalImpressions,
    totalClicks,
    ctr: `${ctr}%`,
  };
}
