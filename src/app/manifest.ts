import type { MetadataRoute } from "next";

/**
 * Web App Manifest — explicitly requested: "antes de hacer la app, quiero
 * un shortcut para que la gente lo tenga en el móvil como una app". This
 * is exactly what a manifest + icons unlocks: "Add to Home Screen" on
 * Android/Chrome (and, more limited, iOS Safari — see apple-icon.tsx and
 * the appleWebApp metadata in the public layout) gives a real home-screen
 * icon that opens standalone (no browser address bar), no native app
 * build required.
 *
 * start_url is the bare root ("/"), which the (admin)/page.tsx redirect
 * already sends to /fr — matches what typing the domain does today, no
 * separate PWA-only entry point to maintain.
 *
 * Icons are generated on the fly (see manifest-icon/[size]/route.tsx) —
 * there's no logo image file in this project, so the same code-drawn mark
 * used there (the site's own accent-to-magenta gradient) is reused here
 * instead of inventing a static asset.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Atlas Dépêche",
    short_name: "Atlas Dépêche",
    description: "L'actualité du Maroc, agrégée en direct depuis plusieurs médias.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#1a3a5c",
    icons: [
      {
        src: "/manifest-icon/192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/manifest-icon/512",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
