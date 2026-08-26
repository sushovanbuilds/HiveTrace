import { db } from "@/lib/db";
import { errorResponse } from "@/lib/api/errors";
import { rateLimit, clientKey } from "@/lib/api/rateLimit";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ETH_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

const honeypotQuerySchema = z.object({
  network: z.string().trim().min(1).optional(),
});

const createHoneypotSchema = z.object({
  address: z
    .string()
    .regex(ETH_ADDRESS, "Must be a 0x-prefixed 40-hex Ethereum address"),
  type: z.string().trim().min(1),
  network: z.string().trim().min(1),
  status: z.enum(["ACTIVE", "COMPROMISED", "RETIRED"]).default("ACTIVE"),
});

export async function GET(request: Request) {
  const parsed = honeypotQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "Invalid query parameters",
      parsed.error.flatten(),
    );
  }

  const honeypots = await db.honeypot.findMany({
    where: parsed.data.network ? { network: parsed.data.network } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return Response.json(honeypots);
}

export async function POST(request: Request) {
  const rl = rateLimit(clientKey(request), 20, 60_000);
  if (!rl.ok) {
    return errorResponse(429, "RATE_LIMITED", "Too many requests", {
      retryAfter: rl.retryAfter,
    });
  }

  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    return errorResponse(
      401,
      "AUTH_NOT_CONFIGURED",
      "Server admin key is not configured",
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${expected}`) {
    return errorResponse(
      401,
      "UNAUTHORIZED",
      "Invalid or missing admin credentials",
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return errorResponse(400, "INVALID_JSON", "Body must be valid JSON");
  }

  const parsed = createHoneypotSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "Request validation failed",
      parsed.error.flatten(),
    );
  }

  try {
    const honeypot = await db.honeypot.create({ data: parsed.data });
    return Response.json(honeypot, { status: 201 });
  } catch (err) {
    if (
      err instanceof Error &&
      /Unique constraint/i.test(err.message)
    ) {
      return errorResponse(
        409,
        "DUPLICATE_ADDRESS",
        "A honeypot with that address already exists",
      );
    }
    throw err;
  }
}
