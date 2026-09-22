"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CreativeActionsProps {
  creativeId: string;
  status: string;
  companyId: string;
}

export default function CreativeActions({
  creativeId,
  status,
  companyId,
}: CreativeActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  async function handleAction(action: "approve" | "reject" | "regenerate", reason?: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/advertising/creatives/${creativeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur");
        return;
      }
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  const canApprove = status === "pending_review";
  const canReject = status === "pending_review";
  const canRegenerate = ["pending_review", "rejected", "error"].includes(status);

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
      {canApprove && (
        <button
          onClick={() => handleAction("approve")}
          disabled={loading}
          style={{
            padding: "0.5rem 1rem",
            background: loading ? "#999" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: 6,
            fontSize: "0.85rem",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          Approuver
        </button>
      )}
      {canReject && !showRejectInput && (
        <button
          onClick={() => setShowRejectInput(true)}
          disabled={loading}
          style={{
            padding: "0.5rem 1rem",
            background: "white",
            color: "#dc3545",
            border: "1px solid #dc3545",
            borderRadius: 6,
            fontSize: "0.85rem",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Rejeter
        </button>
      )}
      {canReject && showRejectInput && (
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Raison du rejet…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            style={{
              padding: "0.4rem 0.6rem",
              border: "1px solid #dc3545",
              borderRadius: 4,
              fontSize: "0.85rem",
              width: 200,
            }}
          />
          <button
            onClick={() => handleAction("reject", rejectReason || undefined)}
            disabled={loading}
            style={{
              padding: "0.4rem 0.8rem",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: 4,
              fontSize: "0.85rem",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Confirmer
          </button>
          <button
            onClick={() => {
              setShowRejectInput(false);
              setRejectReason("");
            }}
            style={{
              padding: "0.4rem 0.8rem",
              background: "white",
              color: "#666",
              border: "1px solid #ddd",
              borderRadius: 4,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Annuler
          </button>
        </div>
      )}
      {canRegenerate && (
        <button
          onClick={() => handleAction("regenerate")}
          disabled={loading}
          style={{
            padding: "0.5rem 1rem",
            background: loading ? "#999" : "#6f42c1",
            color: "white",
            border: "none",
            borderRadius: 6,
            fontSize: "0.85rem",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Régénération…" : "Régénérer"}
        </button>
      )}
      {status === "approved" && (
        <Link
          href={`/advertising/campaigns/new?companyId=${companyId}&creativeId=${creativeId}`}
          style={{
            padding: "0.5rem 1rem",
            background: "#17a2b8",
            color: "white",
            border: "none",
            borderRadius: 6,
            fontSize: "0.85rem",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Créer campagne
        </Link>
      )}
      {error && (
        <div
          style={{
            color: "#dc3545",
            fontSize: "0.8rem",
            marginTop: 4,
            width: "100%",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
