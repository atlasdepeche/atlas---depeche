import { ImageResponse } from "next/og";

// Next.js's special-file convention — auto-linked as the browser tab
// favicon on every page, no manual <link> needed.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
        <span style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", fontFamily: "serif" }}>AD</span>
      </div>
    ),
    { ...size },
  );
}
