"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function GenerateButton({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/advertising/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, format: "horizontal", durationMs: 10000 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la génération");
        return;
      }
      router.push(`/advertising/creatives/${data.creativeId}`);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          padding: "0.5rem 1.2rem",
          background: loading ? "#999" : "#e94560",
          color: "white",
          border: "none",
          borderRadius: 6,
          fontSize: "0.9rem",
          cursor: loading ? "not-allowed" : "pointer",
          fontWeight: 600,
        }}
      >
        {loading ? "Génération…" : "Générer un anuncio"}
      </button>
      {error && (
        <div style={{ color: "#dc3545", fontSize: "0.8rem", marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}
