import { NextResponse } from "next/server";
import { parsePublicationMode } from "@/lib/publication-mode";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "atlas-depeche",
    time: new Date().toISOString(),
    publicationMode: parsePublicationMode(process.env.PUBLICATION_MODE),
  });
}
