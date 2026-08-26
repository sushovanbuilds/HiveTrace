# Change Log

Track meaningful project-level changes, not every edit.

### 2026-08-26 — P3.01: AI provider abstraction
- **What changed:** Added `src/lib/ai/provider.ts` with `createChatModel()` (LangChain chat model; OpenAI `gpt-4o` default per D1, Gemini `gemini-1.5-pro` alternative per §13, selected via `LLM_PROVIDER`) and `generateText()` (system+prompt → extracted string, tolerant of array-shaped output). Added direct deps `@langchain/core@1.2.9`, `@langchain/openai@1.5.10`, `@langchain/google-genai@2.3.0`. `.env.example` documents `LLM_PROVIDER`/`OPENAI_*`/`GOOGLE_*`/`GEMINI_*`.
- **Why:** Task P3.01 — isolate LLM calls behind a swappable provider (unblocks P4.01/P4.02 agents). Plan §13 specifies LangChain wrapping; D1 picks OpenAI default.
- **Impact:** 3 new unit tests (mock completion, array output, missing-key errors) green; full suite 10 passed / 2 skipped (live-node), lint + build clean.
- **Migration/action required:** Set `OPENAI_API_KEY` (or `GOOGLE_API_KEY`) in any environment that runs agents. Provider model is injected for tests, so no key is needed in CI unit runs.

### 2026-08-26 — P2.02: Internal APIs (honeypots + reports)
- **What changed:** Added route handlers `src/app/api/honeypots/route.ts` (GET list + POST create) and `src/app/api/reports/route.ts` (GET list), plus shared helpers `src/lib/api/errors.ts` (standard `{error}` shape w/ `requestId`) and `src/lib/api/rateLimit.ts` (in-memory fixed-window limiter, 20/60s on POST). Inputs validated at the boundary with Zod. POST `/api/honeypots` requires `authorization: Bearer <ADMIN_API_KEY>` (fail-closed 401 if key unset) and returns 409 on duplicate address. `.env.example` documents `ADMIN_API_KEY`.
- **Why:** Task P2.02 — endpoints for UI/agents to consume DB data (unblocks P5.01 Dashboard).
- **Impact:** Routes registered as dynamic `ƒ` in build; 3 new integration tests (list filter, auth+create+dup, reports limit validation) green against live DB; full suite 7 passed / 2 skipped (live-node), lint + build clean.
- **Migration/action required:** `zod` promoted from transitive (Hardhat toolbox) to a **direct** dependency (`^3.25.76`) — justified per docs/22 (standard-lib can't validate; Zod is the plan §12-specified validator; maintained, permissively licensed, zero extra runtime cost). Set `ADMIN_API_KEY` in any environment that should allow honeypot creation.

### 2026-08-26 — P2.01: Domain database schema (Honeypot / Event / ThreatReport)
- **What changed:** Added `Honeypot`, `Event`, `ThreatReport` models to `prisma/schema.prisma` per IMPLEMENTATION_PLAN.md §11. Uniques on `Honeypot.address` and `Event.txHash` (one canonical Event per tx); strictly 1:1 `Event ↔ ThreatReport`; helper indexes on `Honeypot.network`, `Event.createdAt`, `ThreatReport.severity`. Status/severity/type stay plain strings with documented value domains (enum upgrade deferred). Synced via `npx prisma db push` against the local DB.
- **Why:** Task P2.01 — data structure for honeypots, captured events, and AI reports; unblocks P2.02 APIs and P4.01 Analysis Agent.
- **Impact:** Round-trip verified (create Honeypot→Event→ThreatReport, nested read, FK-safe cleanup); suite 4 passed/2 skipped (live-node tests need `hardhat node`), lint + build green.
- **Migration/action required:** None for fresh clones (`db push` or postinstall covers it); note default FK restrict means Event rows must be deleted before their Honeypot.

### 2026-08-26 — P1.02: Web3 deployment service
- **What changed:** Added `src/lib/web3/deploy.ts`: `deployContract(name, {rpcUrl?, privateKey?, constructorArgs?, artifactsDir?}) → {address, txHash, deployer}` using pure ethers v6 over compiled Hardhat artifacts. Guard: non-local RPC requires explicit `DEPLOYER_PRIVATE_KEY`; localhost defaults to well-known dev account. Scripts: `npm run chain`. `.env.example` documents RPC/key/artifact vars.
- **Why:** Task P1.02 — programmatic deployment interface for agents/API (P4.02, P2.x consumers).
- **Impact:** Verified against live `hardhat node`; suite now 6 Vitest tests + 5 contract tests, all green; app build/lint unaffected.
- **Migration/action required:** Run `npx hardhat compile` before deploying; keep HRE imports out of `src/`.

### 2026-08-26 — P1.01: Hardhat 3 + honeypot Solidity templates
- **What changed:** Added Hardhat 3.14 with `hardhat-toolbox-mocha-ethers` (solc 0.8.28 profiles); contracts `SimpleHoneypot.sol` (deceptive-but-safe vault with attack telemetry — DEC-005) and `ReentrancyAttacker.sol` (test fixture); 5 contract tests in `test/SimpleHoneypot.ts`. Converted project to ESM (`"type": "module"`, DEC-006). Gitignored Hardhat outputs (`artifacts/`, `cache/`, `types/`, coverage, ignition deployments); scoped Next tsconfig/eslint away from generated + contract-test code; added `@types/mocha`.
- **Why:** Task P1.01 — EVM compilation/local testing environment; unblocks P1.02 deployment service.
- **Impact:** Contract tests run via `npx hardhat test` (5 passing); app build/lint/vitest unaffected.
- **Migration/action required:** Node-side scripts must be ESM now. Sepolia intentionally unconfigured; future testnet keys must use Hardhat keystore/`configVariable()`, never plaintext.

### 2026-08-26 — P0.03: Configured Vitest
- **What changed:** Added Vitest 4.1.11 (`vitest.config.mts` with `@` alias, node env), `tests/setup.ts` (dotenv), smoke unit test, and `tests/integration/db.test.ts` that exercises the Prisma singleton against Postgres with skip-guards for missing/unreachable DB. Scripts: `npm test`, `npm run test:watch`.
- **Why:** Task P0.03 — formalize the verification harness; upgrades P0.02's ad-hoc DB check into a real suite.
- **Impact:** All Phase 0 tasks complete; later phases inherit CI-ready test command.
- **Migration/action required:** None; config uses `.mts` to avoid Vite CJS/ESM warning without changing package type.

### 2026-08-26 — P0.02: Configured Prisma 7 + local PostgreSQL
- **What changed:** Installed Prisma 7.10 (`prisma-client` generator, `@prisma/adapter-pg`); created `prisma/schema.prisma` (Config model), `prisma7.config.ts`, `.env.example`, singleton `src/lib/db.ts`, connectivity script `scripts/check-db.ts` (also exposed as `npm run db:check`). Local Postgres 17 runs as rootless podman container `honychain-db`. Generated client gitignored at `src/generated`; postinstall generates it.
- **Why:** Task P0.02 — establish DB connection and ORM client ahead of the domain schema (P2.01).
- **Impact:** `npx prisma db push` succeeds against local DB; app-level client verified via upsert/count. Build + lint still green.
- **Migration/action required:** Fresh clones need podman container up (see docs/05) + `npm install` before dev/build. Prisma CLI pinned to stable v7 (an 8.0 RC was rejected).

### 2026-08-26 — P0.01: Initialized Next.js application shell
- **What changed:** Scaffolded Next.js 16.3.3 + React 19 + TypeScript + Tailwind CSS v4 (App Router, `src/` dir, `@/*` alias) via create-next-app; renamed package to `honychain`; set app metadata; synced docs 03/12 and decisions DEC-001/DEC-002.
- **Why:** Foundation task P0.01 of IMPLEMENTATION_PLAN.md; all later phases depend on the app shell.
- **Impact:** Repo root now contains a buildable Next.js app alongside `agent-doc-system/`.
- **Migration/action required:** Run `npm install` on fresh clones; run `npm run dev` for port 3000, `npm run build` for production build.

## Template
### YYYY-MM-DD — Change title
- **What changed:** TBD
- **Why:** TBD
- **Impact:** TBD
- **Migration/action required:** TBD
