"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/locales";

/**
 * "Goal alert"-style promo flash — explicitly requested after the static
 * "Nos partenaires" strip was rejected: same idea RexFoot/Marca use for a
 * goal notification (slides in, stays a few seconds, slides back out),
 * repurposed for a rotating sponsor logo instead of a permanent banner.
 * Advantage over the strip it replaces: doesn't occupy page space between
 * appearances, and reads as an EVENT (attention-grabbing) rather than
 * furniture a reader learns to ignore.
 *
 * Two numbers control the whole thing, both explicitly meant to be tuned:
 *   VISIBLE_SECONDS   — how long one flash stays on screen (the "how many
 *                        seconds the flash holds, like the goal" ask).
 *   INTERVAL_SECONDS  — how often a new one appears (the "how much time
 *                        passes in the day" ask) — this is a per-visitor
 *                        repeat while the tab stays open, not a fixed
 *                        wall-clock schedule; there's no server pushing
 *                        these, each browser just runs its own timer.
 *
 * ADS is a plain array (currently the user's own 2 properties) — a future
 * real sponsor is just a third entry with its own logo/colors, same
 * mechanism, no rebuild needed. Once real money is involved this deserves
 * a proper admin-managed list (and probably impression/click tracking),
 * not before.
 */

const VISIBLE_SECONDS = 6;
const INTERVAL_SECONDS = 240;
const SLIDE_MS = 400;

interface AdEntry {
  name: string;
  href: string;
  tagline: Record<Locale, string>;
  gradient: string;
}

const ADS: AdEntry[] = [
  {
    name: "Souss Actualités",
    href: "https://souss-actualites.com",
    tagline: {
      fr: "L'actualité du Souss-Massa",
      ar: "أخبار جهة سوس ماسة",
    },
    gradient: "linear-gradient(135deg, #1a3a5c, #2e7d32)",
  },
  {
    name: "RexFoot",
    href: "https://rexfoot.com",
    tagline: {
      fr: "Toute l'actualité du football",
      ar: "كل أخبار كرة القدم",
    },
    gradient: "linear-gradient(135deg, #1a3a5c, #D62976)",
  },
];

export function AdFlash({ locale }: { locale: Locale }) {
  const [adIndex, setAdIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  // Separate from `visible` so the slide-out transition can finish playing
  // before the element unmounts — toggling `visible` off starts the CSS
  // transition; `mounted` keeps the node around for that transition's
  // duration instead of yanking it away mid-slide.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout>;
    let unmountTimer: ReturnType<typeof setTimeout>;

    const showTimer = setInterval(() => {
      // Clear any still-pending timers from the previous cycle first — if
      // INTERVAL_SECONDS were ever shorter than VISIBLE_SECONDS, a stale
      // hideTimer from the last cycle would otherwise fire mid-cycle and
      // hide/unmount the new flash before it ever painted.
      clearTimeout(hideTimer);
      clearTimeout(unmountTimer);

      setAdIndex((i) => (i + 1) % ADS.length);
      setMounted(true);
      // Two rAFs so the "slid out" starting position actually paints
      // before the class/style flips to "slid in" — otherwise the browser
      // can coalesce both states into one frame and skip the animation.
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));

      hideTimer = setTimeout(() => {
        setVisible(false);
        unmountTimer = setTimeout(() => setMounted(false), SLIDE_MS);
      }, VISIBLE_SECONDS * 1000);
    }, INTERVAL_SECONDS * 1000);

    return () => {
      clearInterval(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (!mounted) return null;

  const ad = ADS[adIndex] ?? ADS[0];
  if (!ad) return null;
  const label = locale === "ar" ? "إعلان" : "Publicité";

  return (
    <a
      href={ad.href}
      target="_blank"
      rel="noopener noreferrer"
      dir={locale === "ar" ? "rtl" : "ltr"}
      style={{
        position: "fixed",
        insetBlockEnd: "var(--space-6)",
        insetInlineEnd: "var(--space-6)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-1)",
        minInlineSize: "16rem",
        maxInlineSize: "20rem",
        padding: "var(--space-4)",
        borderRadius: "10px",
        background: ad.gradient,
        boxShadow: "var(--shadow-lg)",
        textDecoration: "none",
        transform: visible ? "translateY(0)" : "translateY(calc(100% + var(--space-6)))",
        opacity: visible ? 1 : 0,
        transition: `transform ${SLIDE_MS}ms ease, opacity ${SLIDE_MS}ms ease`,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xs)",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "rgba(255, 255, 255, 0.75)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 700,
          fontSize: "var(--text-xl)",
          color: "#ffffff",
        }}
      >
        {ad.name}
      </span>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          color: "rgba(255, 255, 255, 0.9)",
        }}
      >
        {ad.tagline[locale]}
      </span>
    </a>
  );
}
