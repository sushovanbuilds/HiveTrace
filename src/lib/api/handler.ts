import { z } from "zod";
import { errorResponse } from "@/lib/api/errors";
import { clientKey, rateLimit } from "@/lib/api/rateLimit";

/**
 * Request-side plumbing shared by every route handler: JSON parsing, schema
 * validation, pagination and a single place where unexpected failures are
 * converted into the API error envelope.
 *
 * The pattern throughout is an early-return discriminated union rather than
 * exceptions, matching `Guard` in `@/lib/auth/guard`:
 *
 *   const parsed = await readJson(request, Schema);
 *   if (parsed.error) return parsed.error;
 *   parsed.data // typed
 */

export type Parsed<T> = { error: Response; data?: undefined } | { error: null; data: T };

/** Parses and validates a JSON body. */
export async function readJson<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<Parsed<z.infer<S>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { error: errorResponse(400, "INVALID_JSON", "Request body must be valid JSON") };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      error: errorResponse(
        400,
        "VALIDATION_ERROR",
        "Request body failed validation",
        // Field paths and messages only. Echoing the received value back would
        // reflect whatever the client sent into the response.
        result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      ),
    };
  }
  return { error: null, data: result.data };
}

/** Validates query-string parameters against a schema. */
export function readQuery<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
): Parsed<z.infer<S>> {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const result = schema.safeParse(params);
  if (!result.success) {
    return {
      error: errorResponse(
        400,
        "VALIDATION_ERROR",
        "Query parameters failed validation",
        result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      ),
    };
  }
  return { error: null, data: result.data };
}

/**
 * Shared pagination fields. `coerce` because query values arrive as strings;
 * the ceiling on pageSize is what stops `?pageSize=1000000` from being a
 * one-request denial of service.
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export function pageArgs(pagination: { page: number; pageSize: number }) {
  return { skip: (pagination.page - 1) * pagination.pageSize, take: pagination.pageSize };
}

/**
 * A value that survives a round trip through a JSONB column.
 *
 * `z.unknown()` would type-check at the zod layer and then be rejected by
 * Prisma's `InputJsonValue`, and it would also admit values JSON cannot carry:
 * `NaN` and `Infinity` serialise to `null`, so a numeric field could silently
 * become empty between the request and the stored row — which for the event
 * table means the Merkle hash covers different data than the client sent.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

export const JsonObjectSchema = z.record(z.string(), JsonValueSchema);

/** Applies a fixed-window limit keyed by scope and client. */
export function limit(
  request: Request,
  scope: string,
  max: number,
  windowMs = 60_000,
): Response | null {
  const result = rateLimit(`${scope}:${clientKey(request)}`, max, windowMs);
  if (result.ok) return null;
  return errorResponse(429, "RATE_LIMITED", "Too many requests", {
    retryAfter: result.retryAfter,
  });
}

/**
 * Wraps a handler so an unexpected throw — most often a dropped database
 * connection — becomes a 503/500 in the standard envelope instead of a
 * framework HTML error page that client `response.json()` calls choke on.
 *
 * The message is deliberately generic: a Prisma error string can carry the
 * connection URL, table names and column values.
 */
export function route<A extends unknown[]>(
  handler: (...args: A) => Promise<Response>,
): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch (error) {
      const kind = classify(error);
      console.error(`[api] unhandled ${kind}:`, error);

      if (kind === "database-unavailable") {
        return errorResponse(
          503,
          "DATABASE_UNAVAILABLE",
          "The database is not reachable. Start it with `docker compose up -d` and retry.",
        );
      }
      if (kind === "unique-violation") {
        return errorResponse(409, "CONFLICT", "That record already exists");
      }
      if (kind === "foreign-key-violation") {
        return errorResponse(400, "INVALID_REFERENCE", "A referenced record does not exist");
      }
      return errorResponse(500, "INTERNAL_ERROR", "Unexpected server error");
    }
  };
}

type Kind =
  | "database-unavailable"
  | "unique-violation"
  | "foreign-key-violation"
  | "not-found"
  | "unknown";

/** Prisma error codes: P1001/P1002 connectivity, P2002 unique, P2003 FK, P2025 missing. */
export function classify(error: unknown): Kind {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === "string") {
    if (code === "P1001" || code === "P1002" || code === "P1017") return "database-unavailable";
    if (code === "P2002") return "unique-violation";
    if (code === "P2003") return "foreign-key-violation";
    if (code === "P2025") return "not-found";
    // Node socket errors surface before Prisma can classify them.
    if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ETIMEDOUT") {
      return "database-unavailable";
    }
  }
  if (error instanceof Error && /Can't reach database server/i.test(error.message)) {
    return "database-unavailable";
  }
  return "unknown";
}

/** True when a write failed because it collided with a unique index. */
export function isUniqueViolation(error: unknown): boolean {
  return classify(error) === "unique-violation";
}
