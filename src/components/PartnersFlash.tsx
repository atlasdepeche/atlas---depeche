"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/locales";

/**
 * "Partners" strip — deliberately separate from BreakingTicker (the real-
 * news ticker right above it), not merged into it: mixing promotion into
 * the "🔴 EN DIRECT" breaking-news band would make a reader distrust real
 * urgent news the day they realize one of those items was an ad, which
 * undercuts the whole "la précision d'abord" premise the ticker itself
 * exists to back up. Labeled "Nos partenaires" rather than "Publicité" —
 * still honest (a reader understands this isn't news), reads as editorial
 * rather than a banner ad.
 *
 * Today this only lists the user's own other two sites — explicitly
 * designed to also work as a real ad slot later (a paying sponsor is just
 * another entry in PARTNERS below) without changing the mechanism, only
 * the list.
 *
 * A slow crossfade, not the ticker's scrolling marquee — with only 2-3
 * entries a scrolling strip looks repetitive and risks reading as "more
 * breaking news" right under the real one. A fade reads as a rotating
 * spot, distinct on purpose.
 */

interface Partner {
  name: string;
  href: string;
  tagline: Record<Locale, string>;
}

const PARTNERS: Partner[] = [
  {
    name: "Souss Actualités",
    href: "https://souss-actualites.com",
    tagline: {
      fr: "L'actualité du Souss-Massa depuis plus d'un demi-siècle",
      ar: "أخبار جهة سوس ماسة منذ أكثر من نصف قرن",
    },
  },
  {
    name: "RexFoot",
    href: "https://rexfoot.com",
    tagline: {
      fr: "Toute l'actualité du football",
      ar: "كل أخبار كرة القدم",
    },
  },
];

const ROTATION_MS = 5000;
const FADE_MS = 700;

export function PartnersFlash({ locale }: { locale: Locale }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((i) => (i + 1) % PARTNERS.length);
    }, ROTATION_MS);
    return () => clearInterval(timer);
  }, []);

  const label = locale === "ar" ? "شركاؤنا" : "Nos partenaires";

  return (
    <div
      role="complementary"
      aria-label={label}
      style={{
        display: "flex",
        alignItems: "center",
        borderBlockEnd: "1px solid var(--color-border)",
        paddingBlock: "var(--space-2)",
        paddingInline: "var(--space-6)",
        gap: "var(--space-4)",
      }}
    >
      <span
        style={{
          flexShrink: 0,
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xs)",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--color-text-tertiary)",
        }}
      >
        {label}
      </span>

      {/* All entries stay mounted, stacked, opacity-toggled — a standard
          crossfade needs the outgoing and incoming layers overlapping
          during the transition, not a hard swap (which would show an
          empty gap for a frame). */}
      <div style={{ position: "relative", flex: 1, minHeight: "1.5em" }}>
        {PARTNERS.map((partner, index) => (
          <a
            key={partner.href}
            href={partner.href}
            target="_blank"
            rel="noopener noreferrer"
            dir={locale === "ar" ? "rtl" : "ltr"}
            style={{
              position: "absolute",
              insetInlineStart: 0,
              insetBlockStart: 0,
              insetInlineEnd: 0,
              display: "flex",
              alignItems: "baseline",
              gap: "var(--space-2)",
              textDecoration: "none",
              color: "var(--color-text)",
              opacity: index === current ? 1 : 0,
              transition: `opacity ${FADE_MS}ms ease`,
              pointerEvents: index === current ? "auto" : "none",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 700,
                fontSize: "var(--text-sm)",
              }}
            >
              {partner.name}
            </span>
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-xs)",
                color: "var(--color-text-secondary)",
              }}
            >
              {partner.tagline[locale]}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
