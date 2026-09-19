import { getDictionary, type Locale } from "@/i18n/locales";
import { getRadarItems } from "@/lib/public-site";

const TICKER_ITEM_COUNT = 12;
// Slower, explicitly requested — was 45s per loop.
const TICKER_DURATION_SECONDS = 90;

/**
 * Scrolling headline strip at the top of the page. Direction follows each
 * locale's own reading direction, not a fixed convention — Arabic scrolls
 * right-to-left, French left-to-right (both explicitly requested). See the
 * `ticker-scroll` keyframe in globals.css for how one keyframe drives both
 * directions via `animation-direction`.
 *
 * Headlines link straight to the ORIGINAL article (rel="noopener nofollow"),
 * same rule as the homepage cards — this is still the aggregator, not a
 * second copy of the text.
 */
export async function BreakingTicker({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const { items } = await getRadarItems(locale, 1);
  const headlines = items.slice(0, TICKER_ITEM_COUNT);

  if (headlines.length === 0) return null;

  const headlineLink = (item: (typeof headlines)[number], keyPrefix: string) => (
    <a
      key={`${keyPrefix}-${item.id}`}
      href={item.url}
      target="_blank"
      rel="noopener nofollow"
      dir={locale === "ar" ? "rtl" : "ltr"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        color: "var(--color-text)",
        textDecoration: "none",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)",
        fontWeight: 500,
        // The scroll track around this is forced direction: ltr so the
        // marquee animation math stays predictable (see below) — but that
        // also forces every headline's own text into an ltr base
        // paragraph, which can misorder Arabic (numbers, punctuation) even
        // though individual RTL runs still shape right-to-left on their
        // own. `dir` + isolate here give each headline its own correct
        // reading-direction context without touching the outer scroll math.
        unicodeBidi: "isolate",
      }}
    >
      {item.title}
      <span
        aria-hidden="true"
        style={{
          color: "var(--color-error)",
          marginInline: "var(--space-6)",
          fontWeight: 700,
        }}
      >
        •
      </span>
    </a>
  );

  return (
    <div
      role="region"
      aria-label={dict.breakingLabel}
      style={{
        display: "flex",
        alignItems: "stretch",
        borderBlockEnd: "1px solid var(--color-border)",
        background: "var(--color-bg-subtle)",
        // Forced ltr + a per-locale row/row-reverse swap, same reasoning
        // as the scroll track below: without overriding it, dir="rtl" puts
        // the badge on the right for Arabic and dir="ltr" puts it on the
        // left for French — their own natural "start" edge each time.
        // Explicitly requested instead: swap them, so each locale's badge
        // sits on the side the OTHER locale's badge naturally uses.
        direction: "ltr",
        flexDirection: locale === "ar" ? "row" : "row-reverse",
      }}
    >
      <div
        dir={locale === "ar" ? "rtl" : "ltr"}
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          paddingInline: "var(--space-4)",
          background: "var(--color-error)",
          color: "#ffffff",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xs)",
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {dict.breakingLabel}
      </div>
      {/* direction: ltr is forced here — without it, the Arabic page's
          dir="rtl" mirrors this flex row (items anchor to the right,
          overflow extends left instead of right), which flips which way
          the loop actually scrolls versus what animationDirection below
          assumes. Forcing ltr makes both locales lay out identically, so
          animationDirection alone reliably controls the visible direction —
          confirmed necessary after the first version scrolled backwards. */}
      <div style={{ overflow: "hidden", flex: 1, direction: "ltr" }}>
        <div
          className="ticker-track"
          style={{
            display: "flex",
            alignItems: "center",
            width: "max-content",
            whiteSpace: "nowrap",
            paddingBlock: "var(--space-2)",
            paddingInlineStart: "var(--space-6)",
            animationName: "ticker-scroll",
            animationDuration: `${TICKER_DURATION_SECONDS}s`,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
            // Track content is the SAME list rendered twice (below), so
            // translateX(-50%) is exactly one full loop. Both locales now
            // share the same forced-ltr physical layout (anchored left,
            // overflow to the right): "normal" (0 → -50%) moves content
            // right-to-left — used for Arabic; "reverse" (-50% → 0) moves
            // it left-to-right — used for French.
            animationDirection: locale === "ar" ? "normal" : "reverse",
          }}
        >
          {headlines.map((item) => headlineLink(item, "a"))}
          {headlines.map((item) => headlineLink(item, "b"))}
        </div>
      </div>
    </div>
  );
}
