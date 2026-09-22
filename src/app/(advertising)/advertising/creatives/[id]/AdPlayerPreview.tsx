"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface SceneElement {
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
}

interface Scene {
  id: string;
  durationMs: number;
  background: string;
  elements: SceneElement[];
}

interface PlayerData {
  version: number;
  format: string;
  width: number;
  height: number;
  durationMs: number;
  scenes: Scene[];
  css: string;
}

interface AdPlayerPreviewProps {
  playerData: PlayerData;
  companyName: string;
  ctaUrl?: string | null;
  primaryColor?: string | null;
}

export default function AdPlayerPreview({
  playerData,
  companyName,
  ctaUrl,
  primaryColor,
}: AdPlayerPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const playSceneRef = useRef<(index: number) => void>(() => {});

  useEffect(() => {
    playSceneRef.current = (index: number) => {
      if (index >= playerData.scenes.length) {
        setIsPlaying(false);
        setCurrentScene(0);
        return;
      }
      setCurrentScene(index);
      const scene = playerData.scenes[index];
      if (scene) {
        timerRef.current = setTimeout(
          () => playSceneRef.current(index + 1),
          scene.durationMs,
        );
      }
    };
  }, [playerData]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    playSceneRef.current(0);
  }, []);

  const handlePause = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsPlaying(false);
  }, []);

  const handleRestart = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsPlaying(true);
    playSceneRef.current(0);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: playerData.width,
        aspectRatio: `${playerData.width} / ${playerData.height}`,
        overflow: "hidden",
        borderRadius: 12,
        background: "#000",
        marginTop: "0.75rem",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: playerData.css }} />

      {playerData.scenes.map((scene, i) => (
        <div
          key={scene.id}
          style={{
            position: "absolute",
            inset: 0,
            background: scene.background,
            display: i === currentScene ? "flex" : "none",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {scene.elements.map((el, j) => (
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
                  href={ctaUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "10px 28px",
                    background: primaryColor ?? "#e94560",
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
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Controls overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          background: isPlaying ? "transparent" : "rgba(0,0,0,0.3)",
          transition: "background 0.3s",
          zIndex: 10,
        }}
      >
        {!isPlaying && (
          <button
            onClick={handlePlay}
            style={{
              width: 60,
              height: 60,
              background: "rgba(255,255,255,0.9)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            ▶
          </button>
        )}
        {isPlaying && (
          <>
            <button
              onClick={handlePause}
              style={{
                width: 44,
                height: 44,
                background: "rgba(255,255,255,0.8)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1rem",
                border: "none",
                cursor: "pointer",
              }}
            >
              ❚❚
            </button>
            <button
              onClick={handleRestart}
              style={{
                width: 44,
                height: 44,
                background: "rgba(255,255,255,0.8)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1rem",
                border: "none",
                cursor: "pointer",
              }}
            >
              ↺
            </button>
          </>
        )}
      </div>

      {/* Scene indicator */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          display: "flex",
          gap: 4,
          zIndex: 5,
        }}
      >
        {playerData.scenes.map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background:
                i === currentScene
                  ? "rgba(255,255,255,0.9)"
                  : "rgba(255,255,255,0.3)",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>

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
        Publicité · {companyName}
      </div>
    </div>
  );
}
