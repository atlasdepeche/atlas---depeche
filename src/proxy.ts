import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "admin_session";
const ADMIN_LOGIN_PATH = "/admin/login";

/**
 * Proxy to protect /admin/* routes — checks for a valid session cookie.
 * Renamed from middleware.ts per Next.js 16 conventions.
 *
 * The actual session value is "authenticated" — there's no JWT or signing
 * in this minimal implementation. The httpOnly flag prevents client-side
 * tampering; the secure flag (in production) prevents transmission over
 * HTTP; and the login action itself verifies credentials against env vars.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the login page and its assets
  if (pathname === ADMIN_LOGIN_PATH || pathname.startsWith(ADMIN_LOGIN_PATH + "/")) {
    // If already authenticated and hitting login, redirect to events
    if (request.cookies.get(SESSION_COOKIE)?.value === "authenticated") {
      return NextResponse.redirect(new URL("/admin/events", request.url));
    }
    return NextResponse.next();
  }

  // Allow the login action (Server Action) to be called
  // Server Actions are POST requests to the same origin with Next-Action header
  if (
    request.method === "POST" &&
    request.headers.get("next-action")
  ) {
    return NextResponse.next();
  }

  // Check session cookie for all other /admin/* routes
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (session !== "authenticated") {
    const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
