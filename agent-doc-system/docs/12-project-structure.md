# Project Structure

Actual structure after P0.01 (Next.js 16 App Router, `src/` directory enabled).

```text
honychain/
├── agent-doc-system/        # Project documentation system (docs/, AGENTS.md)
├── src/
│   ├── app/                 # App Router: pages + API route handlers
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Placeholder home (dashboard lands here in Phase 5)
│   │   └── globals.css
│   ├── components/          # Shared React components (create on first use)
│   ├── features/            # Feature-scoped modules
│   ├── services/            # Long-running/background services (listener, orchestrator)
│   ├── agents/              # Agent implementations (analysis, deploy) + tools/
│   ├── lib/                 # Framework-agnostic core: db.ts, ai/, web3/
│   ├── types/               # Shared TypeScript types
│   └── utils/               # Pure helpers
├── contracts/               # Solidity honeypot templates (Phase 1)
├── tests/                   # Vitest suites (unit + integration)
├── scripts/                 # Operational scripts
├── prisma/                  # Schema + migrations (P0.02+)
├── public/                  # Static assets
├── .env.example             # Env template (P0.02+) — never commit .env
├── next.config.ts
├── package.json
├── tsconfig.json
└── IMPLEMENTATION_PLAN.md   # Canonical execution roadmap
```

## Placement Rules
- **API endpoints**: route handlers under `src/app/api/<resource>/route.ts`. No business logic inline — delegate to `src/lib/*`, `src/services/*`, or agents.
- **Database access**: only via the Prisma singleton in `src/lib/db.ts` (created in P0.02).
- **AI calls**: only through the provider abstraction in `src/lib/ai/provider.ts`; never call provider SDKs from routes/agents directly.
- **Blockchain keys/RPC**: accessed only inside deterministic tools/services under `src/lib/web3/`; never passed into LLM context.
- **Agent tools**: `src/agents/tools/*`, one file per tool with explicit input/output schemas.
- **Tests**: colocate unit specs beside modules or group integration specs in `tests/`; contract tests live with Hardhat config at root.
- **Path alias**: `@/*` maps to `./src/*`.
