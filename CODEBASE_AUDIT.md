# HiveTrace Codebase Audit

Date: 2026-09-21. Read-only audit of `~/workspace/HiveTrace` (package name `honychain`). No code was modified; only this document was created.

## Fixes applied (2026-09-21)

All 9 P0 items below were fixed and verified: `eslint` 0 errors (was 2), `tsc --noEmit` pass, `vitest` 80/80 pass, `next build` pass.
- Demo login bypass is now inert unless `HIVETRACE_DEMO_LOGIN=true` (`src/app/api/auth/login/route.ts`); documented in `.env.example`.
- `/verify/[code]` renders an error state on DB failure instead of a fabricated VALID verdict, and passes the signed `?t=` token through so genuine labels report VALID.
- Batch `PATCH` rejects `qualityStatus` changes from non-LAB/non-ADMIN roles (403).
- `TIMELINE_ANOMALY` now flags future-dated events (the old ascending-position check could never fire).
- `MISSING_PROCESS_EVENTS` expects only event types the API actually emits (`HARVEST`, `COLLECTION`, `QUALITY_TEST`, `PROCESSING`, `PACKAGING`, `SHIPMENT`, `RETAIL_LISTING`).
- `/blockchain` renders an error panel on DB failure instead of invented Polygon tx hashes.
- The 2 `set-state-in-effect` lint errors in the QR components are fixed via render-time state adjustment.
- `tsx` added to devDependencies so `npm run db:seed` works on fresh clones.

## What this is

Next.js 16.3.3 + React 19 + Tailwind v4 + Prisma 7 + Postgres honey supply-chain traceability platform: farm → hive → harvest → batch lifecycle, QR label issuance/verification (hand-rolled ISO 18004 QR encoder + HMAC-signed tokens), SHA-256 Merkle-anchored event integrity against a *simulated* ledger, deterministic rule-based risk scoring, incident triage, and per-role demo workspaces backed by localStorage running in parallel to the real Prisma-backed server pages.

## Check results

| Check | Command | Result |
|---|---|---|
| Install | `npm ci` | FAIL at postinstall — `prisma generate` engine download ECONNRESETs through the egress proxy (prisma's own downloader; direct curl through the same proxy works). Workaround used: `npm ci --ignore-scripts` (774 pkgs OK) + manually fetched schema-engine + `npx prisma generate` (OK). |
| Lint | `npx eslint` | FAIL — 2 errors, 25 warnings. Errors: `react-hooks/set-state-in-effect` in `src/components/batch-qr-downloader.tsx:47` and `src/components/demo/demo-qr-label.tsx:11`. |
| Typecheck | `npx tsc --noEmit` | PASS (rc=0). Note: no `typecheck` script exists in package.json. |
| Tests | `npx vitest run` | PASS — 80/80 across 9 files. Caveat: risk-engine tests cover only constants, not rules. |
| Build | `next build` (dummy secrets passed inline; no `.env` file created) | PASS (rc=0), no build warnings. |

## 1. Critical bugs

- `/verify/[code]` drops the signed `?t=` token: the page calls `verifyBatch({ publicCode }, null, null)` and declares no `searchParams`, so the consumer UI **never** reports `VALID` — the HMAC label-authentication story is dead code in the real UI. (`src/app/verify/[code]/page.tsx:137`)
- `/verify/[code]` DB-failure fallback renders a fabricated "Honey Verified / VALID" verdict (`DEMO_OUTCOME()`, fake hash `a94f…2c1e`, `simulated: true`) — a forged-positive result on any DB error. (same file, lines ~80–118)
- Producers can self-certify quality: `PATCH /api/batches/[id]` `PatchSchema` includes `qualityStatus` (line 85), applied for any `batch:write` custodian — bypasses the LAB/ADMIN-only `quality:write` gate. (`src/app/api/batches/[id]/route.ts:85,127`)
- Demo backdoor: `DEMO_PASSWORD = "hivetrace-demo"` in `src/app/api/auth/login/route.ts:38–49` skips DB lookup and scrypt and mints signed session cookies for 7 accounts including ADMIN. No env kill-switch; the file says "remove before any real deployment" but it ships live.
- Risk engine `TIMELINE_ANOMALY` can never fire: events are fetched ascending, the rule checks for strictly decreasing timestamps — provably always empty. (`src/lib/services/risk-engine.ts:219–231`)
- Risk engine `MISSING_PROCESS_EVENTS` expects `CUSTODY_TRANSFER` / `LAB_RESULT` event types that no code ever creates → a permanent 20–40pt process penalty on every batch, dulling score discrimination. (`risk-engine.ts:336–344`; `CLIENT_SUBMITTABLE_EVENT_TYPES` in `src/lib/types.ts:202–210` contains no `CUSTODY_TRANSFER`)
- `blockchain/page.tsx:20–28,65` renders invented Polygon testnet tx hashes and block numbers as chain data whenever the DB query fails — fabricated provenance evidence in a traceability product, contradicting `anchor.ts`'s "never present a simulation as real" policy.
- Custody has no write path at all: no `CUSTODY_TRANSFER` event type, no `db.custodyTransfer.create` outside `prisma/seed.ts`, no `/api/custody*` route; `/custody` and `/supply-chain` render `DEMO_TRANSFERS` indefinitely and the "New Hand-off" button is inert. (`src/app/custody/page.tsx:63–89`)
- `npm run db:seed` is broken on fresh clones: the script uses `tsx`, which is not in dependencies.

## 2. Broken/dead functionality

- Inert controls: hive-detail "Log Inspection" / "Log Harvest" buttons (no `onClick`); settings tabs; topbar Notifications / "Synced 2m ago"; traceability and genealogy search inputs (no state/handlers); login "Forgot password?" (`href="#"`); landing footer links (`href="#"`); "Remember me" checkbox (no handler).
- Dead links/anchors: "Add hive" → `/hives?new=1` (param never read; no creation form exists); `/distributor#tracking` / `#delivery` anchors don't exist in the page.
- Dead component exports (zero usages): `RiskGauge`, `Sparkline`, `Segmented`, `GlassCard`, `PageHeader`, `MetricCard`, `CardHeader`, `IconTile` (`src/components/ui.tsx`, `charts.tsx`, `icons.tsx`).
- Dead code: `generateDemoBatchCode` / `generateUniqueDemoBatchCode` (`src/lib/demo/code.ts`); `src/lib/auth/page.ts` ("authoritative gate", zero imports); tsconfig `exclude: ["test"]` (the dir is `tests/`).
- Risk scoring runs only on manual `POST /api/batches/[id]/risk` — no scheduler or event hook, so every risk state goes stale silently.
- Resolving an incident never re-scores the batch: a `FALSE_POSITIVE` decision leaves HIGH risk displayed; `CONFIRMED_FRAUD` changes nothing. Neither the investigation path nor `PATCH /api/incidents/[id]` touches `batch.riskScore`.
- `PATCH /api/incidents/[id]` → RESOLVED leaves linked alerts NEW/ACKNOWLEDGED (only the investigation-with-decision path resolves alerts).
- Zero notifications on HIGH alerts — no email/webhook code anywhere in `src/`.
- Demo `RoleSwitcher` is unreachable on mobile (rendered only in the `hidden md:flex` sidebar).
- Hive detail "Live telemetry" (35.2°C, 62%, 42 kg) and the "HIVE INTELLIGENCE" panel (health 88, etc.) are hardcoded constants for every hive. "HiveOS" / sensors / MQTT / telemetry do not exist anywhere in the codebase.
- `/genealogy` is a static hardcoded SVG that ignores the real `/api/lineage` BFS; `/risk-center` is a 100%-demo parallel of `/risk` driven by localStorage scripted data.
- `RULE_ALERT_TYPE` maps `MISSING_PROCESS_EVENTS` → `"ABNORMAL_YIELD"` alert type — suspected copy-paste mislabel (`risk-engine.ts:40`).

## 3. Missing demo flows

- No custody hand-off recording (API or UI); no hive creation form; no risk-recalc trigger inside any flow.
- Demo keeper-created batches use `generateBatchNumber()` (`HC-2026-XXXXXX`), which `isDemoBatchCode()` doesn't recognize → they fall through to the DB path and hit the fake-verdict fallback; the `HC-DEMO-` generator that would fix this is dead code.
- Demo data doesn't sync across tabs — no `storage` event listener (`src/lib/demo/data.ts`).
- Harvest form (`/harvests/new`) only surfaces `HARVEST_NOT_FOUND` errors; other submit failures likely fail silently (suspicion).
- No loading or error boundaries anywhere: zero `loading.tsx` / `error.tsx` / `<Suspense>` / skeletons.

## 4. Architecture problems

- Two parallel worlds: demo client pages (localStorage, `useDemoData`, no server I/O, client-side role guards) vs real server pages (Prisma, `force-dynamic`). Demo pages bypass all server capability checks; `AppShell` prefers the localStorage demo session over `/api/auth/me`, so UI identity can diverge from the signed cookie.
- No global demo flag — the split is structural by route. Four server pages (`/risk`, `/incidents`, `/incidents/[id]`, `/blockchain`) `catch {}` DB failures and render hardcoded demo rows/hashes with no "demo data" banner.
- Overlapping pages: `/trace` vs `/batches`, `/risk` vs `/risk-center`, `/traceability` vs `/supply-chain` vs `/genealogy` vs `/custody`.
- 18 API routes have zero internal callers (only 4 `fetch("/api/…")` call sites exist in the whole app) and no OpenAPI/docs — unclear whether this is an intentional external API or dead surface.
- Rate limiter keys on spoofable `X-Forwarded-For`, is in-memory and unbounded (the file's own comments admit this).
- Stateless JWT sessions: no revocation; logout only clears the cookie.
- Stage transitions enforce forward-only but allow skipping stages (business-logic question).
- `/api/lineage` returns neighbor batches from other organisations without per-node filtering (needs a product decision).

## 5. Duplicate/unnecessary code

- Unused dependencies (zero imports in `src/` or `tests/`): `hardhat`, `@nomicfoundation/hardhat-toolbox-mocha-ethers`, `@types/mocha`, `@phosphor-icons/react`, `clsx`.
- Near-duplicates: `RiskGauge` vs `RingGauge`; `riskPill`/`qualityPill` (`ui.tsx`) vs `demoRiskPill`/`demoQualityPill` (`demo/format.ts`); `BatchQrDownloader` vs `DemoQrLabel`; custom inline timeline in `/batches/[id]` vs `demo/timeline.tsx`.
- `STAGE_ORDER` drift: 6 stages in `src/lib/demo/verify.ts` vs 7 in `src/lib/types.ts`.
- Repo bloat: `hive-trace/` v0 prototype directory, `hive-trace.zip`, two Stitch design zips (~12 MB total) committed to git; `install.cmd` is an unrelated third-party binary downloader (Antigravity CLI) with zero HiveTrace references.
- Inconsistent error envelopes: `auth/logout` 429 shape and `qr` validation shape omit `requestId`; `anchor` 400 drops zod issues. Stale doc: `docker-compose.yml` references non-existent `npm run db:migrate`.

## 6. UI/UX problems

- No loading states, skeletons, or error boundaries app-wide (verified: no `loading.tsx`/`error.tsx`, zero `<Suspense>`).
- Harvest form: `grid sm:grid-cols-2` is dead — every `<label>` carries `sm:col-span-2`, so fields stay full-width on desktop too.
- Dead CSS class `text-metadata-xs` on the login page (token doesn't exist; silently inherits).
- Hardcoded hover hex in `src/components/ui.tsx:14–15` instead of theme tokens; arbitrary px values on landing/verify pages instead of declared spacing tokens.
- Zero `focus-visible` styles anywhere (keyboard focus relies on browser defaults).
- All tables keep every column on mobile — pure horizontal scroll with 10px headers; no column hiding.
- Duplicate `chartFill` SVG gradient id in `TrendChart` (`src/components/charts.tsx`) — two charts on one page conflict.
- Risk page distribution card uses `grid-cols-3` with no mobile fallback (cramped at 360px).
- Dark mode unsupported (explicit `colorScheme: "light"` lock); no PWA manifest/touch icons; `public/` holds only Next boilerplate SVGs.
- Verified good: proper sidebar → bottom-dock mobile pattern, safe-area padding, iOS input-zoom guard (`font-size: 16px` under 640px), global `overflow-x` guards, mobile-first verify scanner with camera-permission handling and manual-code fallback.

## 7. Security issues

- P0 items from §1: demo backdoor accounts, producer self-certified quality, fabricated verify verdict, fabricated chain data.
- `GET /api/anchor` skips the org check that every sibling batch route performs — any `batch:read` role can probe another org's anchor/event-bundle hashes by id. (`src/app/api/anchor/route.ts:50–59`)
- `POST /api/qr` is public, unrate-limited, and `logo` is an unbounded `z.string()` — megabyte base64 logos trigger expensive SVG rendering, repeatedly.
- `verify` routes use manual casts instead of zod (no length caps); `qr` POST calls `await request.json()` directly, so malformed JSON becomes a 500 instead of 400.
- 8 routes lack the `route()` wrapper (anchor, auth/login, auth/logout, auth/me, health, verify, verify/[code]) — DB throws become framework 500s outside the standard error envelope.
- `POST /api/batches/[id]/qr` returns 403 (not 404) for cross-org batches, confirming a foreign batch exists.
- Investigation route parses/validates the body before the auth check (minor ordering quirk).
- Verified non-issues: no SQL injection (parameterized Prisma; only a parameterless `SELECT 1` raw query), no mass assignment (explicit zod objects; `riskState`, `actorId`, `resolvedAt` are server-derived).

## 8. Performance issues

- Every server page is `force-dynamic` with no caching/revalidation — every request hits Postgres; no pagination caps spotted on list queries (suspicion, worth verifying).
- `setState`-in-effect in both QR components (the 2 lint errors) causes cascading renders.
- Unbounded `logo`/`qrLogo` base64 fields on the QR routes (see §7).
- `jsqr` (camera decode on `/verify`) is unmaintained since ~2019.
- `<img>` used instead of `next/image` in several places (lint warnings).

## 9. Safe improvements (no behavior change)

- Add a `typecheck` script and CI workflows (lint/type/test/build); fix the 2 lint errors and the unused-var warnings.
- Remove unused dependencies and dead component exports; remove `hive-trace/`, the design zips, and `install.cmd` after confirming intent.
- Add `loading.tsx`/`error.tsx` boundaries and skeletons; add `focus-visible` styles; fix the dead harvest grid and dead `text-metadata-xs`.
- Put a visible "demo data" banner on every surface that falls back to `DEMO_*` constants.
- Document the external API (or remove unreferenced routes); unify error envelopes; rate-limit `anchor`/`qr`/`preview-id`; bound `logo` lengths.
- Add rule-level unit tests for the risk engine; calibrate thresholds (the file itself says "demo defaults — calibrate against field data").
- Make `RoleSwitcher` available on mobile; fix dead anchors/links and wire or remove dead search inputs.
- Add cross-tab demo sync via `storage` events; fix the duplicate `chartFill` gradient id.
- Replace `jsqr` with a maintained decoder; add a PWA manifest.

## Prioritized action list

**P0 (critical/blocking)**

- Remove or env-gate the hardcoded demo login bypass in `src/app/api/auth/login/route.ts` (mints ADMIN sessions with a public password).
- Replace the `/verify/[code]` DB-failure fake "Honey Verified / VALID" verdict with an error state.
- Pass the signed `?t=` token through `/verify/[code]` (add `searchParams`) so consumer label verification can report VALID.
- Remove `qualityStatus` from the batch `PATCH` allow-list (or restrict to LAB/ADMIN) — producers can currently self-certify.
- Fix the unreachable `TIMELINE_ANOMALY` rule in `src/lib/services/risk-engine.ts` (dead temporal protection).
- Fix `MISSING_PROCESS_EVENTS` expecting event types no code ever emits (`CUSTODY_TRANSFER`, `LAB_RESULT`).
- Stop `blockchain/page.tsx` rendering invented Polygon tx hashes as real chain data on DB failure.
- Fix the 2 error-level lint failures (`set-state-in-effect` in both QR components).
- Fix `npm run db:seed` (`tsx` is missing from devDependencies).

**P1 (important)**

- Add the missing org check to `GET /api/anchor` (cross-tenant probing gap).
- Rate-limit public `POST /api/qr` and cap `logo` length (unbounded SVG-render DoS).
- Wrap the anchor/login/verify/health routes in `route()` for consistent error handling.
- Re-score batch risk on incident resolution / investigation decision (currently fully decoupled).
- Resolve linked alerts when an incident is PATCH-resolved (only the investigation path does today).
- Add notifications for HIGH alerts (currently silent).
- Add visible "demo data" banners wherever server pages fall back to `DEMO_*` constants.
- Decide the custody write path: add a `CUSTODY_TRANSFER` event type + API, or remove the inert "New Hand-off" button.
- Add scheduled or event-driven risk recalculation (manual-only POST today; scores go stale).
- Add rule-level unit tests for the risk engine (only constants are tested).
- Add a `typecheck` script and CI gates (lint/type/test/build) — none exist.
- Make the demo `RoleSwitcher` reachable on mobile.
- Remove unused dependencies and dead component exports.
- Fix the harvest form's dead `sm:grid-cols-2` grid and the dead `text-metadata-xs` class on login.
- Add `loading.tsx`/`error.tsx` boundaries and skeletons (none exist).

**P2 (nice-to-have)**

- Remove `hive-trace/`, the design zips (~12 MB), and the unrelated `install.cmd` from the repo (confirm intent first).
- Consolidate or explicitly document the parallel demo/prod pages (`/trace` vs `/batches`, `/risk` vs `/risk-center`).
- Add a PWA manifest and touch icons.
- Add `focus-visible` styles; enlarge small tap targets (ledger pagination, QR copy button).
- Fix the duplicate `chartFill` SVG gradient id in `TrendChart`.
- Unify the error-envelope deviations and the 403→404 inconsistency on cross-org QR issuance.
- Add cross-tab sync for the demo dataset (`storage` events).
- Document the 18 unreferenced API routes (OpenAPI) or remove them.
- Calibrate risk thresholds against field data.
- Fix dead links/anchors (`/hives?new=1`, `/distributor#tracking|#delivery`) and wire or remove dead search inputs.
- Replace unmaintained `jsqr` with a maintained QR decoder.
- Decide whether stage transitions may skip stages (currently allowed).

## HiveOS enhancement (2026-09-21)

The Smart Hive module was enhanced into **HIVETRACE HIVEOS** (hive digital twin +
explainable intelligence + action engine) without rebuilding the application:

- New `src/lib/hiveos/` layer: `types.ts`, `demo.ts` (deterministic seeded
  synthetic dataset), `engine.ts` (transparent prototype rules:
  health classification, why-explanations, action recommendations, apiary
  anomaly grouping, trust ladder, what-if simulator), `service.ts`
  (DB-first with demo fallback, traceability bridge Hive → Harvest → Batch).
- New `src/components/hiveos/` UI: health badge, why panel, action list,
  trust ladder, hive passport, traceability bridge, intervention memory
  (localStorage), what-if simulator (client), apiary overview (heatmap + groups).
- `/hives` now shows apiary intelligence; `/hives/[id]` is the HiveOS detail
  page (passport, health state + factors, why engine, action engine,
  intervention memory, traceability bridge, trust ladder, what-if simulator).
- Honesty labeling throughout: "prototype rules", LOW/MEDIUM/HIGH DATA
  CONFIDENCE (no invented percentages), "Simulated decision-support output",
  associative (never causal) explanation language.
- 32 new unit tests in `tests/unit/hiveos-engine.test.ts` (112/112 total pass).
- Verified: lint 0 errors, typecheck clean, production build succeeds, and all
  six demo hive detail routes plus fleet/verify/batches/dashboard/blockchain
  render 200 on the dev server.
