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
| Honeypot | Deployed honeypot contract (address, type, network, status) | Contract address (public data) | Duration of project |
| Event | On-chain interaction captured for a honeypot | Raw tx data (public chain data) | Duration of project |
| ThreatReport | AI-generated analysis of an Event | None beyond attack analysis | Duration of project |

## Schema
Current (P2.01):

```prisma
model Config {
  id        String   @id @default(cuid())
  key       String   @unique
  value     Json
  updatedAt DateTime @updatedAt
}

// A deployed honeypot contract (P2.01, IMPLEMENTATION_PLAN.md §11).
model Honeypot {
  id        String   @id @default(cuid())
  address   String   @unique
  network   String // e.g. 'local', 'sepolia'
  type      String // e.g. 'ERC20', 'Reentrancy'
  status    String // 'ACTIVE', 'COMPROMISED', 'RETIRED'
  createdAt DateTime @default(now())
  events    Event[]

  @@index([network])
}

// An on-chain interaction captured for a honeypot (P2.01).
// txHash is globally unique: one canonical Event row per transaction.
model Event {
  id         String        @id @default(cuid())
  txHash     String        @unique
  honeypotId String
  honeypot   Honeypot      @relation(fields: [honeypotId], references: [id])
  rawData    Json
  createdAt  DateTime      @default(now())
  report     ThreatReport?

  @@index([createdAt])
}

// AI-generated analysis of an Event (P2.01); strictly 1:1 with Event.
model ThreatReport {
  id        String   @id @default(cuid())
  eventId   String   @unique
  event     Event    @relation(fields: [eventId], references: [id])
  summary   String
  severity  String // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  vector    String // e.g. 'Reentrancy', 'Flashloan'
  createdAt DateTime @default(now())

  @@index([severity])
}
```

Design notes:
- `type`/`network`/`status`/`severity` are plain strings with documented value domains; upgrade to Prisma enums if validation drift becomes a problem.
- `Event.txHash` is globally unique — a tx interacting with two honeypots yields one canonical Event (listener must pick the primary honeypot). Revisit if multi-honeypot txs matter.
- Default FK restrict applies: delete an Event's `ThreatReport`, then the `Event`, before deleting its `Honeypot`.

## Indexes and Constraints
- `Config.key` unique.
- `Honeypot.address` unique; `Event.txHash` unique; FKs `Event.honeypotId → Honeypot.id`, `ThreatReport.eventId → Event.id` (1:1).
- Secondary indexes: `Honeypot(network)`, `Event(createdAt)`, `ThreatReport(severity)` for dashboard/listener queries.

## Migration Strategy
- MVP uses `npx prisma db push` for rapid iteration until the first external deployment.
- Before TESTNET/PRODUCTION (plan §17): switch to `prisma migrate dev` / `migrate deploy` with versioned migrations in `prisma/migrations`.
- Destructive migrations require explicit approval (per project security model).

## Data Retention / Deletion
TBD — revisit when Honeypot/Event data starts accumulating. Deletion order constraint: `ThreatReport` → `Event` → `Honeypot` (FK restrict).
