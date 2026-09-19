"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/i18n/locales";

// Facebook and WhatsApp both have a real "share this URL" web intent —
// clicking opens a share dialog pre-filled with the current page. Instagram
// has no such intent (nothing accepts a shared URL), so this icon instead
// opens Atlas Dépêche's own Instagram page — same "clicking takes you
// somewhere" behavior as the other two. Swap INSTAGRAM_URL below for the
// account's real profile URL once one exists.
const INSTAGRAM_URL = "https://www.instagram.com/";
//
// Each icon carries its own brand color (filled badge, not the neutral
// bordered-pill style the rest of the header uses) — requested explicitly,
// so a reader recognizes Facebook/WhatsApp/Instagram at a glance.
const iconWrapperStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  borderRadius: "8px",
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  lineHeight: 0,
};

const FACEBOOK_BLUE = "#1877F2";
const WHATSAPP_GREEN = "#25D366";

function FacebookIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill={FACEBOOK_BLUE} />
      <path
        d="M20.5 16.5h-3v9h-3.5v-9H12v-3h2v-2.1c0-2.4 1.15-3.9 4.05-3.9h2.45v3h-1.6c-1.15 0-1.4.45-1.4 1.35V13.5h3.15z"
        fill="#ffffff"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill={WHATSAPP_GREEN} />
      <path
        fill="#ffffff"
        d="M23.47 8.52A9.85 9.85 0 0 0 16.06 5.5c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.33 4.95L6.5 25.5l5.26-1.38a9.87 9.87 0 0 0 4.29.98h.01c5.46 0 9.9-4.44 9.9-9.9a9.85 9.85 0 0 0-2.5-6.68zm-7.41 15.2h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.55-3.7 8.24-8.25 8.24zm4.52-6.17c-.25-.12-1.46-.72-1.68-.8-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.24-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.65.31s-.86.84-.86 2.05.88 2.38 1 2.54c.12.16 1.73 2.64 4.18 3.7.58.25 1.04.4 1.39.52.59.19 1.12.16 1.54.1.47-.07 1.46-.6 1.66-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.28z"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="ig-share-gradient" x1="0" y1="32" x2="32" y2="0">
          <stop offset="0%" stopColor="#FEDA75" />
          <stop offset="30%" stopColor="#FA7E1E" />
          <stop offset="55%" stopColor="#D62976" />
          <stop offset="80%" stopColor="#962FBF" />
          <stop offset="100%" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#ig-share-gradient)" />
      <rect x="9" y="9" width="14" height="14" rx="4" fill="none" stroke="#ffffff" strokeWidth="1.8" />
      <circle cx="16" cy="16" r="3.6" fill="none" stroke="#ffffff" strokeWidth="1.8" />
      <circle cx="20.3" cy="11.7" r="1" fill="#ffffff" />
    </svg>
  );
}

export function ShareLinks({ locale }: { locale: Locale }) {
  // The current page URL is only knowable client-side (this is a shared
  // layout, not a page — no server-rendered pathname to build it from). A
  // ref written directly to the anchors' href in an effect — not React
  // state — avoids a hydration mismatch without a state/render round trip.
  const facebookRef = useRef<HTMLAnchorElement>(null);
  const whatsappRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const encoded = encodeURIComponent(window.location.href);
    if (facebookRef.current) {
      facebookRef.current.href = `https://www.facebook.com/sharer/sharer.php?u=${encoded}`;
    }
    if (whatsappRef.current) {
      whatsappRef.current.href = `https://wa.me/?text=${encoded}`;
    }
  }, []);

  const labels =
    locale === "ar"
      ? {
          facebook: "شارك عبر فيسبوك",
          whatsapp: "شارك عبر واتساب",
          instagram: "Instagram - Atlas Dépêche",
        }
      : {
          facebook: "Partager sur Facebook",
          whatsapp: "Partager sur WhatsApp",
          instagram: "Instagram - Atlas Dépêche",
        };

  return (
    <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
      <a
        ref={facebookRef}
        href="https://www.facebook.com/sharer/sharer.php"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={labels.facebook}
        title={labels.facebook}
        style={iconWrapperStyle}
      >
        <FacebookIcon />
      </a>
      <a
        ref={whatsappRef}
        href="https://wa.me/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={labels.whatsapp}
        title={labels.whatsapp}
        style={iconWrapperStyle}
      >
        <WhatsAppIcon />
      </a>
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={labels.instagram}
        title={labels.instagram}
        style={iconWrapperStyle}
      >
        <InstagramIcon />
      </a>
    </div>
  );
}
