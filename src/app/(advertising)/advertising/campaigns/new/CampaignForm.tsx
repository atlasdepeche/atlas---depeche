"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface CreativeOption {
  id: string;
  companyId: string;
  headline: string | null;
  format: string;
  durationMs: number;
  companyName: string;
}

interface CampaignFormProps {
  creatives: CreativeOption[];
  preselectedCompanyId?: string;
  preselectedCreativeId?: string;
}

export default function CampaignForm({
  creatives,
  preselectedCompanyId,
  preselectedCreativeId,
}: CampaignFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCreativeId, setSelectedCreativeId] = useState(
    preselectedCreativeId ?? creatives[0]?.id ?? "",
  );
  const [name, setName] = useState("");
  const [priority, setPriority] = useState("normal");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [budgetUsd, setBudgetUsd] = useState("");
  const [maxImpressions, setMaxImpressions] = useState("");

  const selectedCreative = creatives.find((c) => c.id === selectedCreativeId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCreativeId) {
      setError("Sélectionnez une annonce");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/advertising/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedCreative?.companyId ?? preselectedCompanyId,
          creativeId: selectedCreativeId,
          name: name || undefined,
          status: "draft",
          priority,
          startsAt: startsAt || undefined,
          endsAt: endsAt || undefined,
          budgetUsd: budgetUsd ? parseFloat(budgetUsd) : undefined,
          maxImpressions: maxImpressions ? parseInt(maxImpressions) : undefined,
          placements: ["homepage"],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la création");
        return;
      }
      router.push("/advertising/campaigns");
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: "0.5rem 0.75rem",
    border: "1px solid #ddd",
    borderRadius: 6,
    fontSize: "0.9rem",
    width: "100%",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#333",
    marginBottom: 4,
    display: "block",
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "1.5rem" }}>
      {/* Creative selection */}
      <div style={{ marginBottom: "1.25rem" }}>
        <label style={labelStyle}>Annonce</label>
        <select
          value={selectedCreativeId}
          onChange={(e) => setSelectedCreativeId(e.target.value)}
          style={{ ...inputStyle, background: "white" }}
        >
          {creatives.map((cr) => (
            <option key={cr.id} value={cr.id}>
              {cr.companyName} — {cr.headline ?? "Sans titre"} ({cr.format},{" "}
              {cr.durationMs / 1000}s)
            </option>
          ))}
        </select>
      </div>

      {/* Campaign name */}
      <div style={{ marginBottom: "1.25rem" }}>
        <label style={labelStyle}>Nom de la campagne (optionnel)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={selectedCreative ? `${selectedCreative.companyName} — Campagne` : "Nom…"}
          style={inputStyle}
        />
      </div>

      {/* Priority */}
      <div style={{ marginBottom: "1.25rem" }}>
        <label style={labelStyle}>Priorité</label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          style={{ ...inputStyle, background: "white" }}
        >
          <option value="low">Basse</option>
          <option value="normal">Normale</option>
          <option value="high">Haute</option>
          <option value="urgent">Urgente</option>
        </select>
      </div>

      {/* Dates */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem" }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Date de début (optionnel)</label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Date de fin (optionnel)</label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Budget & impressions */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Budget max USD (optionnel)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={budgetUsd}
            onChange={(e) => setBudgetUsd(e.target.value)}
            placeholder="Ex: 50"
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Impressions max (optionnel)</label>
          <input
            type="number"
            min="0"
            value={maxImpressions}
            onChange={(e) => setMaxImpressions(e.target.value)}
            placeholder="Ex: 10000"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "0.75rem",
            background: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: 6,
            color: "#dc3545",
            fontSize: "0.9rem",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Submit */}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          type="submit"
          disabled={loading || !selectedCreativeId}
          style={{
            padding: "0.6rem 1.5rem",
            background: loading || !selectedCreativeId ? "#999" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: 6,
            fontSize: "0.9rem",
            cursor: loading || !selectedCreativeId ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Création…" : "Créer la campagne"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            padding: "0.6rem 1.5rem",
            background: "white",
            color: "#666",
            border: "1px solid #ddd",
            borderRadius: 6,
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
