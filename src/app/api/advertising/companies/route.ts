/**
 * API route: POST /api/advertising/companies
 * Creates a new company record from analyzed data.
 */
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { adCompanies } from "@/db/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      url,
      name,
      domain,
      description,
      activity,
      services,
      products,
      logoUrl,
      website,
      contact,
      socialLinks,
      tone,
      primaryColor,
      secondaryColor,
      images,
    } = body;

    if (!url || !name) {
      return NextResponse.json(
        { error: "URL et nom requis" },
        { status: 400 },
      );
    }

    const [company] = await db
      .insert(adCompanies)
      .values({
        name,
        url,
        domain: domain ?? new URL(url).hostname.replace(/^www\./, ""),
        description: description ?? null,
        activity: activity ?? null,
        logoUrl: logoUrl ?? null,
        website: website ?? url,
        contact: contact ?? null,
        socialLinks: socialLinks ?? null,
        services: services ?? [],
        products: products ?? [],
        tone: tone ?? "professional",
        primaryColor: primaryColor ?? "#1a1a2e",
        secondaryColor: secondaryColor ?? "#e94560",
        images: images ?? [],
        status: "company",
      })
      .returning({ id: adCompanies.id });

    if (!company) {
      return NextResponse.json(
        { error: "Failed to create company" },
        { status: 500 },
      );
    }

    return NextResponse.json({ companyId: company.id });
  } catch (err) {
    console.error("[advertising/companies]", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const companies = await db
      .select()
      .from(adCompanies)
      .orderBy(adCompanies.createdAt);

    return NextResponse.json({ companies });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
