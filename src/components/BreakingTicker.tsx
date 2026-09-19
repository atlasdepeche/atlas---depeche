import { getDictionary, type Locale } from "@/i18n/locales";
import { getRadarItems } from "@/lib/public-site";

const TICKER_ITEM_COUNT = 12;
const TICKER_DURATION_SECONDS = 45;

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
      style={{
        display: "inline-flex",
        alignItems: "center",
        color: "var(--color-text)",
        textDecoration: "none",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)",
        fontWeight: 500,
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
      }}
    >
      <div
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
      <div style={{ overflow: "hidden", flex: 1 }}>
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
            // The track is the SAME list rendered twice (see below), so
            // translateX(-50%) is exactly one full loop — Arabic plays the
            // keyframe forward (physically right-to-left), French plays it
            // reversed (physically left-to-right). transform: translateX()
            // is physical, unaffected by `dir`, so this stays predictable.
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
