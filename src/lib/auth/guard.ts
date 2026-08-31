import { errorResponse } from "@/lib/api/errors";
import { getSession, type SessionUser } from "@/lib/auth/session";
import { roleHasCapability, type Capability } from "@/lib/auth/roles";

/**
 * Guard result. Handlers must check `denied` first:
 *
 *   const auth = await requireCapability("batch:write");
 *   if (auth.denied) return auth.denied;
 *   // auth.user is a SessionUser here
 *
 * Returning a Response rather than throwing keeps the error envelope
 * consistent with the rest of the API and avoids relying on framework-level
 * exception mapping.
 */
export type Guard =
  | { denied: Response; user?: undefined }
  | { denied: null; user: SessionUser };

export async function requireAuth(): Promise<Guard> {
  const user = await getSession();
  if (!user) {
    return {
      denied: errorResponse(401, "UNAUTHENTICATED", "Sign in to access this resource"),
    };
  }
  return { denied: null, user };
}

export async function requireCapability(capability: Capability): Promise<Guard> {
  const auth = await requireAuth();
  if (auth.denied) return auth;

  if (!roleHasCapability(auth.user.role, capability)) {
    return {
      denied: errorResponse(
        403,
        "FORBIDDEN",
        `Role ${auth.user.role} is not permitted to perform ${capability}`,
      ),
    };
  }
  return auth;
}
