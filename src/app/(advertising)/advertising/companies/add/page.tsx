"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddCompanyPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    companyId: string;
    name: string;
    analysis: Record<string, unknown>;
  } | null>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/advertising/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erreur lors de l'analyse");
        return;
      }

      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!result) return;
    setLoading(true);

    try {
      const res = await fetch("/api/advertising/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          name: result.analysis.name,
          domain: result.analysis.domain,
          description: result.analysis.description,
          activity: result.analysis.activity,
          services: result.analysis.services,
          products: result.analysis.products,
          logoUrl: result.analysis.logoUrl,
          website: result.analysis.website,
          contact: result.analysis.contact,
          socialLinks: result.analysis.socialLinks,
          tone: result.analysis.tone,
          primaryColor: result.analysis.primaryColor,
          secondaryColor: result.analysis.secondaryColor,
          images: result.analysis.images,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la création");
        return;
      }

      router.push(`/advertising/companies/${data.companyId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 800 }}>
      <h1>Ajouter une entreprise</h1>
      <p style={{ color: "#666" }}>
        Collez l&apos;URL du site web de l&apos;entreprise. Le système analysera
        automatiquement les informations publiques disponibles.
      </p>

      <form onSubmit={handleAnalyze} style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://exemple.com"
            required
            style={{
              flex: 1,
              padding: "0.75rem",
              border: "1px solid #ccc",
              borderRadius: 6,
              fontSize: "1rem",
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#1a1a2e",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: loading ? "wait" : "pointer",
              fontSize: "1rem",
            }}
          >
            {loading ? "Analyse en cours..." : "Analyser"}
          </button>
        </div>
      </form>

      {error && (
        <div
          style={{
            padding: "1rem",
            background: "#fee",
            border: "1px solid #fcc",
            borderRadius: 6,
            color: "#c00",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <div
          style={{
            border: "1px solid #e0e0e0",
            borderRadius: 8,
            padding: "1.5rem",
            marginBottom: "1rem",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Résultat de l&apos;analyse</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <strong>Nom:</strong> {(result.analysis.name as string) ?? "N/A"}
            </div>
            <div>
              <strong>Domaine:</strong> {(result.analysis.domain as string) ?? "N/A"}
            </div>
            <div>
              <strong>Activité:</strong> {(result.analysis.activity as string) ?? "N/A"}
            </div>
            <div>
              <strong>Tonalité:</strong> {(result.analysis.tone as string) ?? "N/A"}
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <strong>Description:</strong>{" "}
              {(result.analysis.description as string) ?? "N/A"}
            </div>
            <div>
              <strong>Couleurs:</strong>{" "}
              <span
                style={{
                  display: "inline-block",
                  width: 16,
                  height: 16,
                  background: (result.analysis.primaryColor as string) ?? "#333",
                  borderRadius: 3,
                  verticalAlign: "middle",
                }}
              />{" "}
              <span
                style={{
                  display: "inline-block",
                  width: 16,
                  height: 16,
                  background: (result.analysis.secondaryColor as string) ?? "#666",
                  borderRadius: 3,
                  verticalAlign: "middle",
                }}
              />
            </div>
            <div>
              <strong>Logo:</strong>{" "}
              {(result.analysis.logoUrl as string) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.analysis.logoUrl as string}
                  alt="Logo"
                  style={{ height: 32, verticalAlign: "middle" }}
                />
              ) : (
                "Non trouvé"
              )}
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <strong>Services:</strong>{" "}
              {((result.analysis.services as string[]) ?? []).join(", ") || "N/A"}
            </div>
            <div>
              <strong>Contact:</strong>{" "}
              {(result.analysis.contact as Record<string, string>)?.email ?? "N/A"}
            </div>
            <div>
              <strong>Téléphone:</strong>{" "}
              {(result.analysis.contact as Record<string, string>)?.phone ?? "N/A"}
            </div>
          </div>

          {(result.analysis.images as string[])?.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <strong>Images:</strong>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                {(result.analysis.images as string[]).slice(0, 5).map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={img}
                    alt=""
                    style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 4 }}
                  />
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem" }}>
            <button
              onClick={handleConfirm}
              disabled={loading}
              style={{
                padding: "0.75rem 1.5rem",
                background: "#2a6",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: loading ? "wait" : "pointer",
                fontSize: "1rem",
                fontWeight: 600,
              }}
            >
              {loading ? "Création..." : "✓ Confirmer et créer l'entreprise"}
            </button>
            <button
              onClick={() => {
                setResult(null);
                setUrl("");
              }}
              style={{
                padding: "0.75rem 1.5rem",
                background: "#f0f0f0",
                color: "#333",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
