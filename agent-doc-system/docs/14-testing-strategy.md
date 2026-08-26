# Testing Strategy

## Tooling (current)
Vitest 4, node environment. Config: `vitest.config.mts` (`@` alias → `src/`). `tests/setup.ts` loads `.env` via dotenv for all suites.

| Command | Purpose |
|---|---|
| `npm test` | Single run (CI mode) |
| `npm run test:watch` | Watch mode |

### Conventions
- Unit tests: colocate as `src/**/*.test.ts` or place under `tests/`.
- Integration tests: `tests/integration/**`. DB-dependent tests must degrade gracefully: skip when `DATABASE_URL` is unset or the database is unreachable — never fail a run because infra is down.
- Frontend/component testing is deferred to Phase 5 (frontend freeze). Add jsdom/happy-dom + React Testing Library only then.
- Contract tests will live with Hardhat (Phase 1), not Vitest.

## Test Layers
| Layer | Purpose | Required for | Status |
|---|---|---|---|
| Unit | Isolate logic | Business logic | Active (`tests/smoke.test.ts`) |
| Integration | Verify component boundaries | Services/APIs | Active (`tests/integration/db.test.ts`, Prisma ↔ Postgres) |
| Component | Verify UI behavior | Interactive components | Deferred (Phase 5) |
| E2E | Verify user journeys | P0/P1 critical paths | Planned (P6.01) |
| AI evaluation | Verify model behavior | AI features | Planned (P3.01+) per IMPLEMENTATION_PLAN §15 |
| Security | Detect security regressions | Security-sensitive changes | Planned (Phase 7) |
| Performance | Detect unacceptable latency/resource use | Performance-critical changes | Not started |

## Test Requirements
Every P0 feature needs explicit acceptance tests. Bugs should gain regression coverage when practical.

## AI Evaluation
Include representative prompts, expected properties, adversarial cases, and acceptable variance where deterministic output is impossible.
