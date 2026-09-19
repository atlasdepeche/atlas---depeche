import { ImageResponse } from "next/og";

// Next.js's special-file convention — auto-linked as
// <link rel="apple-touch-icon">, what iOS actually uses for the home-screen
// icon when someone does Share -> Add to Home Screen. 180x180 is Apple's
// own recommended size (no transparency — iOS ignores/mishandles alpha
// here, hence the solid background instead of a rounded/transparent shape;
// iOS applies its own corner-rounding mask automatically).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        <span style={{ fontSize: 90, fontWeight: 700, color: "#ffffff", fontFamily: "serif" }}>AD</span>
      </div>
    ),
    { ...size },
  );
}
