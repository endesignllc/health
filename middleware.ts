import { NextResponse } from "next/server";
import { auth } from "@/auth";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

/**
 * Paths that bypass the site-wide Google sign-in gate entirely.
 * Anything not in this list requires an authenticated session.
 */
const PUBLIC_PATHS = new Set<string>([
  "/sign-in",
  "/access-denied",
]);

const PUBLIC_API_PREFIXES = [
  "/api/auth", // NextAuth.js endpoints (callback, providers, csrf, etc.)
  "/api/webhook/stripe", // Stripe webhooks must be unauthenticated
  "/api/cron", // Vercel cron uses bearer secret, not session auth
  "/api/ingest", // Pi/scraper ingest uses bearer secret
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allowlisted public paths
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Site-wide gate: require Google sign-in for everything else
  const isLoggedIn = !!req.auth;
  if (!isLoggedIn) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Existing /admin token check stacks on top of the Google sign-in gate.
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!ADMIN_TOKEN) {
      return NextResponse.redirect(new URL("/admin/login?error=config", req.url));
    }
    const token =
      req.cookies.get("admin_token")?.value ??
      req.nextUrl.searchParams.get("token");
    if (token !== ADMIN_TOKEN) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  // Match everything except Next.js internals and static asset extensions.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?)$).*)",
  ],
};
