import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient } from "./anthropic-client";
import type { AgentRunOutcome, EventInput, EvidenceInput } from "./types";

const DEFAULT_MODEL = "claude-opus-5";

const ClaimVerdictSchema = z.object({
  claimText: z.string().describe("The claim, stated plainly, in the language it was reported in"),
  category: z.enum(["who", "what", "when", "where", "how_many", "quote", "other"]),
  status: z.enum(["supported", "contradicted", "disputed", "unconfirmed"]),
  confidence: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("0-100. Conservative — only high when corroborated by more than one independent source."),
  reasoning: z.string(),
  supportingExcerpts: z
    .array(
      z.object({
        sourceIndex: z.number().int().describe("index into the provided source list"),
        excerpt: z.string().describe("verbatim quote from that source, not paraphrased"),
        stance: z.enum(["supports", "contradicts", "neutral"]),
      }),
    )
    .describe("Every excerpt must be verbatim from one of the provided sources — never invented."),
});

const VerificationResultSchema = z.object({
  claims: z.array(ClaimVerdictSchema).max(15),
  overallConfidence: z.number().int().min(0).max(100),
  overallReasoning: z.string(),
  insufficientCorroboration: z
    .boolean()
    .describe("true if fewer than 2 independent sources (or 1 official primary source) support the core claim"),
});

export type VerificationResult = z.infer<typeof VerificationResultSchema>;

const SYSTEM_PROMPT = `You are the Verification Agent for a Moroccan news platform (Atlas Depeche). Your only input is a set of already-fetched source excerpts about one candidate event. Your job:

1. Extract the discrete factual claims (who/what/when/where/how_many/quote/other) implied by these sources.
2. For each claim, decide status (supported/contradicted/disputed/unconfirmed) using ONLY the provided sources — never your own outside knowledge, never invented facts.
3. Every supporting/contradicting excerpt must be a verbatim quote from one of the provided sources, tagged with its index.
4. Assign confidence conservatively. A single source, even an official one, does not automatically mean high confidence for every detail in it.
5. Set insufficientCorroboration=true unless at least 2 independent sources agree, OR exactly 1 official primary source (a government/institutional source — see the source list's sourceName) directly states the claim.

Never invent a quote, a number, a source, or an event. If the sources don't say it, do not claim it. This mirrors the platform's hard rule: "if confidence is insufficient, draft only, do not publish" — your job is to give an honest, conservative read, not to make the story look more solid than the sources support.`;

function formatSources(sources: EvidenceInput[]): string {
  return sources
    .map(
      (s) =>
        `[${s.index}] source="${s.sourceName}" url=${s.url} published=${s.publishedAt ?? "unknown"}\ntitle: ${s.title}\nsummary: ${s.summary}`,
    )
    .join("\n\n");
}

export async function runVerification(params: {
  event: EventInput;
  sources: EvidenceInput[];
  model?: string;
}): Promise<AgentRunOutcome<VerificationResult>> {
  const model = params.model ?? process.env.ANTHROPIC_VERIFICATION_MODEL ?? DEFAULT_MODEL;
  const startedAt = new Date();

  try {
    const client = getAnthropicClient();
    const response = await client.messages.parse({
      model,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Event category: ${params.event.category}\nEvent title (as detected): ${params.event.title}\n\nSources:\n\n${formatSources(params.sources)}`,
        },
      ],
      output_config: { format: zodOutputFormat(VerificationResultSchema) },
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
