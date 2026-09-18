import { Noto_Naskh_Arabic } from "next/font/google";

/**
 * Arabic font — Noto Naskh Arabic, a quality serif for Fusha text.
 * Loaded separately from the French/Latin fonts so Arabic pages get
 * the right typeface and Latin pages don't load unnecessary glyphs.
 */
export const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  display: "swap",
  variable: "--font-noto-naskh",
});
