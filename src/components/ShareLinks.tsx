"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/locales";

// Facebook and WhatsApp both have a real "share this URL" web intent.
// Instagram does not — there is no official web share-by-URL endpoint, so
// the icon copies the link instead (closest real equivalent: paste it into
// an Instagram DM or story). Not a limitation of this code — a limitation
// of what Instagram's web platform actually offers.
const iconWrapperStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  color: "var(--color-text-secondary)",
  border: "1px solid var(--color-border)",
  borderRadius: "4px",
  background: "none",
  cursor: "pointer",
  transition: "border-color var(--transition-fast), color var(--transition-fast)",
};

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="12" y="16.5" textAnchor="middle" fontSize="12" fontFamily="Georgia, serif" fontWeight="700" fill="currentColor">
        f
      </text>
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 3a2 2 0 0 0-2 2c0 8.284 6.716 15 15 15a2 2 0 0 0 2-2v-2.153a1 1 0 0 0-.804-.98l-3.516-.703a1 1 0 0 0-1.005.39l-1.08 1.44a12.06 12.06 0 0 1-5.59-5.59l1.44-1.08a1 1 0 0 0 .39-1.005l-.703-3.516A1 1 0 0 0 8.153 3H6z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.3" />
      <circle cx="17.3" cy="6.7" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ShareLinks({ locale }: { locale: Locale }) {
  const [copied, setCopied] = useState(false);
  // The current page URL is only knowable client-side (this is a shared
  // layout, not a page — no server-rendered pathname to build it from), and
  // setting it via state in a mount effect trips the "no setState in effect
  // body" lint rule. A ref written directly to the DOM in the effect (not
  // through React state) is the standard escape hatch for exactly this.
  const pageUrlRef = useRef("");
  const facebookRef = useRef<HTMLAnchorElement>(null);
  const whatsappRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const url = window.location.href;
    pageUrlRef.current = url;
    const encoded = encodeURIComponent(url);
    if (facebookRef.current) {
      facebookRef.current.href = `https://www.facebook.com/sharer/sharer.php?u=${encoded}`;
    }
    if (whatsappRef.current) {
      whatsappRef.current.href = `https://wa.me/?text=${encoded}`;
    }
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const labels =
    locale === "ar"
      ? {
          facebook: "شارك عبر فيسبوك",
          whatsapp: "شارك عبر واتساب",
          instagram: "انسخ الرابط لمشاركته عبر إنستغرام",
          copied: "تم نسخ الرابط",
        }
      : {
          facebook: "Partager sur Facebook",
          whatsapp: "Partager sur WhatsApp",
          instagram: "Copier le lien pour Instagram",
          copied: "Lien copié",
        };

  async function copyLink() {
    const url = pageUrlRef.current || window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard API unavailable (old browser, insecure context) — fail
      // quietly rather than break the page over a share convenience.
    }
  }

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
      <button
        type="button"
        onClick={copyLink}
        aria-label={copied ? labels.copied : labels.instagram}
        title={copied ? labels.copied : labels.instagram}
        style={iconWrapperStyle}
      >
        <InstagramIcon />
      </button>
    </div>
  );
}
