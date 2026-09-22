/**
 * Video generation abstraction layer.
 * Defines the interface that all video providers must implement.
 * This allows swapping Veo → Runway → template without rebuilding
 * the advertising system.
 *
 * Provider hierarchy (priority order):
 *   1. Google Veo (when available via API)
 *   2. Runway ML (when API access granted)
 *   3. Template renderer (always available, no external API)
 */
import type {
  VideoProvider,
  VideoGenerateParams,
  VideoGenerateResult,
} from "./types";

// Provider registry — add new providers here
const providers: VideoProvider[] = [];

export function registerVideoProvider(provider: VideoProvider): void {
  providers.push(provider);
}

export function getVideoProvider(name?: string): VideoProvider | undefined {
  if (name) {
    return providers.find((p) => p.name === name);
  }
  // Return first available provider in priority order
  return providers.find((p) => p.isAvailable());
}

export function getAvailableProviders(): VideoProvider[] {
  return providers.filter((p) => p.isAvailable());
}

/**
 * Generate video using the best available provider.
 * Falls back through the provider chain automatically.
 */
export async function generateVideo(
  params: VideoGenerateParams,
  preferredProvider?: string,
): Promise<VideoGenerateResult> {
  const provider = preferredProvider
    ? getVideoProvider(preferredProvider)
    : getVideoProvider();

  if (!provider) {
    return {
      success: false,
      videoUrl: null,
      thumbnailUrl: null,
      durationMs: params.durationMs,
      fileSizeBytes: 0,
      provider: "none",
      error: "No video provider available",
    };
  }

  try {
    return await provider.generate(params);
  } catch (err) {
    return {
      success: false,
      videoUrl: null,
      thumbnailUrl: null,
      durationMs: params.durationMs,
      fileSizeBytes: 0,
      provider: provider.name,
      error: (err as Error).message,
    };
  }
}
