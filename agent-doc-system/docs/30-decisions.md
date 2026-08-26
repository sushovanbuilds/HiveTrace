# Architecture / Project Decisions

Record durable project decisions here.

## Template
### DEC-001 — Use `src/` directory layout for the Next.js app
- **Date:** 2026-08-26
- **Decision:** Scaffold with App Router + `--src-dir` (`src/app/**`), import alias `@/*` → `src/*`.
- **Context:** IMPLEMENTATION_PLAN.md P0.01 lists `app/layout.tsx`, but most later task paths use `src/lib/db.ts`, `src/agents/*`, `src/services/*`; docs/12 template also shows a `src/` root.
- **Options:** (a) no src dir, (b) src dir.
- **Chosen option:** (b) src dir.
- **Reason:** Keeps app code separate from config/Hardhat contracts at repo root; consistent with the majority of planned file paths.
- **Consequences:** API routes live at `src/app/api/**` (not `app/api/**` as written in plan §12); plan updated accordingly.

### DEC-002 — Defer git initialization
- **Date:** 2026-08-26
- **Decision:** No `git init` performed during P0.01; repository versioning to be initialized by the user.
- **Context:** Workspace was not a git repo and scaffolding was merged into an existing non-empty directory.
- **Chosen option:** Skip git setup; `.gitignore` from create-next-app is in place.
- **Reason:** Agent must not perform high-impact operations unprompted.
- **Consequences:** First commit should happen before further phases accumulate untracked files.

### DEC-003 — Prisma 7 with `prisma-client` generator, driver adapter, generated output in `src/generated`
- **Date:** 2026-08-26
- **Decision:** Use Prisma 7.10 (stable) with the new `prisma-client` generator, `@prisma/adapter-pg` driver adapter, client emitted to `src/generated/prisma` (gitignored), singleton in `src/lib/db.ts`, `postinstall: prisma generate`.
- **Context:** Initial `npm i -D prisma` resolved an 8.0 RC while `@prisma/client` was 7.x; v7 is the current stable line. v7 no longer auto-loads `.env` (loaded via `dotenv/config` in `prisma7.config.ts`) and uses driver adapters instead of the Rust query engine.
- **Chosen option:** Stable v7 aligned across `prisma`, `@prisma/client`, and `@prisma/adapter-pg`; avoid RC churn during MVP.
- **Reason:** Version alignment prevents runtime/generator drift; adapter mode matches upstream's current architecture.
- **Consequences:** Schema `output` path is relative to `prisma/` (`../src/generated/prisma`); fresh clones must run `npm install` (postinstall generates the client) before building.

### DEC-004 — Local Postgres via rootless podman
- **Date:** 2026-08-26
- **Decision:** Run dev Postgres 17 as a rootless podman container named `honychain-db`, bound to 127.0.0.1:5432.
- **Context:** Docker daemon is inactive on this machine and passwordless sudo is unavailable for systemctl; podman is installed.
- **Chosen option:** Rootless podman container.
- **Reason:** No system service changes or root required; matches local-dev target of plan §17.
- **Consequences:** Container does not auto-start after reboot (`podman start honychain-db` needed); Supabase remains the hosted target per plan.

### DEC-005 — Honeypot templates are deceptive-but-safe, not genuinely exploitable
- **Date:** 2026-08-26
- **Decision:** `SimpleHoneypot` presents a reentrancy bait (bait ordering/naming, payable fallback) but enforces checks-effects-interactions; failed external calls restore state and emit persistent telemetry (`AttackDetected`, `attackCount`, `ReentryAttempted`, `reentryCount`) from the honeypot's own execution frame.
- **Context:** Plan P1.01 wording says "basic vulnerable ... reentrancy honeypot". A truly vulnerable template lets attackers drain value AND reverts their frames on Solidity ≥0.8 arithmetic panics — rolling back exactly the events the Analysis Agent (P4.01) needs as evidence. Security model §7 restricts honeypots to local/low-value networks anyway.
- **Options:** (a) genuinely vulnerable classic EtherStore clone, (b) deceptive-but-safe with durable telemetry.
- **Chosen option:** (b).
- **Reason:** Product value = observed attacker behavior, which requires non-reverting, persistent signals; zero real-value risk aligns with §7 and risk table §19.
- **Consequences:** Attack simulations end with funds intact; E2E assertions assert neutrality + telemetry rather than drains. If a research-grade live-vuln mode is ever wanted, it must be an explicitly flagged variant, never default.

### DEC-006 — Project converted to ESM (`"type": "module"`)
- **Date:** 2026-08-26
- **Decision:** Root package.json sets `"type": "module"`; Vitest config uses `.mts`.
- **Context:** Hardhat 3 refuses CJS projects outright ("Hardhat only supports ESM projects").
- **Reason:** No viable alternative keeps HH3; all existing tooling (Next 16, Vitest 4, tsx scripts, Prisma config) verified working under ESM after the flip.
- **Consequences:** New Node scripts should use ESM syntax; top-level await available; extensionless relative imports in standalone scripts still need tsx or explicit extensions.
