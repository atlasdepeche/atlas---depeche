/**
 * Puppeteer + FFmpeg video provider — generates real MP4 files.
 * Renders HTML5 ad scenes frame-by-frame via headless Chromium,
 * then encodes frames into MP4 via FFmpeg.
 *
 * Requires: ffmpeg binary in PATH (installed via nixpacks.toml on Railway)
 * Requires: Chrome/Chromium (puppeteer-core uses system Chrome)
 *
 * Cost: $0 — fully local rendering.
 */
import puppeteer from "puppeteer-core";
import ffmpeg from "fluent-ffmpeg";
import { execSync } from "child_process";
import { writeFile, unlink, readdir, rmdir, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import type {
  VideoProvider,
  VideoGenerateParams,
  VideoGenerateResult,
  AdScene,
} from "./types";

function isFFmpegAvailable(): boolean {
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function findChromePath(): string | null {
  const paths =
    process.platform === "win32"
      ? [
          "C:/Program Files/Google/Chrome/Application/chrome.exe",
          "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
          `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
        ]
      : [
          "/usr/bin/google-chrome",
          "/usr/bin/google-chrome-stable",
          "/usr/bin/chromium-browser",
          "/usr/bin/chromium",
          "/snap/bin/chromium",
          `${process.env.HOME}/.cache/puppeteer/chrome/linux-*/chrome-linux*/chrome`,
        ];

  for (const p of paths) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs") as typeof import("fs");
      if (fs.existsSync(p)) return p;
    } catch {
      // skip
    }
  }
  return null;
}

function buildSceneHTML(scenes: AdScene[]): string {
  return scenes
    .map(
      (scene, i) => `
      <div class="scene scene-${i}" data-index="${i}" data-duration="${scene.durationMs}"
           style="position:absolute;inset:0;background:${scene.background};display:${i === 0 ? "flex" : "none"};align-items:center;justify-content:center;">
        ${scene.elements
          .map(
            (el) => `
          <div style="position:absolute;left:${el.x}%;top:${el.y}%;width:${el.width}%;height:${el.height}%;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;">
            ${el.type === "text" ? `<span style="color:#fff;font-family:system-ui,sans-serif;">${el.content}</span>` : ""}
            ${el.type === "logo" ? `<img src="${el.content}" style="max-width:100%;max-height:100%;object-fit:contain;" />` : ""}
            ${el.type === "image" ? `<img src="${el.content}" style="max-width:100%;max-height:100%;object-fit:cover;" />` : ""}
            ${el.type === "cta" ? `<a style="display:inline-block;padding:12px 32px;background:#e94560;color:#fff;border-radius:8px;font-weight:600;text-decoration:none;font-family:system-ui,sans-serif;">${el.content}</a>` : ""}
          </div>
        `,
          )
          .join("")}
      </div>
    `,
    )
    .join("");
}

function generateFullHTML(
  scenes: AdScene[],
  width: number,
  height: number,
  css: string,
): string {
  const sceneHTML = buildSceneHTML(scenes);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:${width}px; height:${height}px; overflow:hidden; background:#000; }
  .ad-container { position:relative; width:${width}px; height:${height}px; overflow:hidden; }
  ${css}
</style>
</head>
<body>
<div class="ad-container">
  ${sceneHTML}
</div>
<script>
  const scenes = document.querySelectorAll('.scene');
  let current = 0;
  function showScene(idx) {
    scenes.forEach(s => s.style.display = 'none');
    if (idx < scenes.length) {
      scenes[idx].style.display = 'flex';
      const dur = parseInt(scenes[idx].dataset.duration || '3000');
      setTimeout(() => showScene(idx + 1), dur);
    }
  }
  showScene(0);
</script>
</body>
</html>`;
}

async function captureFrames(
  html: string,
  width: number,
  height: number,
  durationMs: number,
  fps: number,
  outDir: string,
): Promise<number> {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: findChromePath() ?? undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height });

    const tmpHtml = join(outDir, "ad.html");
    await writeFile(tmpHtml, html, "utf-8");
    await page.goto(`file://${tmpHtml}`, { waitUntil: "domcontentloaded" });
    await new Promise((r) => setTimeout(r, 500));

    const totalFrames = Math.ceil((durationMs / 1000) * fps);
    const intervalMs = 1000 / fps;

    for (let f = 0; f < totalFrames; f++) {
      const framePath = join(outDir, `frame-${String(f).padStart(5, "0")}.png`);
      await page.screenshot({ path: framePath, type: "png" });

      const elapsed = (f + 1) * intervalMs;
      await page.evaluate((ms: number) => {
        const scenes = document.querySelectorAll<HTMLElement>(".scene");
        let acc = 0;
        for (let i = 0; i < scenes.length; i++) {
          const dur = parseInt(scenes[i]!.dataset.duration || "3000");
          if (ms < acc + dur) {
            scenes.forEach((s, j) => {
              s.style.display = j === i ? "flex" : "none";
            });
            return;
          }
          acc += dur;
        }
      }, elapsed);
    }

    return totalFrames;
  } finally {
    await browser.close();
  }
}

function encodeMP4(
  framesDir: string,
  fps: number,
  width: number,
  height: number,
  totalFrames: number,
  outPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg()
      .input(join(framesDir, "frame-%05d.png"))
      .inputOptions([`-framerate ${fps}`])
      .videoCodec("libx264")
      .outputOptions([
        "-pix_fmt yuv420p",
        "-crf 23",
        "-preset fast",
        "-movflags +faststart",
        `-vf scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
      ])
      .output(outPath)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err));

    cmd.run();
  });
}

async function cleanup(dir: string): Promise<void> {
  try {
    const files = await readdir(dir);
    for (const f of files) await unlink(join(dir, f));
    await rmdir(dir);
  } catch {
    // ignore
  }
}

export const puppeteerFFmpegProvider: VideoProvider = {
  name: "puppeteer-ffmpeg",

  isAvailable(): boolean {
    return isFFmpegAvailable();
  },

  async generate(
    params: VideoGenerateParams,
  ): Promise<VideoGenerateResult> {
    if (!isFFmpegAvailable()) {
      return {
        success: false,
        videoUrl: null,
        thumbnailUrl: null,
        durationMs: params.durationMs,
        fileSizeBytes: 0,
        provider: "puppeteer-ffmpeg",
        error: "FFmpeg not installed — add nixpacks.toml with ffmpeg or install locally",
      };
    }

    const chromePath = findChromePath();
    if (!chromePath) {
      return {
        success: false,
        videoUrl: null,
        thumbnailUrl: null,
        durationMs: params.durationMs,
        fileSizeBytes: 0,
        provider: "puppeteer-ffmpeg",
        error: "Chrome/Chromium not found — install Google Chrome",
      };
    }

    const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const workDir = join(tmpdir(), `ad-render-${uid}`);
    const framesDir = join(workDir, "frames");
    const mp4Path = join(workDir, "ad.mp4");

    await mkdir(framesDir, { recursive: true });

    try {
      // Build a minimal CSS for the scenes (reuse template CSS logic)
      const sceneCSS = params.scenes
        .map(
          (scene, i) => `
        .scene-${i} {
          position: absolute; inset: 0;
          background: ${scene.background};
          display: flex; align-items: center; justify-content: center;
        }
      `,
        )
        .join("\n");

      const css = `.ad-container{position:relative;width:${params.width}px;height:${params.height}px;overflow:hidden;font-family:system-ui,sans-serif;user-select:none;}${sceneCSS}`;

      const html = generateFullHTML(
        params.scenes,
        params.width,
        params.height,
        css,
      );

      console.log(
        `[puppeteer-ffmpeg] Capturing ${Math.ceil((params.durationMs / 1000) * params.fps)} frames...`,
      );
      const totalFrames = await captureFrames(
        html,
        params.width,
        params.height,
        params.durationMs,
        params.fps,
        framesDir,
      );

      console.log(`[puppeteer-ffmpeg] Encoding ${totalFrames} frames to MP4...`);
      await encodeMP4(
        framesDir,
        params.fps,
        params.width,
        params.height,
        totalFrames,
        mp4Path,
      );

      // Read the MP4 and convert to base64 data URL
      const { readFileSync } = await import("fs");
      const mp4Buffer = readFileSync(mp4Path);
      const base64 = mp4Buffer.toString("base64");
      const videoUrl = `data:video/mp4;base64,${base64}`;

      console.log(
        `[puppeteer-ffmpeg] Done — ${(mp4Buffer.length / 1024).toFixed(0)} KB`,
      );

      return {
        success: true,
        videoUrl,
        thumbnailUrl: null,
        durationMs: params.durationMs,
        fileSizeBytes: mp4Buffer.length,
        provider: "puppeteer-ffmpeg",
      };
    } catch (err) {
      return {
        success: false,
        videoUrl: null,
        thumbnailUrl: null,
        durationMs: params.durationMs,
        fileSizeBytes: 0,
        provider: "puppeteer-ffmpeg",
        error: (err as Error).message,
      };
    } finally {
      await cleanup(framesDir);
      await unlink(mp4Path).catch(() => {});
      await cleanup(workDir).catch(() => {});
    }
  },

  estimateCost(_params: VideoGenerateParams): number {
    return 0;
  },
};
