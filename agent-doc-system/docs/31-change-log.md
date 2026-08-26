# Change Log

Track meaningful project-level changes, not every edit.

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
