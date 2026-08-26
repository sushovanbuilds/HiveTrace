# Technology Stack

> Decisions must be evidence-based and aligned with project constraints. Do not select technologies solely because they are popular.

| Area | Technology | Purpose | Why chosen | Alternatives | Risks | Status |
|---|---|---|---|---|---|---|
| Frontend | Next.js 16 (App Router) + Tailwind CSS v4 + TypeScript | UI shell + pages | Per IMPLEMENTATION_PLAN.md §6; unified full-stack framework | Vite/React SPA | Low | Implemented (P0.01, shell only) |
| Backend | Next.js API Route Handlers (`src/app/api/**`) | REST endpoints for DB + agent orchestration | Same runtime/deploy as frontend | Express/Nest | Low | Planned (P2.02) |
| Database | PostgreSQL 17 (podman local) + Prisma 7 + `@prisma/adapter-pg` | Relational store for honeypots/events/reports | Type-safe ORM, relational fit for tx data; v7 driver-adapter (Rust-free) client | MongoDB | Low | Implemented (P0.02: connectivity via Config model) |
| Auth | TBD | TBD | TBD | TBD | TBD | Decision required |
| AI/LLM | LangChain + Gemini/OpenAI adapter | Threat-report generation via structured output | Provider abstraction per plan §13 | Direct API calls | Vendor lock-in | Planned (P3.01) |
| Agent framework | LangGraph or custom loop (open decision D3) | Stateful agent flows with human-in-loop | Deferred until P4 | AutoGen | Complexity | Decision required |
| Blockchain tooling | Hardhat 3.14 + `hardhat-toolbox-mocha-ethers` (ethers v6, mocha/chai), solc 0.8.28 | Honeypot compile/deploy, local EVM testing | HH3 official stack; ethers needed by P1.02 service | viem / Foundry | Low | Implemented (P1.01: templates compile, 5 contract tests green) |
| Testing | Vitest 4 (node env) | Unit/integration tests | Fast native ESM, Vite-based | Jest | Low | Implemented (P0.03: runner + smoke + DB integration w/ skip-guard) |
| Deployment | Vercel (web) + Supabase (Postgres) | Zero-config hosting | Plan §17 | AWS/Docker | Low | Not started |
| Monitoring | TBD (plan §16 suggests Pino/Winston) | Logging, token-cost tracking | TBD | TBD | TBD | Decision required |
| CI/CD | None yet | TBD | TBD | GitHub Actions | Low | Decision required |

## Selection Rules
1. Prefer stable, maintained technologies.
2. Minimize unnecessary dependencies.
3. Prefer interoperable standards and portable interfaces.
4. Record important trade-offs in `30-decisions.md`.
