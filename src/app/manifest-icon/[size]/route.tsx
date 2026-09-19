import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";

// PWA manifest sizes only (192, 512 — the two Chrome/Android actually ask
// for). Anything else 404s rather than silently generating an arbitrary
// size manifest.ts didn't declare.
const ALLOWED_SIZES = new Set([192, 512]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size: sizeParam } = await params;
  const size = Number(sizeParam);
  if (!ALLOWED_SIZES.has(size)) {
    return NextResponse.json({ error: "unsupported size" }, { status: 404 });
  }

  // Same gradient + wordmark treatment as the site name in the header
  // (src/app/(public)/[locale]/layout.tsx) — "AD" monogram since a full
  // wordmark doesn't read at 192px, let alone 512px shrunk to a home-
  // screen icon.
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a3a5c, #D62976)",
        }}
      >
        <span
          style={{
            fontSize: size * 0.5,
            fontWeight: 700,
            color: "#ffffff",
            fontFamily: "serif",
            letterSpacing: "-0.02em",
          }}
        >
          AD
        </span>
      </div>
    ),
    { width: size, height: size },
  );
}
