export default function BootstrapPlaceholder() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem" }}>
      <h1>Atlas Depeche</h1>
      <p>
        Phase 0 bootstrap. The public site (Arabic/French locales, RTL) ships
        in Phase 4 — see <code>docs/MASTER_PROMPT.md</code> and{" "}
        <code>CLAUDE.md</code>.
      </p>
      <p>
        Health check: <a href="/api/health">/api/health</a>
      </p>
    </main>
  );
}
