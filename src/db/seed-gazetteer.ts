/**
 * Morocco Knowledge Base v0 — docs/MASTER_PROMPT.md section 22.
 *
 * The 12 regions were verified against the 2015 territorial reform (Décret
 * n°2.15.10, 20 Feb 2015 / Bulletin Officiel n°6340) via web search on
 * 2026-09-18 — not recalled from memory. Major cities and the two
 * institutions below are common, stable, non-disputed names; still flagged
 * `verified: true` only for entries actually cross-checked this session,
 * so a future pass can tell "checked" apart from "obviously true, not
 * re-checked" at a glance.
 */

export interface SeedGazetteerEntry {
  type:
    | "region"
    | "city"
    | "province"
    | "institution"
    | "agency"
    | "ministry"
    | "company"
    | "club"
    | "place"
    | "event"
    | "figure"
    | "terminology";
  nameAr: string;
  nameFr: string;
  aliases?: string[];
  verified: boolean;
  notes?: string;
}

export const SEED_GAZETTEER: SeedGazetteerEntry[] = [
  // --- 12 regions (2015 reform), verified via web search 2026-09-18 ---
  { type: "region", nameAr: "طنجة-تطوان-الحسيمة", nameFr: "Tanger-Tétouan-Al Hoceïma", verified: true },
  { type: "region", nameAr: "الشرق", nameFr: "Oriental", verified: true },
  { type: "region", nameAr: "فاس-مكناس", nameFr: "Fès-Meknès", verified: true },
  { type: "region", nameAr: "الرباط-سلا-القنيطرة", nameFr: "Rabat-Salé-Kénitra", verified: true },
  { type: "region", nameAr: "بني ملال-خنيفرة", nameFr: "Béni Mellal-Khénifra", verified: true },
  { type: "region", nameAr: "الدار البيضاء-سطات", nameFr: "Casablanca-Settat", verified: true },
  { type: "region", nameAr: "مراكش-آسفي", nameFr: "Marrakech-Safi", verified: true },
  { type: "region", nameAr: "درعة-تافيلالت", nameFr: "Drâa-Tafilalet", verified: true },
  { type: "region", nameAr: "سوس-ماسة", nameFr: "Souss-Massa", verified: true },
  { type: "region", nameAr: "كلميم-واد نون", nameFr: "Guelmim-Oued Noun", verified: true },
  { type: "region", nameAr: "العيون-الساقية الحمراء", nameFr: "Laâyoune-Sakia El Hamra", verified: true },
  { type: "region", nameAr: "الداخلة-وادي الذهب", nameFr: "Dakhla-Oued Ed-Dahab", verified: true },

  // --- major cities (section 21's list) — stable, well-known names,
  // not individually re-verified this session ---
  { type: "city", nameAr: "الدار البيضاء", nameFr: "Casablanca", verified: false },
  { type: "city", nameAr: "الرباط", nameFr: "Rabat", verified: false },
  { type: "city", nameAr: "مراكش", nameFr: "Marrakech", aliases: ["Marrakesh"], verified: false },
  { type: "city", nameAr: "طنجة", nameFr: "Tanger", aliases: ["Tangier"], verified: false },
  { type: "city", nameAr: "أكادير", nameFr: "Agadir", verified: false },
  { type: "city", nameAr: "فاس", nameFr: "Fès", aliases: ["Fez"], verified: false },
  { type: "city", nameAr: "مكناس", nameFr: "Meknès", verified: false },
  { type: "city", nameAr: "وجدة", nameFr: "Oujda", verified: false },
  { type: "city", nameAr: "تطوان", nameFr: "Tétouan", verified: false },
  { type: "city", nameAr: "العيون", nameFr: "Laâyoune", verified: false },
  { type: "city", nameAr: "الداخلة", nameFr: "Dakhla", verified: false },

  // --- institutions referenced by the seed sources (Phase 1) ---
  {
    type: "institution",
    nameAr: "رئاسة الحكومة",
    nameFr: "Chef du Gouvernement",
    aliases: ["SGG", "Secrétariat Général du Gouvernement"],
    verified: false,
    notes: "Source: src/db/seed-sources.ts (cg.gov.ma) — currently paused (403).",
  },
  {
    type: "agency",
    nameAr: "وكالة المغرب العربي للأنباء",
    nameFr: "Maghreb Arabe Presse",
    aliases: ["MAP", "MAPNews"],
    verified: false,
    notes: "National wire. Source: src/db/seed-sources.ts (map.ma) — currently paused (403).",
  },
];
