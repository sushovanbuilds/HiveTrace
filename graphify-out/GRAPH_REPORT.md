# Graph Report - honychain  (2026-08-26)

## Corpus Check
- 194 files · ~69,773 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 781 nodes · 864 edges · 156 communities (47 shown, 109 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 83 edges (avg confidence: 0.86)
- Token cost: 90,000 input · 9,400 output

## Community Hubs (Navigation)
- Honychain AI blockchain security platform
- dependencies
- compilerOptions
- honeypots/route.ts
- devDependencies
- Prisma CLI Reference
- orchestrator.ts
- MongoDB Prisma upgrade path (no
- deployAgent.ts
- compilerOptions
- Security Baseline
- dependencies
- devDependencies
- AppShell.tsx
- views.tsx
- hivetrace-feature-page.tsx
- components.json
- types.ts
- Prisma Database Setup skill
- mock.ts
- Change Log (agent-doc-system)
- Prisma Platform CLI App Deploy
- ui.tsx
- hivetrace-dashboard.tsx
- DeployWizard.tsx
- listener.ts
- prisma-client default generator
- prisma.config.ts central config file
- button.tsx
- src/app/layout.tsx
- hive-trace/app/layout.tsx
- DEC-006 ESM project
- Prisma Client Methods reference
- Filter Conditions and Operators reference
- nested writes (create/connect/upsert/disconnect/delete/set)
- Vitest 4 Tooling (Node Env,
- Project Structure (Next.js 16 App
- Testing Strategy
- Next.js breaking-changes agent rules
- Available driver adapters table
- next.config.mjs
- hive-trace/postcss.config.mjs
- Client Extensions (replacement)
- --skip-generate CLI flag (removed)
- $queryRaw / $executeRaw
- defineComputeConfig
- @prisma/compute-sdk
- Vitest 4 testing
- Severity Color Scale (LOW/MEDIUM/HIGH/CRITICAL)
- Web/API Security Concerns
- Changelog Update (31-change-log.md)
- Transaction interface and savepoints
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- Bun auto-loads .env files
- Minimum Node 20.19 / TypeScript
- Generator runtime field (nodejs/bun/deno)
- Metrics preview feature (removed)
- rejectOnNotFound (removed in v5)
- MongoDB stays on Prisma 6.x
- PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION env var
- PrismaClient Constructor reference
- PrismaClient constructor
- transactionOptions (maxWait/timeout/isolationLevel)
- relation filters (some/every/none/is/isNot)
- where filter clause
- atomic update operations (increment/decrement/multiply/divide/set)
- Model Queries (CRUD) reference
- upsert
- select / include / omit
- connectOrCreate relation write
- transaction isolation levels
- P2002 unique constraint violation
- MongoDB _id field requirement (@map
- PlanetScale setup (relationMode prisma)
- Dark Security-Ops Console Aesthetic
- Dashboard Page Component
- Geist Sans/Mono Fonts via next/font
- HoneypotList Component
- StatCard Component
- Tailwind v4 Utility Classes
- ThreatFeed Component
- Design Principles (DO/DON'T)
- AI Provider Abstraction (src/lib/ai/provider.ts)
- Code Placement Rules
- Web3 Tools/Services (src/lib/web3/)
- AI Evaluation Layer
- Agentic AI Security Constraints
- AI Threats (Prompt Injection, Exfiltration)
- Error Categories
- Error Recovery (Retry/Backoff/Fallback)
- Deployment (Environments/Pipeline)
- Environment Configuration
- LLM_PROVIDER Variable
- Git Workflow
- Architecture/Project Decisions Log
- DEC-002: Defer Git Initialization
- DEC-004: Local Postgres via Rootless
- PrismaLibSql adapter (Turso/libSQL)
- SQLite limitations (no enums, no
- SQLite Setup with Prisma
- SQL Server dbo schema default
- SQL Server Setup with Prisma
- Driver Adapter Protocol Boundary
- DriverAdapterError and error mapping
- Driver adapter CRITICAL priority rules
- Shadow database isolation
- mongoRaw raw lane
- Stay-on-v6 hygiene
- v6 MongoDB db push workflow
- db update push-style alternative
- Value objects / embedded shapes
- Prisma Next successor path
- Linking an existing project
- Database claim and lifecycle
- create-db programmatic library API
- Management API auth (service token
- SDK OAuth flow
- Error codes by HTTP status
- Resource ID prefixes (proj_/db_/con_/wksp_)
- Cursor-based pagination
- OAuth 2.0 user-scoped access
- Create connection endpoint
- Delete database/project endpoints
- API error self-correction patterns
- Prisma 7 local project setup
- Service token authentication
- create-db instant provisioning
- Management API SDK usage
- prisma postgres link
- Connection pool configuration
- v7 breaking changes summary
- pnpm workspace configuration (hive-trace)
- Apple touch icon — iOS
- Primary app icon (vector, color-adaptive)
- Dark-theme favicon (32x32 raster)
- Light-theme favicon (32x32 raster)
- Generic placeholder image
- Placeholder brand logo (raster)
- Placeholder brand logo (vector)
- Placeholder user avatar
- DEC-004 rootless podman local DB
- File/document icon (Next.js template)
- Globe icon (Next.js template)
- Vercel logo
- Window/browser-chrome icon (Next.js template)
- Next.js scaffold README

## God Nodes (most connected - your core abstractions)
1. `Prisma CLI Reference` - 22 edges
2. `compilerOptions` - 16 edges
3. `compilerOptions` - 16 edges
4. `prisma migrate dev` - 14 edges
5. `prisma generate` - 11 edges
6. `Honychain AI blockchain security platform` - 11 edges
7. `scripts` - 10 edges
8. `Change Log (agent-doc-system)` - 10 edges
9. `HiveTraceFeaturePage()` - 8 edges
10. `ChatModelLike` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Database Design` --references--> `DEC-003 Prisma driver adapter mode`  [EXTRACTED]
  agent-doc-system/docs/05-database-design.md → IMPLEMENTATION_PLAN.md
- `Removed Prisma v7 environment variables` --conceptually_related_to--> `Prisma 7 (prisma-client + adapter-pg)`  [INFERRED]
  .agents/skills/prisma-upgrade-v7/references/env-variables.md → IMPLEMENTATION_PLAN.md
- `Prisma v7 ESM-first client` --conceptually_related_to--> `DEC-006 ESM project`  [INFERRED]
  .agents/skills/prisma-upgrade-v7/references/esm-support.md → IMPLEMENTATION_PLAN.md
- `prisma-client default generator` --conceptually_related_to--> `Prisma 7 (prisma-client + adapter-pg)`  [INFERRED]
  .agents/skills/prisma-upgrade-v7/references/schema-changes.md → IMPLEMENTATION_PLAN.md
- `Tech Stack (Next16/Tailwind/Prisma7/Hardhat)` --references--> `Honychain AI blockchain security platform`  [EXTRACTED]
  agent-doc-system/docs/03-tech-stack.md → IMPLEMENTATION_PLAN.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Destructive commands requiring explicit AI agent consent** — _agents_skills_prisma_cli_references_agent_safety_agent_safety_checkpoint, _agents_skills_prisma_cli_references_migrate_reset_prisma_migrate_reset, _agents_skills_prisma_cli_references_db_push_prisma_db_push, _agents_skills_prisma_cli_references_agent_safety_consent_env_var [EXTRACTED 1.00]
- **Prisma Migrate command family** — _agents_skills_prisma_cli_references_migrate_dev_prisma_migrate_dev, _agents_skills_prisma_cli_references_migrate_deploy_prisma_migrate_deploy, _agents_skills_prisma_cli_references_migrate_diff_prisma_migrate_diff, _agents_skills_prisma_cli_references_migrate_reset_prisma_migrate_reset, _agents_skills_prisma_cli_references_migrate_resolve_prisma_migrate_resolve, _agents_skills_prisma_cli_references_migrate_status_prisma_migrate_status [INFERRED 0.95]
- **Prisma db direct database command family** — _agents_skills_prisma_cli_references_db_pull_prisma_db_pull, _agents_skills_prisma_cli_references_db_push_prisma_db_push, _agents_skills_prisma_cli_references_db_seed_prisma_db_seed, _agents_skills_prisma_cli_references_db_execute_prisma_db_execute [INFERRED 0.95]
- **Prisma Compute deploy reference corpus** — _agents_skills_prisma_compute_skill_doc, _agents_skills_prisma_compute_references_app_deploy_cli_doc, _agents_skills_prisma_compute_references_compute_config_doc, _agents_skills_prisma_compute_references_create_prisma_doc, _agents_skills_prisma_compute_references_frameworks_doc, _agents_skills_prisma_compute_references_sdk_api_doc, _agents_skills_prisma_compute_references_troubleshooting_doc [EXTRACTED 1.00]
- **Prisma SQL driver-adapter provider workflow** — _agents_skills_prisma_database_setup_skill_doc, _agents_skills_prisma_database_setup_references_postgresql_doc, _agents_skills_prisma_database_setup_references_mysql_doc, _agents_skills_prisma_database_setup_references_cockroachdb_doc, _agents_skills_prisma_database_setup_references_prisma_postgres_doc, _agents_skills_prisma_database_setup_references_prisma_client_setup_doc, _agents_skills_prisma_client_api_references_constructor_adapter_option [INFERRED 0.95]
- **MongoDB special workflow (excluded from SQL adapters)** — _agents_skills_prisma_database_setup_references_mongodb_doc, _agents_skills_prisma_database_setup_skill_mongodb_stay_v6, _agents_skills_prisma_database_setup_references_mongodb_id_requirement, _agents_skills_prisma_database_setup_skill_doc [INFERRED 0.85]
- **MongoDB upgrade decision and migration family** — agents_skills_prisma_mongodb_upgrade_skill_mongodb_upgrade_path, agents_skills_prisma_mongodb_upgrade_references_decision_stay_or_migrate_blocker_checks, agents_skills_prisma_mongodb_upgrade_references_schema_contract_mapping_contract, agents_skills_prisma_mongodb_upgrade_references_client_api_mapping_client_api_mapping, agents_skills_prisma_mongodb_upgrade_references_migrations_mapping_next_migrations, agents_skills_prisma_mongodb_upgrade_references_verify_cutover_checklist_checklist [EXTRACTED 1.00]
- **Prisma Postgres provisioning workflows** — agents_skills_prisma_postgres_setup_skill_postgres_setup, agents_skills_prisma_postgres_skill_prisma_postgres, agents_skills_prisma_postgres_references_management_api_resource_model, agents_skills_prisma_postgres_references_management_api_sdk_sdk, agents_skills_prisma_postgres_references_create_db_cli_create_db, agents_skills_prisma_postgres_references_console_and_connections_console [INFERRED 0.85]
- **Prisma driver adapter constellation** — agents_skills_prisma_upgrade_v7_references_driver_adapters_driver_adapters, agents_skills_prisma_driver_adapter_implementation_skill_sqldriveradapter, agents_skills_prisma_database_setup_references_sqlite_better_sqlite3_adapter, agents_skills_prisma_database_setup_references_sqlserver_mssql_adapter, agents_skills_prisma_postgres_setup_references_prisma7_client_instantiation [INFERRED 0.90]
- **Autonomous Honeypot Analysis Pipeline** — agent_doc_system_docs_04_listener, agent_doc_system_docs_04_orchestrator, agent_doc_system_docs_08_analysis_agent, agent_doc_system_docs_05_threatreport_model [INFERRED 0.85]
- **Prisma v7 migration knowledge** — .agents_skills_prisma_upgrade_v7_references_env_variables_env_helper, .agents_skills_prisma_upgrade_v7_references_prisma_config_defineconfig, .agents_skills_prisma_upgrade_v7_references_schema_changes_default_generator, .agents_skills_prisma_upgrade_v7_references_removed_features_client_extensions, implementation_plan_prisma7 [INFERRED 0.80]
- **Agent documentation system entry points** — agent_doc_system_agents, agent_doc_system_agent_bootstrap, agent_doc_system_claude, agent_doc_system_opencode [EXTRACTED 1.00]
- **Agent Governance & Workflow Discipline** — agent_doc_system_docs_13_development_workflow_devworkflow, agent_doc_system_docs_13_development_workflow_featureworkflow, agent_doc_system_docs_24_agent_rules_agentrules, agent_doc_system_docs_25_agent_task_planning_taskplan, agent_doc_system_docs_26_agent_self_review_selfreview, agent_doc_system_docs_27_debugging_debugging, agent_doc_system_docs_28_feature_completion_checklist_completionchecklist, agent_doc_system_docs_15_quality_assurance_releasegate [INFERRED 0.80]
- **No-Secrets Cross-Cutting Principle** — agent_doc_system_docs_16_security_securitybaseline, agent_doc_system_docs_11_code_standards_structuredlogging, agent_doc_system_docs_19_observability_rules, agent_doc_system_docs_24_agent_rules_never, agent_doc_system_docs_21_environment_configuration_envconfig [INFERRED 0.85]
- **hive-trace public visual asset set** — hive_trace_public_apple_icon, hive_trace_public_icon_dark_32x32, hive_trace_public_icon_light_32x32, hive_trace_public_icon, hive_trace_public_placeholder_logo, hive_trace_public_placeholder_logo_svg, hive_trace_public_placeholder_user, hive_trace_public_placeholder [INFERRED 0.85]
- **Next.js create-next-app default template assets** — public_file, public_globe, public_next, public_vercel, public_window [INFERRED 0.85]

## Communities (156 total, 109 thin omitted)

### Community 0 - "Honychain AI blockchain security platform"
Cohesion: 0.07
Nodes (38): Agent Bootstrap operating loop, Agent-doc-system AGENTS.md entry point, agent-doc-system Claude instructions, Project Context (template), Product Requirements (template), Project Scope (template), Hardhat 3.14 toolchain, LangChain AI provider abstraction (+30 more)

### Community 1 - "dependencies"
Cohesion: 0.05
Nodes (37): @langchain/core, @langchain/google-genai, @langchain/openai, dependencies, clsx, @langchain/core, @langchain/google-genai, @langchain/openai (+29 more)

### Community 2 - "compilerOptions"
Cohesion: 0.06
Nodes (31): artifacts, **/*.mts, test, types, compilerOptions, allowJs, esModuleInterop, incremental (+23 more)

### Community 3 - "honeypots/route.ts"
Cohesion: 0.09
Nodes (21): createHoneypotSchema, dynamic, GET(), honeypotQuerySchema, POST(), runtime, dynamic, GET() (+13 more)

### Community 4 - "devDependencies"
Cohesion: 0.06
Nodes (31): dotenv, eslint, eslint-config-next, hardhat, @nomicfoundation/hardhat-toolbox-mocha-ethers, devDependencies, dotenv, eslint (+23 more)

### Community 5 - "Prisma CLI Reference"
Cohesion: 0.16
Nodes (30): AI safety checkpoint for destructive commands, prisma complete (shell completion), prisma db execute (raw SQL), prisma db pull (introspection), MongoDB uses db push (no migrations), prisma db push (schema push), prisma db seed, prisma debug (+22 more)

### Community 6 - "orchestrator.ts"
Cohesion: 0.12
Nodes (22): AnalyzeInput, analyzeTransaction(), buildPrompt(), extractJson(), ThreatReportData, ThreatReportSchema, FetchedLog, FetchedTx (+14 more)

### Community 7 - "MongoDB Prisma upgrade path (no"
Cohesion: 0.08
Nodes (29): SqlDriverAdapter interface, v6 to Next client API mapping, Blocker checks before migrating, Next contract-driven migrations flow, Next contract model vs v6 schema, Collection storage-name addressing, Cutover verification checklist, No data moves principle (+21 more)

### Community 8 - "deployAgent.ts"
Cohesion: 0.11
Nodes (21): chooseTemplate(), deployAgent(), DeploymentRejectedError, DeployRequest, DeployResult, DeployTarget, extractJson(), fallbackTemplate() (+13 more)

### Community 9 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+19 more)

### Community 10 - "Security Baseline"
Cohesion: 0.09
Nodes (23): shadcn/ui Not Adopted for MVP, UI/UX Design System Document, Code Standards, Structured Logging Without Secrets, Prisma Singleton (src/lib/db.ts), Development Workflow (8-Stage Loop), Test Layers (Unit/Integration/Component/E2E/AI/Security/Performance), Quality Assurance Release Gate (+15 more)

### Community 11 - "dependencies"
Cohesion: 0.09
Nodes (23): @base-ui/react, class-variance-authority, dependencies, @base-ui/react, class-variance-authority, clsx, lucide-react, next (+15 more)

### Community 12 - "devDependencies"
Cohesion: 0.09
Nodes (22): devDependencies, postcss, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom, typescript (+14 more)

### Community 13 - "AppShell.tsx"
Cohesion: 0.12
Nodes (17): AppShell(), VIEWS, NAV_ITEMS, NavId, ICONS, Sidebar(), TopHeader(), ToastProvider() (+9 more)

### Community 14 - "views.tsx"
Cohesion: 0.16
Nodes (18): AGENTS, Severity, SEVERITY_COLOR, THREATS, ACTIVITY, ActivityPoint, AgentCard(), AgentRuntime() (+10 more)

### Community 15 - "hivetrace-feature-page.tsx"
Cohesion: 0.15
Nodes (3): datasets, HiveTraceFeaturePage(), Section

### Community 16 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 17 - "types.ts"
Cohesion: 0.19
Nodes (14): HoneypotList(), shortAddress(), STATUS_STYLES, formatTime(), SEVERITY_STYLES, ThreatFeed(), Honeypot, HoneypotStatus (+6 more)

### Community 18 - "Prisma Database Setup skill"
Cohesion: 0.12
Nodes (17): adapter constructor option (required for SQL workflow), create-prisma scaffolder, Prisma Compute platform, CockroachDB driver adapter (PrismaPg), CockroachDB Setup reference, MongoDB Setup reference, prisma-mongodb-upgrade skill (external, referenced), MySQL driver adapter (PrismaMariaDb) (+9 more)

### Community 19 - "mock.ts"
Cohesion: 0.12
Nodes (15): Agent, AGENT_ACTIVITY, AgentStatus, AlertItem, ALERTS, CONTRACTS, Honeypot, HONEYPOTS (+7 more)

### Community 20 - "Change Log (agent-doc-system)"
Cohesion: 0.20
Nodes (14): Change Log (agent-doc-system), Deployment permission gate (MAINNET_DEPLOY_APPROVED), Project converted to ESM, Deploy guard: localhost defaults to well-known dev account, MVP loop: detect attack → AI analysis → DB report → dashboard, Prisma CLI pinned to stable v7, Testnet keys must use Hardhat keystore (no plaintext), Decision: shadcn/ui deliberately not adopted (+6 more)

### Community 21 - "Prisma Platform CLI App Deploy"
Cohesion: 0.21
Nodes (13): Prisma Platform CLI App Deploy reference, PRISMA_SERVICE_TOKEN, Prisma Compute Config reference, create-prisma Compute Flow reference, compute:deploy generated script, CLI-first deploy model, Prisma Compute Framework Readiness reference, supported framework keys (nextjs/nuxt/astro/hono/nestjs/tanstack-start/custom/bun) (+5 more)

### Community 22 - "ui.tsx"
Cohesion: 0.17
Nodes (10): Column, DataTable(), InspectorPanel(), MetricModule(), Panel(), StateBlock(), STATUS_COLOR, Tabs() (+2 more)

### Community 23 - "hivetrace-dashboard.tsx"
Cohesion: 0.20
Nodes (4): batches, HiveTraceDashboard(), incidents, Risk

### Community 24 - "DeployWizard.tsx"
Cohesion: 0.20
Nodes (8): DEPLOY_STAGES, DeployWizard(), NETWORKS, STEPS, TEMPLATES, Modal(), useToast(), Alerts()

### Community 25 - "listener.ts"
Cohesion: 0.20
Nodes (6): BlockLike, Listener, ListenerOptions, startListener(), tick(), txsTargetingAddresses()

### Community 26 - "prisma-client default generator"
Cohesion: 0.22
Nodes (9): Removed Prisma v7 environment variables, ERR_REQUIRE_ESM troubleshooting, Generator moduleFormat field (esm/cjs), Prisma.validator (removed), prisma-client default generator, Generated entrypoints (client/browser/enums/models), output field required for prisma-client, DEC-003 Prisma driver adapter mode (+1 more)

### Community 27 - "prisma.config.ts central config file"
Cohesion: 0.25
Nodes (8): DATABASE_URL environment variable, Manual dotenv env loading, env() helper from prisma/config, defineConfig from prisma/config, datasource.directUrl, prisma.config.ts central config file, datasource.shadowDatabaseUrl, datasource url deprecation in schema

### Community 28 - "button.tsx"
Cohesion: 0.70
Nodes (3): Button(), buttonVariants, cn()

### Community 29 - "src/app/layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 31 - "DEC-006 ESM project"
Cohesion: 0.67
Nodes (3): Prisma v7 ESM-first client, DEC-001 src-dir layout, DEC-006 ESM project

### Community 32 - "Prisma Client Methods reference"
Cohesion: 1.00
Nodes (3): Prisma Client Methods reference, Raw Queries reference, Transactions reference

### Community 33 - "Filter Conditions and Operators reference"
Cohesion: 0.67
Nodes (3): Filter Conditions and Operators reference, Query Options reference, Relation Queries reference

### Community 34 - "nested writes (create/connect/upsert/disconnect/delete/set)"
Cohesion: 0.67
Nodes (3): create (and createMany/AndReturn), nested writes (create/connect/upsert/disconnect/delete/set), interactive transactions ($transaction async)

### Community 35 - "Vitest 4 Tooling (Node Env,"
Cohesion: 0.67
Nodes (3): Path Alias @/* maps to ./src/*, Vitest 4 Tooling (Node Env, .mts), DEC-006: Project Converted to ESM

### Community 36 - "Project Structure (Next.js 16 App"
Cohesion: 0.67
Nodes (3): Project Structure (Next.js 16 App Router), Feature Workflow (10 Steps), DEC-001: Use src/ Directory Layout

### Community 37 - "Testing Strategy"
Cohesion: 0.67
Nodes (3): Testing Strategy, Agent Rules (ALWAYS/NEVER/ASK), Agent Task Planning (Required Plan)

### Community 38 - "Next.js breaking-changes agent rules"
Cohesion: 0.67
Nodes (3): node_modules/next/dist/docs reference, Next.js breaking-changes agent rules, Root CLAUDE.md pointer to AGENTS.md

### Community 39 - "Available driver adapters table"
Cohesion: 0.67
Nodes (3): PrismaBetterSqlite3 driver adapter, PrismaMssql driver adapter, Available driver adapters table

## Knowledge Gaps
- **396 isolated node(s):** `eslintConfig`, `metadata`, `viewport`, `$schema`, `style` (+391 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **109 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `dependencies`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `ChatModelLike` connect `orchestrator.ts` to `deployAgent.ts`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `metadata`, `viewport` to the rest of the system?**
  _396 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Honychain AI blockchain security platform` be split into smaller, more focused modules?**
  _Cohesion score 0.07254623044096728 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._
- **Should `honeypots/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09274193548387097 - nodes in this community are weakly interconnected._