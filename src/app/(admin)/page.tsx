import Link from "next/link";

export default function BootstrapPlaceholder() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem" }}>
      <h1>Atlas Depeche</h1>
      <p>
        Internal dev index. See <code>docs/MASTER_PROMPT.md</code> and{" "}
        <code>CLAUDE.md</code>.
      </p>
      <ul>
        <li>
          Public site: <Link href="/ar">/ar</Link> (Fusha, RTL) ·{" "}
          <Link href="/fr">/fr</Link>
        </li>
        <li>
          Radar (Phase 1): <Link href="/admin/events">/admin/events</Link>
        </li>
        <li>
          CMS (Phase 3): <Link href="/admin/articles">/admin/articles</Link>
        </li>
        <li>
          Health check: <Link href="/api/health">/api/health</Link>
        </li>
      </ul>
    </main>
  );
}
