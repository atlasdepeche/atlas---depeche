/**
 * API route: GET /api/advertising/serve?placement=homepage
 * Returns the next ad to display for a given placement.
 * Uses round-robin rotation across active campaigns.
 */
import { NextResponse } from "next/server";
import { getNextAd } from "@/lib/advertising/campaign-manager";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const placement = searchParams.get("placement") ?? "homepage";

    const ad = await getNextAd(placement);

    if (!ad) {
      return NextResponse.json({ error: "No ads available" }, { status: 404 });
    }

    return NextResponse.json(ad);
  } catch (err) {
    console.error("[advertising/serve]", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
