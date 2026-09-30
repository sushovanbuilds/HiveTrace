# HiveTrace

Honey traceability for the Indian supply chain: role-based workspaces for the people who move honey, a consumer QR flow for the people who buy it, and an operations system (**HIVEOS**) that watches hives before problems reach the jar.

Built with Next.js 16 (App Router, Turbopack), React 19, Tailwind 4, Prisma 7 and PostgreSQL.

---

## Two claims, kept apart

Most traceability demos blur two very different promises. This project names them separately and only makes the one it can actually keep.

| Claim | What backs it | Status |
| --- | --- | --- |
| **The honey is what the label says it is.** | Independent laboratory testing: purity, composition, floral markers, contaminants. A certificate attaches to the batch it tested, nothing else. | Real, when a lab reports |
| **The record has not been rewritten.** | Every event is written once and sealed with tamper-evident anchoring. Anyone can detect after-the-fact edits. | Real |
| **A blockchain proves the honey is pure.** | Nothing. It does not. | Not claimed |

A sealed record proves the story *hasn't changed*. It cannot prove the honey is genuine — only the lab can do that. `BLOCKCHAIN_CHAIN` defaults to `SIMULATED`, and the UI labels it as such rather than dressing up a hash as a ledger write.

---

## Quick start

### Demo mode (no database)

The full presentation flow runs on a deterministic in-memory dataset. Clone, install, run:

```bash
npm install
```

Set `HIVETRACE_DEMO_LOGIN="true"` in `.env` (it is unset in `.env.example`), then:

```bash
npm run dev
```

Open http://localhost:3000 and press **Enable camera** on `/scan`, or go straight to `/login` and pick a demo account.

| Account | Role | Lands on |
| --- | --- | --- |
| `ravi@greenvalley.in` | Honey Keeper | `/keeper` |
| `dr.anand@nbb.gov.in` | Analyst / Laboratory | `/analyst` |
| `suresh@amrit.in` | Processor | `/processor` |
| `meera@honeyline.in` | Distributor | `/distributor` |

Shared demo password: `hivetrace-demo`

Try the consumer flow with the demo batches `HC-2026-00124` and `HC-2026-00281` at `/verify`.

### Full stack (with PostgreSQL)

```bash
copy .env.example .env      # macOS/Linux: cp .env.example .env
docker compose up -d        # Postgres 16 on :5432
npm run db:push             # create schema
npm run db:seed             # load synthetic data
npm run dev
```

The Compose credentials already match `DATABASE_URL` in `.env.example`. **Both are development credentials** — rotate `AUTH_SECRET` and `QR_SECRET` before deploying anywhere real, and set `DATABASE_URL` for the target instance.

---

## Scanning on a phone

`/scan` decodes QR codes entirely in the browser (`jsQR` over a `getUserMedia` video feed, no round trip to a server). It works at `localhost` out of the box.

On a LAN IP it will not, and the reason is worth understanding rather than fighting:

> `getUserMedia` only exists in a **secure context**. `http://192.168.0.112:3000` is not secure, so `navigator.mediaDevices` is `undefined` — not a missing camera, a missing origin. Mobile browsers block it silently.

The page reports each failure mode distinctly: insecure origin, permission denied, and no camera found. Manual batch-code entry is always available as a fallback.

To get a working camera on a phone, any one of these:

1. **Chrome on Android, no installs** — visit `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, add `http://<your-lan-ip>:3000`, relaunch. iOS Safari has no equivalent.
2. **A tunnel (works everywhere)** — `cloudflared tunnel --url http://localhost:3000`, then scan the `https://*.trycloudflare.com` URL. Real certificate, so the phone trusts it.
3. **Deploy it.** Any HTTPS deployment works.

`allowedDevOrigins` in `next.config.ts` is set for LAN subnets so HMR chunks load on a phone. It is development-only and does not affect production.

---

## What is in the box

### Consumer-facing

- `/` — landing page: animated headings, WebGL honeycomb hero, live QR preview, trust pillars
- `/scan` — camera scanner with manual fallback
- `/verify/[code]` — the verification certificate consumers actually see
- `/hiveos` — the producer-facing entry point, and `/hiveos/login`

### Role workspaces

Beekeeper, collector, lab/analyst, processor, distributor, investigator and admin, each with its own landing route (`/keeper`, `/analyst`, `/processor`, `/distributor`, `/risk-center`, …).

Access is enforced from one reviewable table rather than scattered through handlers — `src/lib/auth/roles.ts` maps each capability to the roles that hold it. Publishing lab evidence and recording a human resolution are each restricted to a single role, because those actions carry consequences a beekeeper should not be able to fake.

### Domain

- **Traceability** — batches, harvest, lineage, custody transfer, QR issuance
- **Quality** — laboratory tests attached to the batch they tested
- **Risk & incidents** — risk scoring, anomaly clustering, signal extraction, investigation cases with audited resolution
- **HIVEOS** — hive health classification, digital twin, AI advisor, attention ranking, what-if intervention simulation

### AI layer

Optional, and the platform works without it. `LLM_PROVIDER` selects `ollama` (self-hosted, current default for the advisor), `openai`, or `gemini`. See `.env.example` for the full block.

### API

28 route handlers under `src/app/api`, each thin over a service in `src/lib/services`. Access control, error shaping and rate limiting are centralised in `src/lib/api/`.

---

## Project layout

```
src/
  app/                  routes (public + role workspaces) and API handlers
  components/           UI, incl. hiveos/ and trace/ feature modules
  lib/
    auth/               sessions, password hashing, capabilities, scoping
    services/           batch, risk, verify, QR and anchor logic
    hiveos/             health engine, advisor, attention ranking
    incidents/          clustering, risk, signals
    demo/               deterministic no-database dataset
    api/                handler wrapper, errors, rate limiting
  generated/            Prisma client (generated, not committed)
prisma/                 schema and seed
tests/unit/             Vitest suites
```

24 Prisma models cover the full chain: `Organisation`, `Farm`, `Hive`, `Harvest`, `Batch`, `BatchEvent`, `BatchLineage`, `CustodyTransfer`, `QualityTest`, `RiskScore`, `Alert`, `Incident`, `InvestigationCase`, `BlockchainAnchor`, `QRToken`, `QRScan`, `AuditLog`, and more.

---

## Commands

```bash
npm run dev        # dev server (Turbopack)
npm run build      # production build
npm run start      # serve the build
npm run lint       # ESLint
npm test           # Vitest — 187 tests across 16 files
npm run db:push    # apply schema
npm run db:seed    # load synthetic data
npm run db:studio  # Prisma Studio
```

`npm run build` does **not** require `DATABASE_URL` — secrets are read lazily so Next can inspect route configuration at build time. Live database operations fail with a clear message until it is configured.

Requires Node 20+ (developed on 24).

---

## Security notes

- `AUTH_SECRET` and `QR_SECRET` must differ. The app throws at first use if they match, so a leaked QR key cannot forge a session.
- Generate secrets with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
  ```
- Scanned QR values are reduced to a `/verify/:code` path with query string. A label can never navigate a consumer to an arbitrary external domain.
- `HIVETRACE_DEMO_LOGIN` bypasses the database for sign-in. It is commented out in `.env.example` for that reason — demo mode needs it set locally, production must not have it.
- `.env` is git-ignored; `.env.example` documents every variable.

---

## License

Apache License 2.0 — see [LICENSE](LICENSE).