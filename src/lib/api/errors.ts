import { randomUUID } from "node:crypto";

// Standard API error shape (agent-doc-system/docs/06-api-design.md).
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
  };
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  const body: ApiErrorBody = {
    error: { code, message, details, requestId: randomUUID() },
  };
  return Response.json(body, { status });
}
