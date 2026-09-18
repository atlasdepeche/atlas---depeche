import Link from "next/link";

/**
 * 404 page — shown when a user navigates to an unknown route under
 * /[locale] (e.g. /fr/nonexistent-slug). Uses the design system tokens.
 */
export default function NotFound() {
  return (
    <div
      style={{
        textAlign: "center",
        paddingBlock: "var(--space-16)",
        paddingInline: "var(--space-4)",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-6xl)",
          fontWeight: 700,
          color: "var(--color-text-tertiary)",
          margin: 0,
          lineHeight: 1,
        }}
      >
        404
      </p>
      <h1
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "var(--text-2xl)",
          color: "var(--color-text)",
          marginBlock: "var(--space-4)",
        }}
      >
        Page introuvable
      </h1>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "var(--text-lg)",
          color: "var(--color-text-secondary)",
          marginBlockEnd: "var(--space-8)",
        }}
      >
        La page que vous recherchez n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/fr"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          color: "var(--color-accent)",
          textDecoration: "none",
          paddingBlock: "var(--space-2)",
          paddingInline: "var(--space-4)",
          border: "1px solid var(--color-accent)",
          borderRadius: "4px",
        }}
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
