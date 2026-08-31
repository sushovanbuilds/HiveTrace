import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth/jwt";
import { isProtectedPath } from "@/lib/auth/roles";
import { SESSION_COOKIE } from "@/lib/auth/session";

// Optimistic auth check only (Next 16 renamed `middleware` to `proxy`).
//
// Per the Next.js docs, proxy "should not be used as a full session management
// or authorization solution" — it exists here to turn an unauthenticated page
// request into a clean redirect instead of a flash of empty UI. Authoritative
// enforcement lives in requireAuth/requireCapability inside route handlers and
// in getSession() inside server components; role checks are deliberately NOT
// duplicated here.
//
// Proxy defaults to the Node.js runtime in v16, so node:crypto is available and
// the signature can be verified rather than merely checking cookie presence.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname)) return NextResponse.next();

  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);

  const response = NextResponse.redirect(loginUrl);
  // Clear an expired or tampered cookie so the browser stops resending it.
  if (request.cookies.has(SESSION_COOKIE)) {
    response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  }
  return response;
}

export const config = {
  // Exclude API routes (they return 401/403 JSON via their own guards rather
  // than redirecting), Next internals, and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
