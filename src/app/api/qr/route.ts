import { NextRequest } from "next/server";
import { z } from "zod";
import { route } from "@/lib/api/handler";
import { qrToSvg, QR_COLOR_PRESETS } from "@/lib/qr/svg";

const PreviewSchema = z.object({
  /** Text to encode in the QR code. */
  text: z.string().trim().min(1).max(2000).default("https://example.com/verify"),
  /** Color preset name. */
  preset: z.string().optional(),
  /** Custom dark module color (hex). */
  dark: z.string().optional(),
  /** Custom light background color (hex). */
  light: z.string().optional(),
  /** Module corner radius (0 = square, 0.4 = rounded). */
  moduleRadius: z.number().min(0).max(0.5).optional(),
  /** Logo data URI to embed. */
  logo: z.string().optional(),
  /** Rendered size in CSS pixels. */
  pixelSize: z.number().min(64).max(1024).optional(),
});

/** Returns available QR color presets and optionally renders a preview SVG. */
export const GET = route(async (_request: NextRequest) => {
  return Response.json({
    data: {
      presets: Object.entries(QR_COLOR_PRESETS).map(([key, value]) => ({
        id: key,
        label: value.label,
        dark: value.dark,
        light: value.light,
      })),
      options: {
        moduleRadius: "Number between 0 (square) and 0.5 (fully rounded)",
        logo: "Base64 data URI (data:image/png;base64,...) — forces ECC level H",
        pixelSize: "Rendered size in CSS pixels (64–1024, default 240)",
      },
    },
  });
});

/** Generates a preview QR SVG with the specified customization options. */
export const POST = route(async (request: NextRequest) => {
  const body = await request.json();
  const parsed = PreviewSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid preview options" } },
      { status: 400 },
    );
  }

  const svg = qrToSvg(parsed.data.text, {
    preset: parsed.data.preset,
    dark: parsed.data.dark,
    light: parsed.data.light,
    moduleRadius: parsed.data.moduleRadius,
    logo: parsed.data.logo,
    pixelSize: parsed.data.pixelSize,
    title: "QR preview",
  });

  return Response.json({
    data: {
      svg,
      dataUri: `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`,
      options: parsed.data,
    },
  });
});
