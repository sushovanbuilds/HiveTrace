# API Design

## API Style
REST over Next.js Route Handlers (`src/app/api/**`). Inputs validated at the boundary with Zod (added as a direct dependency in P2.02 — previously only transitive via Hardhat toolbox).

## Conventions
- Validate all inputs at the boundary (Zod schemas in each route).
- Consistent error shape (see `src/lib/api/errors.ts`): `{ "error": { "code", "message", "details?", "requestId" } }`, `requestId` via `crypto.randomUUID()`.
- Authentication enforced server-side: privileged writes require `authorization: Bearer <ADMIN_API_KEY>`; if `ADMIN_API_KEY` env is unset, writes are rejected (fail-closed, 401 `AUTH_NOT_CONFIGURED`).
- Routes are `runtime = "nodejs"`, `dynamic = "force-dynamic"` (all access the DB).

## Endpoints
| Method | Path | Purpose | Auth | Request | Response |
|---|---|---|---|---|---|
| GET | `/api/honeypots?network=<string>` | List honeypots, optionally filtered by network | None | — | `Honeypot[]` |
| POST | `/api/honeypots` | Create a honeypot record | Admin (`ADMIN_API_KEY`) | `{ address, type, network, status? }` | `Honeypot` (201) |
| GET | `/api/reports?limit=10&severity=<LOW\|MEDIUM\|HIGH\|CRITICAL>` | List threat reports (newest first, capped) | None | — | `ThreatReport[]` |

### Notes / deviations from IMPLEMENTATION_PLAN §12
- POST body includes `address` (required). Plan §12 listed only `{type, network}`, but the `Honeypot` model requires a unique `address`; the real creation flow (P4.02/P6.01) produces the on-chain address after deployment, so it must be supplied here.
- `GET /api/reports` accepts an optional `severity` filter in addition to `limit` (limit coerced to int, 1–100).

### Error codes
- `VALIDATION_ERROR` (400) — query/body failed Zod validation (`details` = flattened issues).
- `INVALID_JSON` (400) — malformed request body.
- `AUTH_NOT_CONFIGURED` / `UNAUTHORIZED` (401) — admin write without configured key / wrong bearer.
- `DUPLICATE_ADDRESS` (409) — `address` already exists.
- `RATE_LIMITED` (429) — too many writes from a client (`details.retryAfter` seconds).

## Standard Error Shape
```json
{
  "error": {
    "code": "EXAMPLE_ERROR",
    "message": "Human-readable message",
    "requestId": "..."
  }
}
```

## Rate Limiting
In-memory fixed-window limiter (`src/lib/api/rateLimit.ts`): 20 writes / 60s per client key (POST `/api/honeypots` only). Single-process placeholder — not shared across instances; replace with a distributed store before multi-instance deployment.

## Versioning
None yet (pre-MVP internal API). Add `/v1` prefix before any external consumer.
