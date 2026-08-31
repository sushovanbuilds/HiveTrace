import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "@/lib/auth/session";
import { roleHasCapability, type Capability } from "@/lib/auth/roles";

/**
 * Page-level session enforcement.
 *
 * `proxy.ts` already redirects unauthenticated requests away from the protected
 * paths, but the Next.js proxy documentation is explicit that it "should not be
 * used as a full session management or authorization solution" — it runs on an
 * optimistic cookie check. This is the authoritative gate: a page that renders
 * organisation data verifies the signed session itself, so a bypassed or
 * misconfigured proxy cannot expose the data.
 *
 * Returns the user, or performs a redirect (which throws, so control never
 * returns to the caller).
 */
export async function requirePage(
  capability?: Capability,
  currentPath?: string,
): Promise<SessionUser> {
  const user = await getSession();

  if (!user) {
    const next = currentPath ? `?next=${encodeURIComponent(currentPath)}` : "";
    redirect(`/login${next}`);
  }

  if (capability && !roleHasCapability(user.role, capability)) {
    // A distinct destination from the login redirect: signing in again will not
    // help, and bouncing the user to a login form they are already past reads
    // as a broken app.
    redirect(`/?denied=${encodeURIComponent(capability)}`);
  }

  return user;
}

/** Session if there is one, without redirecting. For pages that render either way. */
export async function optionalPageSession(): Promise<SessionUser | null> {
  return getSession();
}
