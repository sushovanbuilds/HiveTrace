import { NextRequest } from "next/server";
import { rateLimit, clientKey } from "@/lib/api/rateLimit";
import { endSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const rl = rateLimit(`logout:${clientKey(request)}`, 30, 60_000);
  if (!rl.ok) {
    return Response.json(
      { data: null, error: { code: "RATE_LIMITED", message: "Too many requests" } },
      { status: 429 },
    );
  }

  await endSession();
  return Response.json({ data: true });
}