# Database Design

## Database Choice
PostgreSQL 17 + Prisma ORM 7 (`prisma-client` generator, driver-adapter mode with `@prisma/adapter-pg`). Chosen per IMPLEMENTATION_PLAN.md §6; see DEC-003 in `30-decisions.md`.

### Local development database
Rootless podman container (no Docker daemon required on this machine):

```bash
podman run -d --name honychain-db \
  -e POSTGRES_USER=honychain \
  -e POSTGRES_PASSWORD=honychain_dev \
  -e POSTGRES_DB=honychain \
  -p 127.0.0.1:5432:5432 \
  docker.io/library/postgres:17-alpine
```

Bound to `127.0.0.1` only; credentials are throwaway local-dev values (never used outside the container). `DATABASE_URL` lives in `.env` (gitignored); template in `.env.example`.

### Client access rules
- Import the singleton from `src/lib/db.ts` (`import { db } from "@/lib/db"`). Never construct `PrismaClient` elsewhere.
- The generated client lives in `src/generated/` (gitignored); it is produced by `prisma generate`, which runs automatically on `npm install` (postinstall).

## Entities
| Entity | Purpose | Sensitive data | Retention |
|---|---|---|---|
| Config | Generic key/value store; proves DB connectivity (P0.02) | None | Dev-only; safe to truncate |
| Honeypot | Deployed honeypot contract (address, type, network, status) — planned P2.01 | Contract address (public data) | Duration of project |
| Event | On-chain interaction captured for a honeypot — planned P2.01 | Raw tx data (public chain data) | Duration of project |
| ThreatReport | AI-generated analysis of an Event — planned P2.01 | None beyond attack analysis | Duration of project |

## Schema
Current (P0.02):

```prisma
model Config {
  id        String   @id @default(cuid())
  key       String   @unique
  value     Json
  updatedAt DateTime @updatedAt
}
```

Target domain schema is defined in IMPLEMENTATION_PLAN.md §11 and lands in P2.01.

## Indexes and Constraints
- `Config.key` unique.
- Planned P2.01: `Honeypot.address` unique; `Event.txHash` unique; FKs `Event.honeypotId → Honeypot.id`, `ThreatReport.eventId → Event.id` (1:1).

## Migration Strategy
- MVP uses `npx prisma db push` for rapid iteration until the first external deployment.
- Before TESTNET/PRODUCTION (plan §17): switch to `prisma migrate dev` / `migrate deploy` with versioned migrations in `prisma/migrations`.
- Destructive migrations require explicit approval (per project security model).

## Data Retention / Deletion
TBD — revisit when Honeypot/Event data starts accumulating (P2.01).
