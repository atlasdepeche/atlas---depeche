/**
 * Ad creative generator — creates ad scripts and scene layouts from company
 * analysis. Uses a deterministic template to generate professional ad content.
 *
 * Cost: $0 (no external API calls).
 */
import type { CompanyAnalysis, AdScript, AdScene } from "./types";

/**
 * Generate a complete ad script from company analysis.
 * Returns structured scenes with text, CTA, and layout instructions.
 * Deterministic template — zero API cost.
 */
export function generateAdScript(
  company: CompanyAnalysis,
  durationMs: number = 10000,
): AdScript {
  const sceneCount = Math.max(2, Math.ceil(durationMs / 3000));
  const sceneDuration = Math.floor(durationMs / sceneCount);
  const lastDuration = durationMs - sceneDuration * (sceneCount - 1);

  const pc = company.primaryColor || "#1a1a2e";
  const sc = company.secondaryColor || "#e94560";

  const scenes: AdScene[] = [];

  // Scene 1: Logo + company name
  scenes.push({
    id: "scene_1",
    order: 1,
    durationMs: sceneDuration,
    background: `linear-gradient(135deg, ${pc}, ${sc})`,
    transition: "fade",
    elements: [
      ...(company.logoUrl
        ? [
            {
              type: "logo" as const,
              content: company.logoUrl,
              x: 50,
              y: 35,
              width: 30,
              height: 30,
              style: { objectFit: "contain" },
              animation: {
                type: "scaleIn" as const,
                delayMs: 0,
                durationMs: 500,
              },
            },
          ]
        : []),
      {
        type: "text" as const,
        content: company.name,
        x: 50,
        y: company.logoUrl ? 65 : 50,
        width: 80,
        height: 12,
        style: {
          fontSize: "2.5vw",
          fontWeight: "bold",
          color: "#ffffff",
          textAlign: "center",
        },
        animation: {
          type: "fadeIn" as const,
          delayMs: 300,
          durationMs: 400,
        },
      },
    ],
  });

  // Middle scenes: services or description
  const middleItems =
    company.services.length > 0
      ? company.services.slice(0, sceneCount - 2)
      : [company.description || company.activity || company.name];

  for (let i = 0; i < middleItems.length && scenes.length < sceneCount - 1; i++) {
    scenes.push({
      id: `scene_${i + 2}`,
      order: i + 2,
      durationMs: sceneDuration,
      background: i % 2 === 0 ? pc : sc,
      transition: "slide",
      elements: [
        {
          type: "text" as const,
          content: middleItems[i] ?? "",
          x: 50,
          y: 50,
          width: 80,
          height: 15,
          style: {
            fontSize: "2vw",
            fontWeight: "600",
            color: "#ffffff",
            textAlign: "center",
          },
          animation: {
            type: "slideIn" as const,
            delayMs: 0,
            durationMs: 400,
          },
        },
      ],
    });
  }

  // Pad to sceneCount if not enough middle scenes
  while (scenes.length < sceneCount - 1) {
    const idx = scenes.length;
    scenes.push({
      id: `scene_${idx + 1}`,
      order: idx + 1,
      durationMs: sceneDuration,
      background: pc,
      transition: "slide",
      elements: [
        {
          type: "text" as const,
          content: company.description || company.name,
          x: 50,
          y: 50,
          width: 80,
          height: 15,
          style: {
            fontSize: "2vw",
            color: "#ffffff",
            textAlign: "center",
          },
          animation: {
            type: "fadeIn" as const,
            delayMs: 0,
            durationMs: 400,
          },
        },
      ],
    });
  }

  // Final scene: CTA
  scenes.push({
    id: `scene_${sceneCount}`,
    order: sceneCount,
    durationMs: lastDuration,
    background: `linear-gradient(135deg, ${sc}, ${pc})`,
    transition: "zoom",
    elements: [
      {
        type: "text" as const,
        content: "En savoir plus",
        x: 50,
        y: 40,
        width: 80,
        height: 10,
        style: {
          fontSize: "1.8vw",
          color: "#ffffff",
          textAlign: "center",
        },
        animation: {
          type: "fadeIn" as const,
          delayMs: 0,
          durationMs: 300,
        },
      },
      {
        type: "cta" as const,
        content: company.website,
        x: 50,
        y: 60,
        width: 40,
        height: 10,
        style: {},
        animation: {
          type: "scaleIn" as const,
          delayMs: 200,
          durationMs: 400,
        },
      },
    ],
  });

  return {
    headline: company.name,
    subheadline: company.activity || company.description || "",
    body: "",
    cta: "En savoir plus",
    ctaUrl: company.website,
    scenes,
    music: { mood: "professional", bpm: 120 },
    voiceover: null,
  };
}
