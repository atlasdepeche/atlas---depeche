/**
 * API route: POST /api/advertising/track
 * Records ad impressions and clicks for statistics.
 */
import { NextResponse } from "next/server";
import { recordClick } from "@/lib/advertising/campaign-manager";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, creativeId, companyId, campaignId, placement, targetUrl } =
      body;

    if (type === "click" && creativeId && companyId) {
      await recordClick({
        creativeId,
        companyId,
        campaignId: campaignId ?? null,
        placement: placement ?? "unknown",
        targetUrl: targetUrl ?? "#",
      });
    }

    // Impression tracking is handled in campaign-manager.ts (getNextAd)
    // This endpoint also handles click tracking for client-side calls

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Tracking errors should never break the page
    console.error("[advertising/track]", err);
    return NextResponse.json({ ok: true }); // still return ok to client
  }
}
