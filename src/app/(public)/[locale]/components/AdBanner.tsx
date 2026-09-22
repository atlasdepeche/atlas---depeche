/**
 * AdBanner — public-facing ad display component.
 * Renders an HTML5 ad player or falls back to a static banner.
 * Completely isolated from the editorial content.
 *
 * Usage: <AdBanner placement="homepage" />
 */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface AdData {
  creativeId: string;
  companyId: string;
  companyName: string;
  companyWebsite: string;
  playerData: {
    version: number;
    format: string;
    width: number;
    height: number;
    durationMs: number;
    scenes: Array<{
      id: string;
      durationMs: number;
      background: string;
      elements: Array<{
        type: string;
        content: string;
        x: number;
        y: number;
        width: number;
        height: number;
        style: Record<string, string>;
        animation?: {
          type: string;
          delayMs: number;
          durationMs: number;
        };
      }>;
    }>;
    css: string;
    renderScript: string;
  } | null;
  headline: string | null;
  cta: string | null;
  ctaUrl: string | null;
}

interface AdBannerProps {
  placement: string;
  className?: string;
}

export default function AdBanner({ placement, className }: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ad, setAd] = useState<AdData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const playSceneRef = useRef<(index: number) => void>(() => {});

  // Fetch ad data
  useEffect(() => {
    fetch(`/api/advertising/serve?placement=${encodeURIComponent(placement)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.creativeId) {
          setAd(data);
          // Track impression
          fetch("/api/advertising/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "impression",
              creativeId: data.creativeId,
              companyId: data.companyId,
              campaignId: null,
              placement,
            }),
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }, [placement]);

  // Auto-play scenes (use ref to avoid circular dependency)
  useEffect(() => {
    playSceneRef.current = (index: number) => {
      if (!ad?.playerData?.scenes) return;
      if (index >= ad.playerData.scenes.length) {
        setIsPlaying(false);
        setCurrentScene(0);
        return;
      }
      setCurrentScene(index);
      const scene = ad.playerData.scenes[index];
      if (scene) {
        timerRef.current = setTimeout(
          () => playSceneRef.current(index + 1),
          scene.durationMs,
        );
      }
    };
  }, [ad]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    playSceneRef.current(0);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!ad) return null;

  // Static fallback when no player data
  if (!ad.playerData) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          background: "#f8f9fa",
          border: "1px solid #e0e0e0",
          borderRadius: 8,
          padding: "1rem",
          textAlign: "center",
        }}
      >
        {ad.headline && (
          <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
            {ad.headline}
          </div>
        )}
        {ad.cta && ad.ctaUrl && (
          <a
            href={ad.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              fetch("/api/advertising/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "click",
                  creativeId: ad.creativeId,
                  companyId: ad.companyId,
                  campaignId: null,
                  placement,
                  targetUrl: ad.ctaUrl,
                }),
              }).catch(() => {});
            }}
            style={{
              display: "inline-block",
              padding: "0.5rem 1.5rem",
              background: "#e94560",
              color: "white",
              borderRadius: 6,
              textDecoration: "none",
              fontSize: "0.9rem",
            }}
          >
            {ad.cta}
          </a>
        )}
        <div
          style={{ fontSize: "0.7rem", color: "#999", marginTop: "0.5rem" }}
        >
          Publicité · {ad.companyName}
        </div>
      </div>
    );
  }

  // HTML5 ad player
  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: ad.playerData.width,
        aspectRatio: `${ad.playerData.width} / ${ad.playerData.height}`,
        overflow: "hidden",
        borderRadius: 12,
        background: "#000",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: ad.playerData.css }} />

      {ad.playerData.scenes.map((s, i) => (
        <div
          key={s.id}
          style={{
            position: "absolute",
            inset: 0,
            background: s.background,
            display: i === currentScene && isPlaying ? "flex" : "none",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {s.elements.map((el, j) => (
            <div
              key={j}
              style={{
                position: "absolute",
                left: `${el.x}%`,
                top: `${el.y}%`,
                width: `${el.width}%`,
                height: `${el.height}%`,
                transform: "translate(-50%, -50%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...el.style,
              }}
            >
              {el.type === "text" && <span>{el.content}</span>}
              {el.type === "cta" && (
                <a
                  href={ad.ctaUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    fetch("/api/advertising/track", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        type: "click",
                        creativeId: ad.creativeId,
                        companyId: ad.companyId,
                        campaignId: null,
                        placement,
                        targetUrl: ad.ctaUrl,
                      }),
                    }).catch(() => {});
                  }}
                  style={{
                    display: "inline-block",
                    padding: "12px 32px",
                    background: "#e94560",
                    color: "white",
                    borderRadius: 8,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  {el.content}
                </a>
              )}
              {el.type === "logo" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={el.content}
                  alt="Logo"
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                />
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Play button overlay */}
      {!isPlaying && (
        <button
          onClick={handlePlay}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            cursor: "pointer",
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              background: "rgba(255,255,255,0.9)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
            }}
          >
            ▶
          </div>
        </button>
      )}

      {/* Label */}
      <div
        style={{
          position: "absolute",
          bottom: 4,
          right: 8,
          fontSize: "0.6rem",
          color: "rgba(255,255,255,0.6)",
          zIndex: 5,
        }}
      >
        Publicité · {ad.companyName}
      </div>
    </div>
  );
}
