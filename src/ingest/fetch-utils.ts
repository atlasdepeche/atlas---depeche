/**
 * Shared fetch layer for all connectors. "Polite" means: identifiable
 * User-Agent, a timeout, and a response-size cap — never bypass robots.txt
 * or any other technical protection (see docs/MASTER_PROMPT.md section 23).
 */

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 2_000_000; // 2 MB
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (compatible; AtlasDepecheBot/0.1; +https://github.com/atlasdepeche/atlas-depeche)";

export class PoliteFetchError extends Error {}

export interface PoliteFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  userAgent?: string;
}

export async function politeFetch(
  url: string,
  options: PoliteFetchOptions = {},
): Promise<string> {
  const timeoutMs =
    options.timeoutMs ?? Number(process.env.RADAR_FETCH_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  const maxBytes =
    options.maxBytes ?? Number(process.env.RADAR_MAX_RESPONSE_BYTES ?? DEFAULT_MAX_BYTES);
  const userAgent =
    options.userAgent ?? process.env.RADAR_USER_AGENT ?? DEFAULT_USER_AGENT;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": userAgent,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new PoliteFetchError(`${url} responded ${res.status}`);
    }

    if (!res.body) {
      return await res.text();
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let received = 0;
    let text = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        controller.abort();
        throw new PoliteFetchError(`${url} exceeded max response size (${maxBytes} bytes)`);
      }
      text += decoder.decode(value, { stream: true });
    }

    return text;
  } catch (err) {
    if (err instanceof PoliteFetchError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new PoliteFetchError(`${url} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
