import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient } from "./anthropic-client";
import type { AgentRunOutcome, EventInput, EvidenceInput } from "./types";
import type { VerificationResult } from "./verification";

const DEFAULT_MODEL = "claude-opus-5";

const ConcernSchema = z.object({
  type: z.enum([
    "contradiction",
    "weak_source",
    "recycled_news",
    "identity_mixup",
    "out_of_context_image",
    "inter_source_conflict",
    "insufficient_corroboration",
    "other",
  ]),
  description: z.string(),
  severity: z.enum(["low", "medium", "high"]),
});

const AdversarialResultSchema = z.object({
  concerns: z.array(ConcernSchema).max(15),
  // Adversarial review can only push confidence down, never up — it's a
  // devil's advocate pass, not a second opinion that can boost the score.
  confidenceAdjustment: z.number().int().min(-100).max(0),
  summary: z.string(),
});

export type AdversarialResult = z.infer<typeof AdversarialResultSchema>;

const SYSTEM_PROMPT = `You are the Adversarial / Fact-Check Agent for a Moroccan news platform (Atlas Depeche). You receive the same sources the Verification Agent saw, plus its verdict. Your job is to actively try to break the story — you are the skeptic, not a second confirmation.

Look specifically for:
- contradictions between sources
- a single weak or unofficial source being treated as sufficient
- this being recycled/old news dressed up as new
- two different people/places/dates being conflated
- signs the "evidence" is an out-of-context image or unrelated event
- disagreement between sources that the Verification Agent's summary glossed over

You may only ever recommend LOWERING confidence (confidenceAdjustment is 0 or negative — never positive). If you find nothing wrong, return an empty concerns list and confidenceAdjustment: 0. Do not invent a problem to seem thorough — only flag what the provided sources actually show.`;

function formatSources(sources: EvidenceInput[]): string {
  return sources
    .map(
      (s) =>
        `[${s.index}] source="${s.sourceName}" url=${s.url} published=${s.publishedAt ?? "unknown"}\ntitle: ${s.title}\nsummary: ${s.summary}`,
    )
    .join("\n\n");
}

export async function runAdversarial(params: {
  event: EventInput;
  sources: EvidenceInput[];
  verification: VerificationResult;
  model?: string;
}): Promise<AgentRunOutcome<AdversarialResult>> {
  const model = params.model ?? process.env.ANTHROPIC_ADVERSARIAL_MODEL ?? DEFAULT_MODEL;
  const startedAt = new Date();

  try {
    const client = getAnthropicClient();
    const response = await client.messages.parse({
      model,
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content:
            `Event category: ${params.event.category}\nEvent title (as detected): ${params.event.title}\n\n` +
            `Sources:\n\n${formatSources(params.sources)}\n\n` +
            `Verification Agent's verdict (overallConfidence=${params.verification.overallConfidence}, ` +
            `insufficientCorroboration=${params.verification.insufficientCorroboration}):\n` +
            `${params.verification.overallReasoning}\n\n` +
            `Claims:\n${params.verification.claims.map((c) => `- [${c.status}, conf=${c.confidence}] ${c.claimText}`).join("\n")}`,
        },
      ],
      output_config: { format: zodOutputFormat(AdversarialResultSchema) },
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
