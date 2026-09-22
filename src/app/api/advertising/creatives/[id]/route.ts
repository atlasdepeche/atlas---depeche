/**
 * API route: PATCH /api/advertising/creatives/[id]
 * Approve, reject, or regenerate a creative.
 *
 * Body: { action: "approve" | "reject" | "regenerate", reason?: string }
 */
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { adCreatives, adCompanies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateAdScript } from "@/lib/advertising/ad-generator";
import { templateProvider } from "@/lib/advertising/video-provider-template";
import { logCost } from "@/lib/advertising/cost-guard";
import { AD_SIZES, AD_FPS } from "@/lib/advertising/types";
import type { AdFormat } from "@/lib/advertising/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, reason } = body;

    if (!["approve", "reject", "regenerate"].includes(action)) {
      return NextResponse.json(
        { error: "Action invalide. Utilisez: approve, reject, regenerate" },
        { status: 400 },
      );
    }

    // Get the creative
    const [creative] = await db
      .select()
      .from(adCreatives)
      .where(eq(adCreatives.id, id))
      .limit(1);

    if (!creative) {
      return NextResponse.json(
        { error: "Annonce non trouvée" },
        { status: 404 },
      );
    }

    if (action === "approve") {
      if (creative.status !== "pending_review") {
        return NextResponse.json(
          { error: "Seules les annonces en attente de révision peuvent être approuvées" },
          { status: 400 },
        );
      }

      await db
        .update(adCreatives)
        .set({
          status: "approved",
          reviewedBy: "admin",
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(adCreatives.id, id));

      return NextResponse.json({ ok: true, status: "approved" });
    }

    if (action === "reject") {
      if (creative.status !== "pending_review") {
        return NextResponse.json(
          { error: "Seules les annonces en attente de révision peuvent être rejetées" },
          { status: 400 },
        );
      }

      await db
        .update(adCreatives)
        .set({
          status: "rejected",
          rejectionReason: reason ?? null,
          reviewedBy: "admin",
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(adCreatives.id, id));

      return NextResponse.json({ ok: true, status: "rejected" });
    }

    // action === "regenerate"
    if (creative.status !== "pending_review" && creative.status !== "rejected" && creative.status !== "error") {
      return NextResponse.json(
        { error: "Seules les annonces pending_review, rejected ou error peuvent être régénérées" },
        { status: 400 },
      );
    }

    // Get the company
    const [company] = await db
      .select()
      .from(adCompanies)
      .where(eq(adCompanies.id, creative.companyId))
      .limit(1);

    if (!company) {
      return NextResponse.json(
        { error: "Entreprise non trouvée" },
        { status: 404 },
      );
    }

    const dur = creative.durationMs;
    const adFormat = (creative.format as AdFormat) ?? "horizontal";
    const sizes = AD_SIZES[adFormat];

    // Update version
    const newVersion = (creative.version ?? 1) + 1;

    await db
      .update(adCreatives)
      .set({
        status: "generating",
        version: newVersion,
        rejectionReason: null,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(adCreatives.id, id));

    try {
      // Generate new ad script
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
          contact: (company.contact as {
            phone: string | null;
            email: string | null;
            address: string | null;
          }) ?? { phone: null, email: null, address: null },
          socialLinks:
            (company.socialLinks as Record<string, string>) ?? {},
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
                  videoResult
                    .videoUrl!.replace(
                      "data:application/json;base64,",
                      "",
                    ),
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
        .where(eq(adCreatives.id, id));

      await logCost({
        companyId: creative.companyId,
        creativeId: id,
        action: "regenerate",
        provider: "template",
        costUsd: 0,
      });

      return NextResponse.json({
        ok: true,
        status: "pending_review",
        version: newVersion,
      });
    } catch (err) {
      await db
        .update(adCreatives)
        .set({
          status: "error",
          errorMessage: (err as Error).message,
          updatedAt: new Date(),
        })
        .where(eq(adCreatives.id, id));

      return NextResponse.json(
        { error: (err as Error).message },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error("[advertising/creatives PATCH]", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
