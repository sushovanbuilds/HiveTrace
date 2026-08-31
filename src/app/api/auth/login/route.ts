import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/api/errors";
import { rateLimit, clientKey } from "@/lib/api/rateLimit";
import { verifyPassword } from "@/lib/auth/password";
import { startSession } from "@/lib/auth/session";
import { isUserRole } from "@/lib/auth/roles";

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(512),
});

// A valid scrypt digest of a random string, used to spend the same CPU on an
// unknown email as on a real one. Without it, response latency reveals which
// addresses are registered.
const DUMMY_DIGEST =
  "scrypt$32768$8$1$Y2FsaWJyYXRpb25zYWx0$aGl2ZXRyYWNlLWR1bW15LWRpZ2VzdC1ub3QtYS1rZXk";

// Hardcoded demo accounts — one per supply-chain node — guaranteed to sign in
// even when the local database is empty or unreachable. Each mirrors a seeded
// user (same id/email/org) so "login as the beekeeper / lab / processor"
// produces a genuinely different experience without a DB. Demo/hackathon only
// — remove before any real deployment; when the DB is available these same
// accounts are also validated normally through the seed.
const DEMO_PASSWORD = "hivetrace-demo";
const DEMO_ACCOUNTS = [
  { id: "usr_1", email: "ravi@greenvalley.in", name: "Ravi Kumar", role: "BEEKEEPER", organisationId: "org_1" },
  { id: "usr_8", email: "arjun@sahyadri.in", name: "Arjun Nair", role: "COLLECTOR", organisationId: "org_6" },
  { id: "usr_3", email: "dr.anand@nbb.gov.in", name: "Dr. Anand Mehta", role: "LAB", organisationId: "org_3" },
  { id: "usr_4", email: "suresh@amrit.in", name: "Suresh Patel", role: "PROCESSOR", organisationId: "org_4" },
  { id: "usr_5", email: "meera@honeyline.in", name: "Meera Reddy", role: "DISTRIBUTOR", organisationId: "org_5" },
  { id: "usr_7", email: "kavita@fssai.gov.in", name: "Kavita Iyer", role: "INVESTIGATOR", organisationId: "org_7" },
  { id: "usr_6", email: "admin@hivetrace.gov.in", name: "Admin User", role: "ADMIN", organisationId: "org_7" },
] as const;

export async function POST(request: NextRequest) {
  // Deliberately tighter than the read endpoints: each attempt costs ~100 ms of
  // scrypt, so this doubles as brute-force and CPU-exhaustion protection.
  const rl = rateLimit(`login:${clientKey(request)}`, 10, 300_000);
  if (!rl.ok) {
    return errorResponse(429, "RATE_LIMITED", "Too many sign-in attempts", {
      retryAfter: rl.retryAfter,
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON");
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, "VALIDATION_ERROR", "email and password are required", {
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const { email, password } = parsed.data;

  // Demo bypass: same credential set every hackathon judge can use, no DB
  // required. Falls through to the normal scrypt check when they don't match.
  const demoAccount = DEMO_ACCOUNTS.find(
    (a) => a.email === email && password === DEMO_PASSWORD,
  );
  if (demoAccount) {
    const sessionUser = {
      id: demoAccount.id,
      email: demoAccount.email,
      name: demoAccount.name,
      role: demoAccount.role,
      organisationId: demoAccount.organisationId,
    };
    await startSession(sessionUser);
    return Response.json({ data: sessionUser });
  }

  const user = await db.user.findUnique({ where: { email } });

  // Always run the KDF, then decide. One failure code for every cause so the
  // response cannot be used to enumerate accounts.
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_DIGEST);
  if (!user || !ok || !isUserRole(user.role)) {
    return errorResponse(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  }

  const sessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organisationId: user.organisationId,
  };

  await startSession(sessionUser);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return Response.json({ data: sessionUser });
}
