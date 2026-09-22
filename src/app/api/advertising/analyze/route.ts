/**
 * API route: POST /api/advertising/analyze
 * Analyzes a company URL and returns structured business information.
 * Cost: ~$0.01–0.03 (Claude Haiku call).
 */
import { NextResponse } from "next/server";
import { analyzeCompany } from "@/lib/advertising/company-analyzer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL requise" }, { status: 400 });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "URL invalide" }, { status: 400 });
    }

    const analysis = await analyzeCompany(url);

    return NextResponse.json({
      companyId: crypto.randomUUID(), // temporary — will be real ID after DB insert
      analysis: {
        name: analysis.name,
        domain: analysis.domain,
        description: analysis.description,
        activity: analysis.activity,
        services: analysis.services,
        products: analysis.products,
        logoUrl: analysis.logoUrl,
        website: analysis.website,
        contact: analysis.contact,
        socialLinks: analysis.socialLinks,
        tone: analysis.tone,
        primaryColor: analysis.primaryColor,
        secondaryColor: analysis.secondaryColor,
        images: analysis.images,
      },
    });
  } catch (err) {
    console.error("[advertising/analyze]", err);
    return NextResponse.json(
      { error: `Erreur lors de l'analyse: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
