import { cookies } from "next/headers";
import { createSessionToken, verifySessionToken, type SessionClaims } from "@/lib/auth/jwt";
import { sessionTtlSeconds } from "@/lib/env";
import type { UserRole } from "@/lib/auth/roles";

export const SESSION_COOKIE = "hivetrace_session";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organisationId: string;
}

function toUser(claims: SessionClaims): SessionUser {
  return {
    id: claims.sub,
    email: claims.email,
    name: claims.name,
    role: claims.role,
    organisationId: claims.org,
  };
}

/** Reads the session from the request cookie. Returns null when absent/invalid. */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const claims = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  return claims ? toUser(claims) : null;
}

export async function startSession(user: SessionUser): Promise<void> {
  const ttl = sessionTtlSeconds();
  const token = createSessionToken(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      org: user.organisationId,
    },
    ttl,
  );

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Not readable from JavaScript, not sent cross-site, and HTTPS-only outside
    // local development.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ttl,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
