import { getSession } from "@/lib/auth/session";
import { CAPABILITIES, type Capability } from "@/lib/auth/roles";

/**
 * Current session for the client shell. Returns 200 with `data: null` rather
 * than 401 — "not signed in" is an expected answer here, not an error.
 */
export async function GET() {
  const user = await getSession();
  if (!user) return Response.json({ data: null });

  const capabilities = (Object.keys(CAPABILITIES) as Capability[]).filter((c) =>
    (CAPABILITIES[c] as readonly string[]).includes(user.role),
  );

  return Response.json({ data: { user, capabilities } });
}
