import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------------------

/** Pages that are accessible without a session. */
const PUBLIC_PAGES = ["/login", "/register"];

/**
 * API routes that are accessible without a session.
 * - /api/login            – employee/manager login
 * - /api/register         – employee self-registration
 * - /api/logout           – harmless without a session (just clears cookies)
 * - /api/superadmin/login – superadmin login (no session yet)
 */
const PUBLIC_API_PREFIXES = [
  "/api/login",
  "/api/register",
  "/api/logout",
  "/api/superadmin/login",
];

/**
 * GET /api/stores is used by the login page to populate the store dropdown.
 * PATCH/POST on that same path require auth, which the route handler enforces.
 */
function isPublicApiRequest(pathname: string, method: string): boolean {
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (pathname === "/api/stores" && method === "GET") return true;
  return false;
}

// ---------------------------------------------------------------------------
// Role → allowed path prefixes & default dashboard
// ---------------------------------------------------------------------------

const ROLE_ALLOWED_PREFIXES: Record<string, string[]> = {
  EMPLOYEE: ["/employee"],
  MANAGER: ["/manager"],
  SUPERADMIN: ["/superadmin", "/manager"], // if you set role=SUPERADMIN cookie on admin login
};

function dashboardForRole(role: string): string {
  if (role === "MANAGER") return "/manager/dashboard";
  if (role === "SUPERADMIN") return "/superadmin/dashboard";
  return "/employee/dashboard";
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  const session = req.cookies.get("session")?.value;
  const role = req.cookies.get("role")?.value;

  const isLoggedIn = session === "logged_in";

  // ── API routes ────────────────────────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    // Allow whitelisted public API calls through unconditionally.
    if (isPublicApiRequest(pathname, method)) return NextResponse.next();

    // Every other API route requires a session.
    if (!isLoggedIn) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    // Let the individual route handler deal with role checks.
    return NextResponse.next();
  }

  // ── Public pages (login / register) ──────────────────────────────────────
  if (PUBLIC_PAGES.some((p) => pathname.startsWith(p))) {
    // Already logged-in users get bounced to their dashboard.
    if (isLoggedIn && role) {
      return NextResponse.redirect(new URL(dashboardForRole(role), req.url));
    }
    return NextResponse.next();
  }

  // ── All other pages require a session ────────────────────────────────────
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ── Role-based page access ────────────────────────────────────────────────
  if (role) {
    const allowed = ROLE_ALLOWED_PREFIXES[role] ?? [];
    const hasAccess = allowed.some((p) => pathname.startsWith(p));
    if (!hasAccess) {
      return NextResponse.redirect(new URL(dashboardForRole(role), req.url));
    }
  }

  return NextResponse.next();
}

// ---------------------------------------------------------------------------
// Matcher – run on everything except Next.js internals and static assets
// ---------------------------------------------------------------------------

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};