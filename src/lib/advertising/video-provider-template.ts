/**
 * Template-based video provider — the MVP renderer.
 * Generates HTML5 ad player data that renders professional animated
 * advertisements directly in the browser. No external API needed.
 *
 * This is the default/fallback provider — always available, zero cost.
 * The output is a self-contained HTML5 ad unit that plays like a video
 * with scenes, transitions, text animations, and CTA.
 *
 * Quality: professional template-based ads with brand colors, typography,
 * and animations. Not AI-generated video, but clean and effective.
 */
import type {
  VideoProvider,
  VideoGenerateParams,
  VideoGenerateResult,
  AdScene,
  AdSceneElement,
} from "./types";

export interface TemplatePlayerData {
  version: 1;
  format: string;
  width: number;
  height: number;
  durationMs: number;
  fps: number;
  scenes: AdScene[];
  css: string;
  renderScript: string;
}

/**
 * Generate CSS for a scene element
 */
function elementToCSS(el: AdSceneElement): string {
  const pos = `
    position: absolute;
    left: ${el.x}%;
    top: ${el.y}%;
    width: ${el.width}%;
    height: ${el.height}%;
    transform: translate(-50%, -50%);
  `;

  const animation = el.animation
    ? `
    animation: ${el.animation.type} ${el.animation.durationMs}ms ${el.animation.delayMs}ms both ease-out;
  `
    : "";

  const base = `
    ${pos}
    ${animation}
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  `;

  const styleEntries = Object.entries(el.style)
    .map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${v};`)
    .join("\n    ");

  return `${base}\n    ${styleEntries}`;
}

/**
 * Generate the CSS animation keyframes
 */
function generateKeyframes(): string {
  return `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translate(-50%, -50%) translateY(30px); }
      to { opacity: 1; transform: translate(-50%, -50%) translateY(0); }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
      to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
    @keyframes typewriter {
      from { width: 0; overflow: hidden; }
      to { width: 100%; overflow: hidden; }
    }
    @keyframes pulse {
      0%, 100% { transform: translate(-50%, -50%) scale(1); }
      50% { transform: translate(-50%, -50%) scale(1.05); }
    }
  `;
}

/**
 * Generate scene-specific CSS
 */
function sceneToCSS(scene: AdScene, index: number): string {
  const selector = `.scene-${index}`;
  const elementStyles = scene.elements
    .map(
      (el, i) => `
    ${selector} .el-${i} {
      ${elementToCSS(el)}
    }
  `,
    )
    .join("\n");

  return `
    ${selector} {
      position: absolute;
      inset: 0;
      background: ${scene.background};
      display: flex;
      align-items: center;
      justify-content: center;
    }
    ${elementStyles}
  `;
}

/**
 * Generate the HTML render script for the ad player
 */
function generateRenderScript(scenes: AdScene[]): string {
  const sceneHTML = scenes
    .map(
      (scene, i) => `
      <div class="scene scene-${i}" data-duration="${scene.durationMs}">
        ${scene.elements
          .map(
            (el, j) => `
          <div class="el-${j}">
            ${el.type === "text" ? `<span>${el.content}</span>` : ""}
            ${el.type === "cta" ? `<a href="${el.content}" class="cta-button" target="_blank" rel="noopener">${el.content}</a>` : ""}
            ${el.type === "logo" ? `<img src="${el.content}" alt="Logo" style="max-width:100%;max-height:100%;object-fit:contain;" />` : ""}
            ${el.type === "image" ? `<img src="${el.content}" alt="" style="max-width:100%;max-height:100%;object-fit:cover;border-radius:8px;" />` : ""}
            ${el.type === "shape" ? `<div style="width:100%;height:100%;background:${el.content};"></div>` : ""}
          </div>
        `,
          )
          .join("\n")}
      </div>
    `,
    )
    .join("\n");

  return `
    ${sceneHTML}

    <script>
    let currentScene = 0;
    let sceneTimeout = null;

    function showScene(index) {
      document.querySelectorAll('.scene').forEach(s => s.style.display = 'none');
      const scene = document.querySelectorAll('.scene')[index];
      if (scene) {
        scene.style.display = 'flex';
        const duration = parseInt(scene.dataset.duration || '3000');
        sceneTimeout = setTimeout(() => {
          if (currentScene < ${scenes.length - 1}) {
            currentScene++;
            showScene(currentScene);
          }
        }, duration);
      }
    }

    function playAd() {
      currentScene = 0;
      showScene(0);
    }

    function pauseAd() {
      if (sceneTimeout) clearTimeout(sceneTimeout);
    }

    function restartAd() {
      pauseAd();
      playAd();
    }

    // Auto-play on load
    document.addEventListener('DOMContentLoaded', playAd);
  `;
}

export const templateProvider: VideoProvider = {
  name: "template",

  isAvailable(): boolean {
    return true; // always available
  },

  async generate(params: VideoGenerateParams): Promise<VideoGenerateResult> {
    // Build complete CSS
    const sceneCSS = params.scenes
      .map((scene, i) => sceneToCSS(scene, i))
      .join("\n");
    const css = `
      .ad-container {
        position: relative;
        width: 100%;
        max-width: ${params.width}px;
        aspect-ratio: ${params.width} / ${params.height};
        overflow: hidden;
        border-radius: 12px;
        font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
        user-select: none;
      }
      ${generateKeyframes()}
      ${sceneCSS}
      .cta-button {
        display: inline-block;
        padding: 12px 32px;
        background: #e94560;
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 1.1em;
        transition: transform 0.2s, box-shadow 0.2s;
        cursor: pointer;
      }
      .cta-button:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 20px rgba(233, 69, 96, 0.4);
      }
    `;

    const renderScript = generateRenderScript(params.scenes);

    const playerData: TemplatePlayerData = {
      version: 1,
      format: params.format,
      width: params.width,
      height: params.height,
      durationMs: params.durationMs,
      fps: params.fps,
      scenes: params.scenes,
      css,
      renderScript,
    };

    // For the MVP, we store the player data as JSON.
    // The frontend will render it as an HTML5 ad unit.
    // In a future phase, we could use Puppeteer/Playwright
    // to capture frames and FFmpeg to create actual MP4 files.
    const videoUrl = `data:application/json;base64,${Buffer.from(JSON.stringify(playerData)).toString("base64")}`;

    return {
      success: true,
      videoUrl,
      thumbnailUrl: null,
      durationMs: params.durationMs,
      fileSizeBytes: JSON.stringify(playerData).length,
      provider: "template",
    };
  },

  estimateCost(_params: VideoGenerateParams): number {
    return 0; // free — template-based, no external API
  },
};
