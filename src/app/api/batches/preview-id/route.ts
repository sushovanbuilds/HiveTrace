import { NextRequest } from "next/server";
import { route } from "@/lib/api/handler";
import { requireCapability } from "@/lib/auth/guard";
import { generatePublicCode } from "@/lib/services/qr";

export const GET = route(async (_request: NextRequest) => {
  const auth = await requireCapability("batch:read");
  if (auth.denied) return auth.denied;

  const previewCode = generatePublicCode();

  return Response.json({
    data: {
      publicCode: previewCode,
      format: "HC-YYYY-XXXXXX",
      description: "Auto-generated batch code. This code will be assigned upon batch creation.",
    },
  });
});
