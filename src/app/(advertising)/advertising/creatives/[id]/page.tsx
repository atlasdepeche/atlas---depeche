import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { adCreatives, adCompanies } from "@/db/schema";
import { eq } from "drizzle-orm";
import CreativeActions from "./CreativeActions";

export const metadata: Metadata = {
  title: "Détail annonce — Publicité",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function getCreative(id: string) {
  const rows = await db
    .select({
      id: adCreatives.id,
      companyId: adCreatives.companyId,
      version: adCreatives.version,
      status: adCreatives.status,
      format: adCreatives.format,
      durationMs: adCreatives.durationMs,
      script: adCreatives.script,
      playerData: adCreatives.playerData,
      headline: adCreatives.headline,
      subheadline: adCreatives.subheadline,
      body: adCreatives.body,
      cta: adCreatives.cta,
      ctaUrl: adCreatives.ctaUrl,
      rejectionReason: adCreatives.rejectionReason,
      errorMessage: adCreatives.errorMessage,
      generationCostUsd: adCreatives.generationCostUsd,
      reviewedBy: adCreatives.reviewedBy,
      reviewedAt: adCreatives.reviewedAt,
      createdAt: adCreatives.createdAt,
      updatedAt: adCreatives.updatedAt,
      companyName: adCompanies.name,
      companyUrl: adCompanies.url,
      companyLogoUrl: adCompanies.logoUrl,
      companyPrimaryColor: adCompanies.primaryColor,
    })
    .from(adCreatives)
    .innerJoin(adCompanies, eq(adCreatives.companyId, adCompanies.id))
    .where(eq(adCreatives.id, id))
    .limit(1);

  return rows[0] ?? null;
}

const STATUS_COLORS: Record<string, string> = {
  generating: "#6c757d",
  pending_review: "#ffc107",
  approved: "#28a745",
  published: "#17a2b8",
  rejected: "#dc3545",
  error: "#dc3545",
  paused: "#6c757d",
};

export default async function CreativeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const creative = await getCreative(id);

  if (!creative) {
    notFound();
  }

  const script = creative.script as {
    headline?: string;
    subheadline?: string;
    body?: string;
    cta?: string;
    ctaUrl?: string;
    scenes?: Array<{
      id: string;
      order: number;
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
      }>;
    }>;
    music?: { mood: string; bpm: number };
  } | null;

  const playerData = creative.playerData as {
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
      }>;
    }>;
    css: string;
  } | null;

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 1100 }}>
      <Link
        href={`/advertising/companies/${creative.companyId}`}
        style={{ color: "#666", textDecoration: "none", fontSize: "0.85rem" }}
      >
        ← Retour à {creative.companyName}
      </Link>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginTop: "1rem",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.4rem" }}>
            {creative.headline ?? `Annonce v${creative.version}`}
          </h1>
          <div style={{ color: "#666", fontSize: "0.9rem", marginTop: 4 }}>
            {creative.companyName} · {creative.format} ·{" "}
            {creative.durationMs / 1000}s · Version {creative.version}
          </div>
          <div style={{ marginTop: 8 }}>
            <span
              style={{
                padding: "3px 10px",
                borderRadius: 4,
                fontSize: "0.8rem",
                background: STATUS_COLORS[creative.status] ?? "#ccc",
                color: "white",
                fontWeight: 600,
              }}
            >
              {creative.status}
            </span>
          </div>
        </div>
        <CreativeActions
          creativeId={id}
          status={creative.status}
          companyId={creative.companyId}
        />
      </div>

      {/* Error / Rejection messages */}
      {creative.errorMessage && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            background: "#fff3cd",
            border: "1px solid #ffc107",
            borderRadius: 8,
            fontSize: "0.9rem",
          }}
        >
          <strong>Erreur:</strong> {creative.errorMessage}
        </div>
      )}
      {creative.rejectionReason && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            background: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: 8,
            fontSize: "0.9rem",
          }}
        >
          <strong>Raison du rejet:</strong> {creative.rejectionReason}
        </div>
      )}

      {/* Ad Preview */}
      <div style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", color: "#333" }}>Aperçu</h2>
        {playerData ? (
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
                  display: i === 0 ? "flex" : "none",
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
                      <span
                        style={{
                          padding: "10px 28px",
                          background: creative.companyPrimaryColor ?? "#e94560",
                          color: "white",
                          borderRadius: 8,
                          fontWeight: 600,
                        }}
                      >
                        {el.content}
                      </span>
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
              Publicité · {creative.companyName}
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: "2rem",
              background: "#f8f9fa",
              border: "1px solid #e0e0e0",
              borderRadius: 8,
              textAlign: "center",
              color: "#666",
            }}
          >
            Aucune donnée de prévisualisation disponible
          </div>
        )}
      </div>

      {/* Ad Copy */}
      <div style={{ marginTop: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", color: "#333" }}>Texte de l&apos;annonce</h2>
        <div
          style={{
            display: "grid",
            gap: "0.75rem",
            marginTop: "0.75rem",
            padding: "1rem",
            background: "#f8f9fa",
            borderRadius: 8,
          }}
        >
          <div>
            <div style={{ fontSize: "0.75rem", color: "#999", textTransform: "uppercase" }}>
              Titre
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 600 }}>
              {creative.headline ?? "N/A"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#999", textTransform: "uppercase" }}>
              Sous-titre
            </div>
            <div style={{ fontSize: "0.9rem" }}>
              {creative.subheadline ?? "N/A"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#999", textTransform: "uppercase" }}>
              Corps
            </div>
            <div style={{ fontSize: "0.9rem", color: "#666", lineHeight: 1.5 }}>
              {creative.body ?? "N/A"}
            </div>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#999", textTransform: "uppercase" }}>
                CTA
              </div>
              <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#e94560" }}>
                {creative.cta ?? "N/A"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#999", textTransform: "uppercase" }}>
                URL CTA
              </div>
              <div style={{ fontSize: "0.9rem", color: "#666" }}>
                {creative.ctaUrl ?? "N/A"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scenes breakdown */}
      {script?.scenes && script.scenes.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", color: "#333" }}>
            Scènes ({script.scenes.length})
          </h2>
          <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.75rem" }}>
            {script.scenes.map((scene, i) => (
              <div
                key={scene.id}
                style={{
                  padding: "0.75rem 1rem",
                  border: "1px solid #e0e0e0",
                  borderRadius: 8,
                  background: "#fafafa",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                    Scène {i + 1}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "#666" }}>
                    {scene.durationMs / 1000}s · {scene.background}
                  </span>
                </div>
                <div style={{ marginTop: 4, fontSize: "0.8rem", color: "#666" }}>
                  {scene.elements.length} élément(s):{" "}
                  {scene.elements.map((el) => el.type).join(", ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "#f8f9fa",
          borderRadius: 8,
          fontSize: "0.8rem",
          color: "#666",
        }}
      >
        <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
          <div>
            <strong>Créée:</strong>{" "}
            {creative.createdAt
              ? new Date(creative.createdAt).toLocaleString("fr-FR")
              : "N/A"}
          </div>
          <div>
            <strong>Modifiée:</strong>{" "}
            {creative.updatedAt
              ? new Date(creative.updatedAt).toLocaleString("fr-FR")
              : "N/A"}
          </div>
          {creative.reviewedAt && (
            <div>
              <strong>Revue par:</strong> {creative.reviewedBy} le{" "}
              {new Date(creative.reviewedAt).toLocaleString("fr-FR")}
            </div>
          )}
          <div>
            <strong>Coût:</strong> {creative.generationCostUsd ?? "0"} USD
          </div>
        </div>
      </div>
    </main>
  );
}
