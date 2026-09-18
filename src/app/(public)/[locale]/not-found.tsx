import Link from "next/link";

/**
 * Locale-aware 404 page — rendered within the [locale] layout when
 * notFound() is called. The layout provides the correct lang/dir/fonts.
 */
export default function LocaleNotFound() {
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
        الصفحة غير موجودة
      </h1>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "var(--text-lg)",
          color: "var(--color-text-secondary)",
          marginBlockEnd: "var(--space-8)",
        }}
      >
        الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
      </p>
      <Link
        href="/ar"
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
        العودة إلى الرئيسية
      </Link>
    </div>
  );
}
