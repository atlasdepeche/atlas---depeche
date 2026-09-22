/**
 * Advertising module types — shared across all advertising sub-modules.
 * Completely isolated from the editorial system.
 */

// --- Company analysis -------------------------------------------------------

export interface CompanyAnalysis {
  name: string;
  domain: string;
  description: string;
  activity: string;
  services: string[];
  products: string[];
  logoUrl: string | null;
  website: string;
  contact: {
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  socialLinks: Record<string, string>;
  tone: "professional" | "casual" | "luxury" | "modern" | "traditional";
  primaryColor: string;
  secondaryColor: string;
  images: string[];
  rawHtml: string;
}

// --- Ad creative -------------------------------------------------------------

export type AdStatus =
  | "generating"
  | "pending_review"
  | "approved"
  | "scheduled"
  | "published"
  | "paused"
  | "rejected"
  | "error";

export type AdFormat = "horizontal" | "vertical" | "square";

export type AdDuration = 10 | 15 | 20 | 30;

export interface AdScene {
  id: string;
  order: number;
  durationMs: number;
  background: string;
  backgroundImage?: string;
  elements: AdSceneElement[];
  transition: "fade" | "slide" | "zoom" | "cut";
}

export interface AdSceneElement {
  type: "text" | "logo" | "image" | "cta" | "shape";
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: Record<string, string>;
  animation?: {
    type: "fadeIn" | "slideIn" | "scaleIn" | "typewriter";
    delayMs: number;
    durationMs: number;
  };
}

export interface AdScript {
  headline: string;
  subheadline: string;
  body: string;
  cta: string;
  ctaUrl: string;
  scenes: AdScene[];
  music: {
    mood: "upbeat" | "calm" | "energetic" | "professional";
    bpm: number;
  };
  voiceover: string | null;
}

export interface AdCreativeData {
  script: AdScript;
  format: AdFormat;
  durationMs: number;
  width: number;
  height: number;
  fps: number;
}

// --- Video provider ----------------------------------------------------------

export interface VideoProvider {
  name: string;
  generate(params: VideoGenerateParams): Promise<VideoGenerateResult>;
  estimateCost(params: VideoGenerateParams): number;
  isAvailable(): boolean;
}

export interface VideoGenerateParams {
  scenes: AdScene[];
  format: AdFormat;
  durationMs: number;
  width: number;
  height: number;
  fps: number;
  audioUrl?: string;
}

export interface VideoGenerateResult {
  success: boolean;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  durationMs: number;
  fileSizeBytes: number;
  provider: string;
  error?: string;
}

// --- Campaign ----------------------------------------------------------------

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export type CampaignPriority = "low" | "normal" | "high" | "urgent";

export interface CampaignRotation {
  currentIndex: number;
  lastRotatedAt: Date;
  impressionsSinceRotation: number;
}

// --- Tracking ----------------------------------------------------------------

export interface AdImpressionData {
  creativeId: string;
  companyId: string;
  campaignId: string | null;
  placement: string;
  timestamp: Date;
  userAgent: string | null;
  deviceType: "mobile" | "tablet" | "desktop";
  country: string | null;
}

export interface AdClickData {
  creativeId: string;
  companyId: string;
  campaignId: string | null;
  placement: string;
  timestamp: Date;
  targetUrl: string;
}

// --- Cost control ------------------------------------------------------------

export interface CostGuardResult {
  allowed: boolean;
  reason: string;
  currentCost: number;
  dailyLimit: number;
  generationsToday: number;
  maxGenerationsPerDay: number;
}

// --- Ad sizes ----------------------------------------------------------------

export const AD_SIZES: Record<AdFormat, { width: number; height: number }> = {
  horizontal: { width: 1920, height: 1080 },
  vertical: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
};

export const AD_FPS = 30;
export const AD_DURATION_DEFAULT: AdDuration = 10;
