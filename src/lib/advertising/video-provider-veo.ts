/**
 * Google Veo video provider — STUB for future integration.
 * When Google Veo becomes available via API, implement the actual
 * generation logic here. For now, returns unavailable.
 *
 * Priority: implement after the template renderer proves the system works.
 */
import type {
  VideoProvider,
  VideoGenerateParams,
  VideoGenerateResult,
} from "./types";

export const veoProvider: VideoProvider = {
  name: "veo",

  isAvailable(): boolean {
    // Will be true when GOOGLE_CLOUD_PROJECT + VEO_API_KEY are set
    return !!(
      process.env.GOOGLE_CLOUD_PROJECT && process.env.VEO_API_KEY
    );
  },

  async generate(params: VideoGenerateParams): Promise<VideoGenerateResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        videoUrl: null,
        thumbnailUrl: null,
        durationMs: params.durationMs,
        fileSizeBytes: 0,
        provider: "veo",
        error: "Veo API not configured — set GOOGLE_CLOUD_PROJECT and VEO_API_KEY",
      };
    }

    // TODO: Implement actual Veo API call
    // https://ai.google.dev/gemini-api/docs/video-generation
    //
    // Expected flow:
    // 1. Convert AdScene[] to Veo's prompt format
    // 2. Call Veo API with scene descriptions
    // 3. Poll for completion
    // 4. Download generated video
    // 5. Return URL

    return {
      success: false,
      videoUrl: null,
      thumbnailUrl: null,
      durationMs: params.durationMs,
      fileSizeBytes: 0,
      provider: "veo",
      error: "Veo integration not yet implemented — use template provider",
    };
  },

  estimateCost(_params: VideoGenerateParams): number {
    // Veo pricing not yet public — return placeholder
    return 0.10; // estimated $0.10 per 10s video
  },
};
