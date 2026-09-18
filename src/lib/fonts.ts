import { Inter, Lora } from "next/font/google";

/**
 * Font configuration — self-hosted via next/font, zero layout shift.
 *
 * Arabic: Noto Naskh Arabic via next/font/google (for Fusha body/headlines)
 * French: Lora (serif, for body/headlines)
 * UI: Inter (sans-serif, for metadata, nav, UI elements)
 *
 * The actual CSS variable names are set via className on <html> in the
 * public locale layout, making them available throughout the app.
 */
export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const lora = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lora",
});

/**
 * For Arabic (Noto Naskh Arabic), we use next/font/google.
 * This font is loaded only when the Arabic locale is active.
 */
// Noto Naskh Arabic is loaded dynamically in the Arabic layout via
// a separate import to avoid loading it for French pages.
