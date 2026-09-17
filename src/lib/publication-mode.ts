/**
 * Publication modes — see CLAUDE.md "Publication Modes".
 *
 *   shadow      produce everything, publish nothing
 *   assisted    prepare content, require human approval
 *   automated   allowlisted low-risk categories only, strict rules
 *   human_only  always human
 *
 * A new environment (or a category with no explicit override) must resolve
 * to "shadow". Automated is opt-in per category — never a global default —
 * so `resolvePublicationMode` refuses to return "automated" unless the
 * category is present in `automatedCategories`.
 */

export type PublicationMode = "shadow" | "assisted" | "automated" | "human_only";

const VALID_MODES: readonly PublicationMode[] = [
  "shadow",
  "assisted",
  "automated",
  "human_only",
];

export function parsePublicationMode(value: string | undefined): PublicationMode {
  if (value && (VALID_MODES as readonly string[]).includes(value)) {
    return value as PublicationMode;
  }
  return "shadow";
}

export function resolvePublicationMode(params: {
  category: string;
  globalMode: PublicationMode;
  automatedCategories: ReadonlySet<string>;
}): PublicationMode {
  const { category, globalMode, automatedCategories } = params;

  if (globalMode === "automated" && !automatedCategories.has(category)) {
    return "assisted";
  }

  return globalMode;
}

export function canAutoPublish(mode: PublicationMode): boolean {
  return mode === "automated";
}
