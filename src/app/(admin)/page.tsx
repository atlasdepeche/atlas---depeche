import { redirect } from "next/navigation";

/**
 * Was an "Internal dev index" placeholder linking to /admin/* and /fr//ar —
 * harmless while nothing was deployed, but once the site got a real public
 * domain (2026-09-18) a real visitor hitting the bare root landed on a
 * raw links page instead of the news site. Redirect to the primary public
 * locale instead; the dev links it used to show are still reachable
 * directly (/admin/events, /admin/articles, /admin/analytics) for anyone
 * who needs them.
 */
export default function RootRedirect() {
  redirect("/fr");
}
