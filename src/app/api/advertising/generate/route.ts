/**
 * API route: POST /api/advertising/generate
 * Generates an ad creative for a company.
 * Creates script + scenes using Claude, then renders via template provider.
 */
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { adCompanies, adCreatives } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateAdScript } from "@/lib/advertising/ad-generator";
import { templateProvider } from "@/lib/advertising/video-provider-template";
import { checkCostGuard, logCost } from "@/lib/advertising/cost-guard";
import { AD_SIZES, AD_FPS, AD_DURATION_DEFAULT } from "@/lib/advertising/types";
import type { AdFormat } from "@/lib/advertising/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyId, format = "horizontal", durationMs } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId requis" },
        { status: 400 },
      );
    }

    // Get the company
    const [company] = await db
      .select()
      .from(adCompanies)
      .where(eq(adCompanies.id, companyId))
      .limit(1);

    if (!company) {
      return NextResponse.json(
        { error: "Entreprise non trouvée" },
        { status: 404 },
      );
    }

    // Check cost guard
    const costCheck = await checkCostGuard(companyId);
    if (!costCheck.allowed) {
      return NextResponse.json(
        { error: costCheck.reason, costInfo: costCheck },
        { status: 429 },
      );
    }

    const dur = durationMs ?? AD_DURATION_DEFAULT * 1000;
    const adFormat = (format as AdFormat) ?? "horizontal";
    const sizes = AD_SIZES[adFormat];

    // Create the creative record (status: generating)
    const [creative] = await db
      .insert(adCreatives)
      .values({
        companyId,
        version: 1,
        status: "generating",
        format: adFormat,
        durationMs: dur,
      })
      .returning({ id: adCreatives.id });

    if (!creative) {
      return NextResponse.json(
        { error: "Failed to create creative record" },
        { status: 500 },
      );
    }

    try {
      // Generate ad script using Claude
      const script = generateAdScript(
        {
          name: company.name,
          domain: company.domain,
          description: company.description ?? "",
          activity: company.activity ?? "",
          services: (company.services as string[]) ?? [],
          products: (company.products as string[]) ?? [],
          logoUrl: company.logoUrl,
          website: company.website ?? company.url,
          contact: (company.contact as { phone: string | null; email: string | null; address: string | null }) ?? {
            phone: null,
            email: null,
            address: null,
          },
          socialLinks: (company.socialLinks as Record<string, string>) ?? {},
          tone: (company.tone as "professional") ?? "professional",
          primaryColor: company.primaryColor ?? "#1a1a2e",
          secondaryColor: company.secondaryColor ?? "#e94560",
          images: (company.images as string[]) ?? [],
          rawHtml: "",
        },
        dur,
      );

      // Generate video via template provider
      const videoResult = await templateProvider.generate({
        scenes: script.scenes,
        format: adFormat,
        durationMs: dur,
        width: sizes.width,
        height: sizes.height,
        fps: AD_FPS,
      });

      // Update the creative with the generated data
      await db
        .update(adCreatives)
        .set({
          status: "pending_review",
          script: script,
          playerData: videoResult.success
            ? JSON.parse(
                Buffer.from(
                  videoResult.videoUrl!.replace("data:application/json;base64,", ""),
                  "base64",
                ).toString(),
              )
            : null,
          videoUrl: videoResult.success ? videoResult.videoUrl : null,
          headline: script.headline,
          subheadline: script.subheadline,
          body: script.body,
          cta: script.cta,
          ctaUrl: script.ctaUrl,
          generationCostUsd: "0",
          updatedAt: new Date(),
        })
        .where(eq(adCreatives.id, creative.id));

      // Log the cost
      await logCost({
        companyId,
        creativeId: creative.id,
        action: "generate",
        provider: "template",
        costUsd: 0,
      });

      return NextResponse.json({
        creativeId: creative.id,
        status: "pending_review",
        script,
      });
    } catch (err) {
      // Mark as error
      await db
        .update(adCreatives)
        .set({
          status: "error",
          errorMessage: (err as Error).message,
          updatedAt: new Date(),
        })
        .where(eq(adCreatives.id, creative.id));

      throw err;
    }
  } catch (err) {
    console.error("[advertising/generate]", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
