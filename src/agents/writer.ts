import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient } from "./anthropic-client";
import type { AgentRunOutcome, EventInput, EvidenceInput } from "./types";

const DEFAULT_MODEL = "claude-opus-5";

export type Locale = "ar" | "fr";

const ArticleDraftSchema = z.object({
  title: z.string().describe("Faithful, non-clickbait headline for the article page"),
  headlines: z.object({
    breaking: z.string(),
    standard: z.string(),
    mobile: z.string().describe("Short enough for a mobile push notification"),
    social: z.string(),
    seo: z.string().describe("Keyword-forward but still accurate, for the <title> tag"),
  }),
  body: z
    .string()
    .describe("Full article body in the target locale only, several paragraphs, original prose"),
  slug: z
    .string()
    .describe("URL-safe slug: lowercase, Latin characters, hyphen-separated, transliterated if needed"),
});

export type ArticleDraft = z.infer<typeof ArticleDraftSchema>;

export interface ClaimInput {
  text: string;
  status: string;
  confidence: number | null;
}

function systemPromptFor(locale: Locale): string {
  const localeRules =
    locale === "ar"
      ? `Write in Modern Standard Arabic (Fusha) ONLY. No Darija. No French words mixed into Arabic sentences, except an official foreign proper name with no standard Arabic form. Natural, modern, grammatically correct — not a stiff literal translation of anything.`
      : `Write in journalistic French (Médias24 / Le Monde register), not tourist-brochure French and not a literal translation of Arabic source text. Keep official Moroccan proper names consistent with the gazetteer, if any is referenced in the sources.`;

  return `You are the ${locale === "ar" ? "Arabic Fusha" : "French"} Writer Agent for a Moroccan news platform (Atlas Depeche).

You receive a VERIFIED event: its claims (each already scored by a Verification Agent) and the raw source excerpts that back them. Write a real, original news article from these facts — never a raw machine dump or a reflow of one source's text.

${localeRules}

Rules:
- Every factual statement in the body must trace to one of the provided claims/sources. Never invent a quote, number, name, or detail not present in the input.
- If a claim's status is "disputed" or "unconfirmed", say so in the text (attribute it, hedge it) — never present it as settled fact.
- The headline must be fully supported by the body — no bait, no overstatement of what's verified.
- Produce all 5 headline variants (breaking/standard/mobile/social/seo per the schema), each faithful to the same verified facts.
- Do not copy sentences verbatim from any single source — this is original reporting built from verified facts, not a rewrite of one article.`;
}

function formatClaims(claims: ClaimInput[]): string {
  return claims
    .map((c) => `- [${c.status}${c.confidence != null ? `, confidence=${c.confidence}` : ""}] ${c.text}`)
    .join("\n");
}

function formatSources(sources: EvidenceInput[]): string {
  return sources
    .map(
      (s) =>
        `[${s.index}] source="${s.sourceName}" url=${s.url}\ntitle: ${s.title}\nsummary: ${s.summary}`,
    )
    .join("\n\n");
}

export async function writeArticle(params: {
  locale: Locale;
  event: EventInput;
  claims: ClaimInput[];
  sources: EvidenceInput[];
  model?: string;
}): Promise<AgentRunOutcome<ArticleDraft>> {
  const model = params.model ?? process.env.ANTHROPIC_WRITER_MODEL ?? DEFAULT_MODEL;
  const startedAt = new Date();

  try {
    const client = getAnthropicClient();
    const response = await client.messages.parse({
      model,
      max_tokens: 8000,
      system: systemPromptFor(params.locale),
      messages: [
        {
          role: "user",
          content:
            `Event category: ${params.event.category}\nEvent title (as detected): ${params.event.title}\n\n` +
            `Verified claims:\n${formatClaims(params.claims)}\n\n` +
            `Source excerpts:\n\n${formatSources(params.sources)}`,
        },
      ],
      output_config: { format: zodOutputFormat(ArticleDraftSchema) },
    });

    const finishedAt = new Date();

    if (!response.parsed_output) {
      return {
        status: "error",
        output: null,
        errorMessage: `model did not return valid structured output (stop_reason=${response.stop_reason})`,
        model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        startedAt,
        finishedAt,
      };
    }

    return {
      status: "success",
      output: response.parsed_output,
      errorMessage: null,
      model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      startedAt,
      finishedAt,
    };
  } catch (err) {
    return {
      status: "error",
      output: null,
      errorMessage: err instanceof Error ? err.message : String(err),
      model,
      inputTokens: 0,
      outputTokens: 0,
      startedAt,
      finishedAt: new Date(),
    };
  }
}
