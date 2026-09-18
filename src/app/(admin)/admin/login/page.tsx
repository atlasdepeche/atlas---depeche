"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <main
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
        background: "#f5f5f5",
      }}
    >
      <form
        action={formAction}
        style={{
          background: "#fff",
          padding: "2.5rem",
          borderRadius: 8,
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          width: "100%",
          maxWidth: 380,
        }}
      >
        <h1
          style={{
            margin: "0 0 0.25rem",
            fontSize: "1.4rem",
            fontWeight: 700,
          }}
        >
          Atlas Depeche
        </h1>
        <p style={{ margin: "0 0 1.5rem", fontSize: "0.9rem", color: "#666" }}>
          Administration
        </p>

        {state && "error" in state && (
          <div
            style={{
              background: "#fdecea",
              color: "#a01c1c",
              padding: "0.6rem 0.8rem",
              borderRadius: 4,
              fontSize: "0.85rem",
              marginBottom: "1rem",
            }}
          >
            {state.error}
          </div>
        )}

        <label style={{ display: "block", marginBottom: "1rem" }}>
          <span style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem", color: "#333" }}>
            Nom d&apos;utilisateur
          </span>
          <input
            name="username"
            required
            autoComplete="username"
            style={{
              width: "100%",
              padding: "0.6rem 0.8rem",
              border: "1px solid #ccc",
              borderRadius: 4,
              fontSize: "0.95rem",
              boxSizing: "border-box",
            }}
          />
        </label>

        <label style={{ display: "block", marginBottom: "1.5rem" }}>
          <span style={{ display: "block", fontSize: "0.85rem", marginBottom: "0.25rem", color: "#333" }}>
            Mot de passe
          </span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            style={{
              width: "100%",
              padding: "0.6rem 0.8rem",
              border: "1px solid #ccc",
              borderRadius: 4,
              fontSize: "0.95rem",
              boxSizing: "border-box",
            }}
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          style={{
            width: "100%",
            padding: "0.7rem",
            background: "#1a1a1a",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
