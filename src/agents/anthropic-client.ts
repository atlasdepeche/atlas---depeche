import Anthropic from "@anthropic-ai/sdk";

let cached: Anthropic | undefined;

// Lazy for the same reason as src/db/client.ts: importing this module must
// not require credentials at module-load time (e.g. during `next build`).
// The bare `new Anthropic()` resolves credentials from the environment
// (ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, or an `ant auth login` profile)
// and throws its own clear error if none exist — we don't duplicate that
// check here.
export function getAnthropicClient(): Anthropic {
  if (!cached) {
    cached = new Anthropic();
  }
  return cached;
}
