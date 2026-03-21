# LYRA — Investor-Grade Codebase Intelligence Report

---

## SECTION 1: PROJECT IDENTITY

**Project name:** Lyra (package name: `lyra-dashboard`; worker: `lyra-worker`)

**Repository URL:** `thepennylaneproject/Lyra` (GitHub; accessed via local proxy at `http://local_proxy@127.0.0.1:44017/git/thepennylaneproject/Lyra`)

**One-line description (verbatim, from `dashboard/app/layout.tsx`):**
> "Autonomous audit & patch system"

**Cleaner version:** Lyra is a multi-agent code quality operations platform that continuously audits a software portfolio against architectural expectations, surfaces findings, and routes them through a repair and verification lifecycle — all managed from a single dashboard.

**Project status:** **Alpha** — Core features are working end-to-end (import, browse, audit, Linear sync, repair queueing, orchestration, weekly cron), but the Python repair engine is not integrated with the dashboard workflow, no tests exist, and there are rough edges in multi-provider LLM routing and mobile layout.

**First commit date:** 2026-03-07
**Most recent commit date:** 2026-03-20
**Total commits:** 90 (over 13 days — extremely high velocity)

**Deployment status:** Configured and deployment-ready on **Netlify** (canonical host per README). `netlify.toml` is present with `@netlify/plugin-nextjs`. A `dashboard/vercel.json` is also present as an alternate. GitHub Actions CI (`lint → tsc → build`) runs on every push to `main/master`.

**Live URL(s):** Not discoverable in config files — `URL` and `DEPLOY_PRIME_URL` are read from Netlify runtime env vars, not hardcoded. *[NOT FOUND IN CODEBASE — must be verified externally]*

---

## SECTION 2: TECHNICAL ARCHITECTURE

### Primary Languages & Frameworks

| Layer | Language | Framework / Runtime | Version |
|---|---|---|---|
| Dashboard (web app) | TypeScript | Next.js (App Router) | 16.1.7 |
| UI | TypeScript | React | 19.0.0 |
| Worker (job processor) | TypeScript | Node.js (ESM) | — |
| Repair engine | Python 3 | Standalone CLI | — |
| Audit scripting | Python 3 | CLI (`session.py`, etc.) | — |

### Full Dependency List

**Core framework**

| Package | Version | Purpose |
|---|---|---|
| `next` | ^16.1.7 | Web framework & SSR |
| `react` / `react-dom` | ^19.0.0 | UI rendering |

**Database / storage**

| Package | Version | Purpose |
|---|---|---|
| `pg` | ^8.20.0 | Postgres connection (Supabase) |

**Queue / messaging**

| Package | Version | Purpose |
|---|---|---|
| `bullmq` | ^5.71.0 | Redis-backed job queue (dashboard side) |
| `redis` | ^5.11.0 | Redis client |
| `ioredis` | ^5.4.1 | BullMQ-required Redis client (worker) |

**Observability**

| Package | Version | Purpose |
|---|---|---|
| `@sentry/nextjs` | ^10.44.0 | Error monitoring |

**Build / DevX**

| Package | Version | Purpose |
|---|---|---|
| `tailwindcss` | ^4.0.0 | Utility CSS |
| `@tailwindcss/postcss` | ^4.2.1 | PostCSS integration |
| `typescript` | ^5.0.0 | Type-checking |
| `eslint` + `eslint-config-next` | ^9 / ^15 | Linting |

**Deployment**

| Package | Version | Purpose |
|---|---|---|
| `netlify` | ^24.3.0 | Netlify SDK |
| `@netlify/functions` | ^5.1.3 | Netlify serverless functions |

*No UI component library (e.g., Radix, shadcn, MUI) — all components are bespoke.*
*No state management library (React useState/useCallback throughout — appropriate for this scale).*
*No ORM — raw SQL via `pg` Pool.*

### Project Structure

```
Lyra/
├── dashboard/               # Next.js 16 web application (primary product)
│   ├── app/                 # App Router pages + API route handlers (29 routes)
│   │   ├── api/             # All backend endpoints
│   │   └── (page files)    # layout.tsx, page.tsx, error.tsx, global-error.tsx
│   ├── components/          # 21 bespoke React UI components
│   ├── lib/                 # Business logic, data access, types, utilities
│   ├── netlify/functions/   # Netlify scheduled function (weekly audit cron)
│   ├── middleware.ts         # API authentication gate (HMAC session + Bearer)
│   ├── tailwind.config.ts   # Tailwind (minimal config — tokens live in CSS)
│   └── package.json         # lyra-dashboard package
├── worker/                  # Node.js audit job processor
│   └── src/                 # index.ts (BullMQ/poll), process-job.ts, llm.ts, db.ts, context.ts, manifest.ts
├── repair_engine/           # Python autonomous code-repair CLI (Qdrant + Docker)
│   └── providers/           # aimlapi, anthropic, gemini client adapters
├── supabase/
│   └── migrations/          # 10 SQL migration files (Supabase/Postgres schema)
├── audits/                  # Audit system: prompts, findings, scripts, routing config
│   ├── prompts/             # 20 agent prompt contracts (audit, visual, UX, etc.)
│   ├── cursor-rules/        # Cursor IDE context injections
│   ├── open_findings.json   # Canonical finding state (flat file fallback)
│   └── schema/              # JSON Schema for audit output
├── the_penny_lane_project/  # Codebase intelligence snapshots for all 11 portfolio apps
├── expectations/            # Per-app architectural expectation documents
├── docs/                    # Architecture docs, voice guide, dashboard guide
├── atlas/                   # ATLAS visual audit agent prompts and protocol
├── lyra_logo_pack/          # 9 production SVG logo assets
├── portfolio.json           # Portfolio app registry (name → local path)
├── netlify.toml             # Netlify build config (base: dashboard/)
└── README.md                # Comprehensive operator documentation
```

### Architecture Pattern

**Monolith (Next.js) + Async Worker + Standalone Repair Engine**

Data flow:
1. **User** opens the dashboard (Netlify-hosted Next.js SPA)
2. **Auth gate** (middleware.ts): HMAC cookie from login screen OR `Authorization: Bearer` header
3. **Project data** is read/written to `lyra_projects` (Supabase Postgres) via `pg` Pool
4. **Audit job** is enqueued into `lyra_audit_jobs` (DB row) and optionally pushed to BullMQ Redis queue via `POST /api/orchestration/jobs`
5. **Worker** (`worker/`) polls DB or listens to BullMQ, claims job, walks the repo filesystem by domain, samples code chunks, calls OpenAI API with audit prompt, parses JSON findings, merges into project, writes back to `lyra_projects`
6. **Findings** surface in dashboard via `GET /api/projects/[name]`
7. **Linear sync**: findings are pushed as issues via Linear GraphQL API; status bidirectionally mapped
8. **Repair queue**: intent recorded in `lyra_repair_jobs`; actual patch application is manual or via the standalone Python repair engine (not wired to the dashboard job queue)
9. **Weekly cron**: Netlify function `enqueue-weekly-audit.ts` fires Monday 09:00 UTC → calls `POST /api/orchestration/jobs`

### Database / Storage Layer

**Supabase Postgres** — 10 migration files

| Table | Key Columns | Purpose |
|---|---|---|
| `lyra_projects` | `name` (PK), `repository_url`, `project_json` (jsonb), `updated_at` | All project data + findings stored as JSONB blob |
| `lyra_audit_jobs` | `id` (UUID), `job_type`, `project_name`, `status` (queued/running/completed/failed), `payload`, `error`, `created_at`, `started_at`, `finished_at` | Job queue (BullMQ or DB poll) |
| `lyra_audit_runs` | `id` (UUID), `job_id` (FK), `job_type`, `project_name`, `status`, `summary`, `findings_added`, `payload` | Completed audit run summaries |
| `lyra_linear_sync` | `project_name` (PK), `state` (jsonb `{mappings, last_sync}`) | Linear issue ↔ finding ID mappings per project |
| `lyra_maintenance_backlog` | `id`, `project_name` (FK), `title`, `canonical_status`, `source_type`, `priority`, `severity`, `risk_class`, `next_action`, `finding_ids` | Normalized maintenance backlog |
| `lyra_maintenance_tasks` | `id`, `project_name` (FK), `backlog_id` (FK), `title`, `intended_outcome`, `status`, `target_domains`, `target_files`, `risk_class`, `verification_profile` | Bounded execution plans |
| `lyra_repair_jobs` | `id`, `finding_id`, `project_name`, `status`, `patch_applied`, `cost_usd`, `maintenance_task_id`, `backlog_id`, `provenance` | Repair intent queue |
| `lyra_orchestration_events` | (env-configured, likely: event_type, project_name, source, summary) | Durable event log |
| `lyra_project_snapshots` | (env-configured, likely: project_name, snapshot JSONB, timestamp) | Project state history snapshots |

*Note: `lyra_repair_jobs` schema inferred from migration ALTER statements + `lib/types.ts`; direct CREATE not found in reviewed migrations.*

RLS enabled on: `lyra_linear_sync`. Dashboard uses service-role `DATABASE_URL` (bypasses RLS). Full RLS migration file exists (`20260319120000_lyra_rls.sql`).

### API Endpoints

| Route | Method | Purpose | Auth Required |
|---|---|---|---|
| `/api/health` | GET | Uptime check — public | **No** |
| `/api/auth/login` | POST | Issue HMAC session cookie | **No** |
| `/api/auth/logout` | POST | Clear session cookie | Yes |
| `/api/projects` | GET | List all projects | Yes |
| `/api/projects` | POST | Create project | Yes |
| `/api/projects/[name]` | GET | Get project + findings | Yes |
| `/api/projects/[name]` | PUT/PATCH | Update project | Yes |
| `/api/projects/[name]` | DELETE | Remove project | Yes |
| `/api/projects/[name]/findings` | GET | List findings | Yes |
| `/api/projects/[name]/findings` | POST | Add finding | Yes |
| `/api/projects/[name]/findings/[findingId]` | PATCH | Update finding status | Yes |
| `/api/projects/[name]/maintenance` | GET/POST | Maintenance backlog | Yes |
| `/api/projects/[name]/manifest` | GET | Project manifest | Yes |
| `/api/projects/[name]/onboarding` | GET/POST | Onboarding state | Yes |
| `/api/import` | POST | Import/merge open_findings.json | Yes |
| `/api/onboarding` | POST | Onboard from repo URL | Yes |
| `/api/engine/queue` | GET | List repair queue | Yes |
| `/api/engine/queue` | POST | Queue a repair job | Yes |
| `/api/engine/status` | GET | Engine status summary | Yes |
| `/api/engine/routing` | GET | Current routing config | Yes |
| `/api/orchestration` | GET | Portfolio orchestration state | Yes |
| `/api/orchestration/jobs` | GET/POST | List/enqueue audit jobs | Yes |
| `/api/orchestration/queue/clear` | POST | Clear audit job queue | Yes |
| `/api/orchestration/runs` | GET | Audit run history | Yes |
| `/api/sync/audit` | POST | Sync audit data from filesystem | Yes |
| `/api/sync/linear/status` | GET | Linear connection status | Yes |
| `/api/sync/linear/push` | POST | Push findings → Linear | Yes |
| `/api/sync/linear/pull` | POST | Pull Linear status → findings | Yes |
| `/api/durable-state` | GET | Durable event log | Yes |
| `/api/bulk-operations/linear-sync` | POST | Sync selected findings to Linear | Yes |
| `/api/bulk-operations/linear-sync-all` | POST | Sync all findings to Linear | Yes |
| `/api/bulk-operations/repair-queue` | POST | Bulk queue findings for repair | Yes |
| `/api/bulk-operations/clear-jobs` | POST | Clear all audit jobs | Yes |
| `/api/bulk-operations/clear-runs` | POST | Clear all audit runs | Yes |

### External Service Integrations

| Service | Integration Method | Purpose |
|---|---|---|
| **Supabase / Postgres** | `pg` Pool (DATABASE_URL) | Primary data store for all project + finding data |
| **OpenAI** | REST API (OPENAI_API_KEY) | LLM for audit analysis (gpt-4o-mini default) and synthesis summaries |
| **Linear** | GraphQL API (LINEAR_API_KEY) | Two-way sync of findings → issues; status bidirectional mapping |
| **Sentry** | `@sentry/nextjs` (SENTRY_DSN) | Error monitoring, dashboard + edge + server |
| **Redis** | `bullmq` / `redis` (REDIS_URL) | Optional job queue (falls back to DB polling if absent) |
| **Anthropic, Gemini, HuggingFace, aimlapi** | Configured in routing config | Intended for multi-provider routing; **currently only OpenAI is used in the worker** |

### AI/ML Components

| Component | Location | Provider | Purpose |
|---|---|---|---|
| **Audit LLM** | `worker/src/llm.ts` | OpenAI (OPENAI_API_KEY) | Reads sampled code, outputs structured finding JSON |
| **Synthesizer** | `worker/src/process-job.ts:runSynthesize()` | OpenAI (gpt-4o-mini) | Summarizes portfolio-wide audit themes in 2 paragraphs |
| **Multi-provider router** | `dashboard/lib/routing-config.ts` | Configured (5 providers) | Routes 6 task types (classifier, bulk_transform, patch_generator, critic, arbiter, batch_reasoning) to appropriate model |
| **Python repair engine** | `repair_engine/` | aimlapi, Anthropic, Gemini | Autonomous patch generation with Qdrant memory + Docker evaluation — **standalone, not integrated with dashboard** |
| **ATLAS visual agent** | `atlas/` | Prompt contracts | Visual/design audit protocol — prompts only, no code execution |

**Prompts architecture:** The worker loads `core_system_prompt.md` (root) + `audits/prompts/audit-agent.md` at runtime. Prompts instruct the LLM to return a specific JSON schema (`audit-output.schema.json`). The worker parses `findings[]` and `coverage{}` from LLM output. 20 specialized agent prompts exist in `audits/prompts/` covering logic, data, UX, performance, security, deploy, visual, and synthesis.

### Authentication and Authorization

- **Login mechanism:** Single shared secret stored in `DASHBOARD_API_SECRET` or `ORCHESTRATION_ENQUEUE_SECRET` env var. No username/password, no OAuth.
- **Browser session:** Password entry → server signs HMAC-SHA256 `lyra|{expiry}` token → HttpOnly cookie (`lyra_auth`) with 30-day TTL
- **API clients:** `Authorization: Bearer <secret>` or `x-lyra-api-secret` header
- **Public routes:** `GET /api/health`, `POST /api/auth/login` only
- **Authorization levels:** One level — either authenticated or not. No roles, no per-project access control.
- **Auth bypass (no secret set):** If neither env var is set, middleware passes all requests through — intentional local-dev behavior.

### Environment Variables

**Database:**
`DATABASE_URL`, `LYRA_DATABASE_URL`, `LYRA_SUPABASE_URL`, `LYRA_POSTGRES_SCHEMA`, `LYRA_POSTGRES_EVENTS_TABLE`, `LYRA_POSTGRES_SNAPSHOTS_TABLE`, `PG_POOL_MAX`

**Auth:**
`DASHBOARD_API_SECRET`, `ORCHESTRATION_ENQUEUE_SECRET`

**Queue:**
`REDIS_URL`, `LYRA_REDIS_URL`

**Linear:**
`LINEAR_API_KEY`, `LINEAR_TEAM_ID`, `LINEAR_LABEL_ID`, `LINEAR_PROJECT_ID`, `LINEAR_PROJECT_ID_[PROJECTNAME]`

**AI / Models:**
`OPENAI_API_KEY`, `LYRA_AUDIT_MODEL`, `LYRA_ROUTING_CONFIG`, `LYRA_ROUTING_STRATEGY`, `LYRA_AIMLAPI_NANO_MODEL`, `LYRA_AIMLAPI_CHEAP_MODEL`, `LYRA_AIMLAPI_MID_MODEL`, `LYRA_AIMLAPI_EXPENSIVE_MODEL`, `LYRA_HF_NANO_MODEL`, `LYRA_OPENAI_MINI_MODEL`, `LYRA_OPENAI_BALANCED_MODEL`, `LYRA_ANTHROPIC_HAIKU_MODEL`, `LYRA_ANTHROPIC_SONNET_MODEL`, `LYRA_ANTHROPIC_OPUS_MODEL`, `LYRA_GEMINI_FLASH_MODEL`, `LYRA_GEMINI_PRO_MODEL`

**Worker:**
`LYRA_REPO_ROOT`, `LYRA_JOB_POLL_MS`, `LYRA_JOB_POLL_IDLE_MS`, `LYRA_MAX_FILES_PER_PASS`, `LYRA_MAX_CHARS_PER_FILE`

**Observability:**
`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`

**Filesystem:**
`LYRA_DASHBOARD_DATA_DIR`, `LYRA_AUDIT_DIR`

---

## SECTION 3: FEATURE INVENTORY

| Feature | User-facing Description | Completeness | Key Files | Dependencies |
|---|---|---|---|---|
| **Portfolio overview** | View all 11 projects as cards with aggregate metrics (findings, blockers, active, resolved, backlog) | **Polished** | `app/page.tsx`, `components/ProjectCard.tsx`, `components/MetricCard.tsx`, `components/Shell.tsx` | Projects API |
| **Project view / finding browser** | Browse findings by status (active/pending/resolved/all), search by title/ID/category, update status | **Polished** | `components/ProjectView.tsx`, `components/FindingRow.tsx`, `components/FindingDetail.tsx` | Projects API |
| **Finding detail panel** | View proof hooks, suggested fixes, affected files, effort estimate, history | **Functional** | `components/FindingDetail.tsx`, `lib/types.ts` | Finding data |
| **Import / Onboard project** | Import `open_findings.json` or onboard from git URL / local path | **Functional** | `components/ImportModal.tsx`, `app/api/import/route.ts`, `app/api/onboarding/route.ts` | Postgres store |
| **Linear sync** | Push findings to Linear as issues with severity prefix; pull status updates back | **Functional** | `components/LinearSync.tsx`, `lib/linear.ts`, `app/api/sync/linear/` | LINEAR_API_KEY, LINEAR_TEAM_ID |
| **Bulk actions** | Sync all findings to Linear, bulk queue repairs, clear jobs/runs | **Functional** | `components/BulkActionsPanel.tsx`, `app/api/bulk-operations/` | Linear, Postgres |
| **Repair queue (engine view)** | Queue individual findings for repair; track status (queued/running/completed/failed) | **Functional** | `components/EngineView.tsx`, `components/EnginePanel.tsx`, `app/api/engine/` | lyra_repair_jobs |
| **Orchestration panel** | View recent audit jobs + runs; enqueue audits; see per-project recommended action | **Functional** | `components/OrchestrationPanel.tsx`, `app/api/orchestration/`, `lib/orchestration.ts` | lyra_audit_jobs, lyra_audit_runs |
| **Audit history** | Per-project list of completed audit runs with summary, findings added, coverage | **Functional** | `components/ProjectAuditHistory.tsx`, `app/api/orchestration/runs/route.ts` | lyra_audit_runs |
| **Maintenance backlog** | Normalized backlog surfacing items across findings, scanner imports, manual entries | **Partial** | `components/MaintenancePanel.tsx`, `lib/maintenance-backlog.ts`, `app/api/projects/[name]/maintenance/` | lyra_maintenance_backlog |
| **Onboarding review panel** | Review and approve AI-generated project profile and expectations before activating | **Partial** | `components/OnboardingReviewPanel.tsx`, `lib/onboarding.ts`, `app/api/projects/[name]/onboarding/` | Worker + AI |
| **Multi-provider LLM routing** | Route audit tasks to different AI models by cost tier; configurable strategy (aggressive/balanced/precision) | **Partial** | `lib/routing-config.ts`, `audits/routing_config.json`, `app/api/engine/routing/route.ts` | Multiple AI providers |
| **Weekly auto-audit (cron)** | Netlify function fires Monday 09:00 UTC; enqueues `weekly_audit` job | **Functional** | `netlify/functions/enqueue-weekly-audit.ts` | ORCHESTRATION_ENQUEUE_SECRET, worker |
| **Pattern intelligence panel** | Cross-project pattern analysis surfaced from findings data | **Functional** | `components/PatternPanel.tsx` | All project findings |
| **Next action card** | Single "do this next" action across the whole portfolio, ranked by priority + severity | **Functional** | `components/NextActionCard.tsx`, `lib/constants.ts` | Maintenance backlog |
| **Python repair engine** | Autonomous code patching with Qdrant vector memory, Docker evaluation, multi-provider LLM | **Scaffolded** | `repair_engine/orchestrator.py`, `repair_engine/apply.py`, `repair_engine/providers/` | Qdrant, Docker, aimlapi/Anthropic |
| **ATLAS visual audit** | Narrative + cohesion scoring for visual design across portfolio | **Scaffolded** | `atlas/ATLAS_AGENT_PROMPT.md`, `atlas/ATLAS_AUDIT_PROTOCOL.md` | External agent execution |
| **Auth / login screen** | Password-protected dashboard with session management | **Polished** | `components/DashboardLogin.tsx`, `middleware.ts`, `lib/auth-session.ts` | DASHBOARD_API_SECRET |
| **Export findings** | Download project findings as `open_findings.json` | **Functional** | `app/page.tsx:handleExport()` | Browser Blob API |

---

## SECTION 4: DESIGN SYSTEM & BRAND

### Color Palette

| Token | Light Mode | Dark Mode | Defined In |
|---|---|---|---|
| `--ink-bg` | `#F7F5F0` (warm off-white) | `#0E0D0B` (near black) | `globals.css` |
| `--ink-bg-raised` | `#EFEDE6` | `#161512` | `globals.css` |
| `--ink-bg-sunken` | `#EAE8E2` | `#1C1B18` | `globals.css` |
| `--ink-border` | `#DDD9CF` | `#2E2C28` | `globals.css` |
| `--ink-border-faint` | `#E6E3DB` | `#242320` | `globals.css` |
| `--ink-text` | `#1A1916` | `#E8E5DF` | `globals.css` |
| `--ink-text-2` | `#4A4844` | `#ABA89F` | `globals.css` |
| `--ink-text-3` | `#7A7772` | `#706E68` | `globals.css` |
| `--ink-text-4` | `#A8A5A0` | `#4A4844` | `globals.css` |
| `--ink-red` | `#9B3A3A` | `#C47070` | `globals.css` |
| `--ink-amber` | `#8A6320` | `#C49B55` | `globals.css` |
| `--ink-blue` | `#2E5C8A` | `#7AAAD4` | `globals.css` |
| `--ink-green` | `#2D6B4A` | `#6DAE8A` | `globals.css` |
| `--ink-gray` | `#6B6965` | `#706E68` | `globals.css` |

Tailwind config is essentially a passthrough — all tokens are CSS custom properties in `globals.css`, not Tailwind theme extensions. This is intentional (full design token control without Tailwind coupling).

### Typography

| Font | Role | Loading |
|---|---|---|
| **Inter** | Primary UI sans-serif — all body, labels, buttons | Google Fonts (Next.js `next/font/google`) |
| **DM Serif Display** | Decorative serif — wordmark "Lyra" in sidebar | Google Fonts |
| **JetBrains Mono** | Monospace — IDs, metadata, code, timestamps, filter labels | Google Fonts |

Base font size: `14px` (HTML root). Line height: `1.6`. Headings: `font-weight: 500`. All optimized with `antialiased`.

### Component Library

All bespoke — no external component library. 21 components:

| Component | Description |
|---|---|
| `Shell` | App shell with sticky sidebar, agent status dots, nav, sync button |
| `DashboardLogin` | Password unlock screen with session management |
| `ProjectCard` | Project summary card with finding count badges |
| `ProjectView` | Full project findings view with filter/search/sort |
| `FindingRow` | Single finding row with severity badge, status selector, queue button |
| `FindingDetail` | Expanded finding with proof hooks, suggested fix, repair policy |
| `MetricCard` | Numeric stat card (projects, findings, blockers, etc.) |
| `Badge` | Colored status/severity pill |
| `ProgressBar` | Resolution progress bar |
| `EmptyState` | Zero-state placeholder with icon, message, optional action |
| `ImportModal` | Modal for importing findings JSON or onboarding a repo URL |
| `LinearSync` | Linear connection status + push/pull controls |
| `BulkActionsPanel` | Bulk operations (sync all, clear, queue repairs) |
| `EngineView` | Repair queue browser with job status |
| `EnginePanel` | Engine status summary card |
| `OrchestrationPanel` | Audit job queue + run history summary |
| `MaintenancePanel` | Maintenance backlog viewer |
| `NextActionCard` | Hero card for highest-priority next action |
| `PatternPanel` | Cross-project finding pattern intelligence |
| `ProjectAuditHistory` | Per-project recent audit run history |
| `OnboardingReviewPanel` | AI-generated profile/expectations review |

### Design Language

**Editorial + operational minimal.** Warm parchment palette (ink on paper metaphor — the name "ink" tokens makes this explicit). Muted, desaturated accent colors — nothing loud. Typography layers three purpose-built fonts. Hairline borders (`0.5px`). Small, tight radii (4–10px). Monospace used liberally for technical data. The result reads as a premium internal tool — closer to Linear or Vercel than a typical SaaS dashboard. Highly deliberate.

### Responsive Strategy

Desktop-first. Fixed `196px` sidebar with `position: sticky`. Content max-width `800px`. No explicit mobile breakpoints observed. This is appropriate for an operator tool — the likely user is always on desktop.

### Dark Mode

**Fully implemented** via CSS `@media (prefers-color-scheme: dark)` on `:root`. All 14 design tokens are dark-mode-remapped. System preference respected automatically — no toggle required.

### Brand Assets

```
lyra_logo_pack/
  lyra-favicon-32.svg
  lyra-icon-color.svg
  lyra-icon-light-on-dark.svg
  lyra-icon-mono-dark.svg
  lyra-icon-mono-white.svg
  lyra-lockup-horizontal-dark.svg
  lyra-lockup-horizontal.svg
  lyra-lockup-penny-lane.svg
  lyra-lockup-stacked-mono.svg
  lyra-lockup-stacked.svg
  lyra-lockup-with-subtitle.svg
```

9 SVG files, production-quality — favicon, color icon, mono variants, horizontal and stacked lockups, co-brand lockup with The Penny Lane Project. Fully ready for marketing use.

---

## SECTION 5: DATA & SCALE SIGNALS

### User Model

Single operator design (Sarah Sahl / The Penny Lane Project). No user accounts, no per-user data. The "user" is the authenticated operator who manages the 11-application portfolio. User journey: unlock dashboard → import/onboard projects → review findings → queue repairs → trigger audits → verify fixes.

### Content / Data Volume

- 11 portfolio applications tracked
- `portfolio.json` defines 11 project paths
- `open_findings.json` (root) is the canonical flat-file state (fallback when Postgres absent)
- The worker processes code in chunks of 8 files per LLM pass, capped at configurable `max_chars_per_file`
- No explicit scale limits beyond Supabase connection pooling (`PG_POOL_MAX` default 5)
- System is clearly designed for small-team / single-operator scale, not for multi-tenant SaaS at this stage

### Performance Considerations

- **DB connection pool:** Shared singleton pool (max 5) to respect Supabase session pooler limits
- **Worker concurrency:** 1 (single job at a time via BullMQ)
- **Code context sampling:** Worker reads files in domain-chunked 8-file passes, not whole-repo scans
- **File-based fallback:** `store-json.ts` and `store-memory.ts` exist as DB-free alternatives (local dev)
- **Netlify cron:** Weekly trigger avoids always-on worker cost
- No client-side pagination or lazy loading in the UI — projects list loaded in full on mount
- No `React.memo`, `useMemo`, or code splitting beyond Next.js defaults

### Analytics / Tracking

- **Sentry** for error monitoring (configured via `SENTRY_DSN`)
- `instrumentation.ts` + `instrumentation-client.ts` for Sentry initialization
- **No product analytics** (no GA, Segment, Mixpanel, PostHog, or equivalent) — *[NOT FOUND IN CODEBASE]*
- Decision history is recorded per-project (`decisionHistory[]` array in project JSONB) — internal audit trail only

### Error Handling

- `app/error.tsx` and `app/global-error.tsx` — Next.js error boundaries
- Sentry captures uncaught errors on server, edge, and client
- API routes: consistent try/catch → `{ error: string }` JSON responses with appropriate HTTP status codes
- UI: inline error messages with dismiss (`×`) and retry buttons on all data-fetching operations
- Worker: unhandled job errors are caught and written back to `lyra_audit_jobs` with `status: 'failed'`

### Testing

**Zero test files found.** CI runs: `npm run lint` → `tsc --noEmit` → `npm run build`. No unit tests, no integration tests, no E2E tests. This is the most significant code maturity gap.

---

## SECTION 6: MONETIZATION & BUSINESS LOGIC

**None present.** Lyra is currently an internal operator tool — there is no pricing logic, plan definitions, feature gating, payment integration, subscription logic, trial periods, usage credits, or rate limiting by customer tier in the codebase. *[NOT FOUND IN CODEBASE]*

The only "limits" present are operational: Supabase connection pool max (`PG_POOL_MAX=5`), LLM cost caps in routing config (`max_cost_per_task: 0.02–0.25`), and file/char caps on code context sampling.

---

## SECTION 7: CODE QUALITY & MATURITY SIGNALS

### Code Organization

Excellent separation of concerns:
- `lib/` — pure business logic (no React imports): repository interface, Linear client, orchestration state machine, routing config, type definitions, auth utilities
- `components/` — pure UI (no direct DB calls)
- `app/api/` — thin API handlers that delegate to `lib/`
- `worker/src/` — independent Node.js process with its own DB client and LLM adapter

The repository pattern (`ProjectsRepository` interface in `lib/repository.ts`) with three implementations (`store-json.ts`, `store-memory.ts`, `store-supabase.ts`) and a factory (`repository-instance.ts`) is textbook clean architecture.

### Patterns and Conventions

- **Repository pattern** (data access abstraction)
- **Factory pattern** (repository instance, pool singleton)
- **Strategy pattern** (routing config: aggressive/balanced/precision)
- **State machine** (orchestration stages: onboarding → visual_audit_missing → audit_due → repair_in_progress → current)
- **Guard clauses** (early returns, `isSafeIdent` validation)
- TypeScript strict mode; no `any` types observed in reviewed files
- Naming: camelCase variables, PascalCase components, kebab-case filenames — consistent throughout

### Documentation

- `README.md`: Comprehensive (110 lines) — architecture, deploy, auth, database, worker, cron, audit system all documented
- `docs/DASHBOARD.md`: Day-to-day workflow guide
- `docs/VOICE.md`: UI copy conventions
- `docs/LYRA_NEAR_TERM_THEMES.md`: Near-term priorities
- `audits/` directory: 20 agent prompts + README + workflow guide + repair engine guide + portfolio guide
- Inline comments: present and targeted (SQL quirks, workaround explanations, security notes)
- JSDoc: absent (not needed at this scale)

### TypeScript Usage

Strict — explicit interfaces for all domain entities (`lib/types.ts` is 409 lines of well-typed models). Union types for state machines. Generic type parameters where needed. No `any` observed. Return types on all public functions. The `quoteIdent()` SQL safety function even throws typed errors.

### Error Handling Patterns

Consistent `try/catch` in all API routes and async components. Worker has nested try/catch to ensure failed jobs are always marked as failed even if the failure-marking itself throws. UI has per-operation error state with user-visible messages and retry affordances.

### Git Hygiene

- 90 commits in 13 days — very high velocity
- Mix of `feat:`, `fix:`, `refactor:`, `docs:`, `chore:` prefixes — conventional commits
- PRs from branch → main via GitHub (21 merged PRs visible)
- Both Copilot and Claude Code contributed branches (visible in branch names)
- Commit messages reference specific bug IDs (QA-001 through QA-008, ARCH-001 through ARCH-017, DATA-001 through DATA-011)
- `Initial plan` commits throughout — artifacts of AI agent planning steps

### Technical Debt Flags

| Flag | Location | Nature |
|---|---|---|
| Worker only uses OpenAI | `worker/src/llm.ts` | Multi-provider routing config exists but LLM execution ignores it |
| Python repair engine disconnected | `repair_engine/` | No API bridge to dashboard job system |
| ATLAS visual agent | `atlas/` | Prompt contracts only, no executable integration |
| `confirm()` for destructive UI | `app/page.tsx:190` | Native browser dialog — not accessible/stylable |
| `lyra-dashboard.jsx` in repo root | Root | Old single-file JSX prototype — likely orphaned |
| `Untitled` file in dashboard/ | `dashboard/Untitled` | Orphaned scratch file |
| Worker `OPENAI_API_KEY` hardcoded path | `worker/src/llm.ts:53` | Should use routing config like dashboard does |
| No migration for `lyra_repair_jobs` CREATE | `supabase/migrations/` | Only ALTER statements found; CREATE not in reviewed migrations |

### Security Posture

- **SQL injection:** Protected — parameterized queries throughout; `isSafeIdent()` validates table/schema names; `quoteIdent()` wraps identifiers
- **Auth:** HMAC-SHA256 session cookie — homegrown but correctly implemented (time-safe comparison, expiry check). Single secret is a limitation.
- **Secrets:** All via env vars, never in code; `.gitignore` present; security cleanup commit in history
- **XSS:** Next.js escapes JSX by default; no `dangerouslySetInnerHTML` observed
- **CORS:** Default Next.js behavior — no custom CORS config seen. Worth reviewing for production.
- **Input validation:** Finding IDs and project names URL-encoded in API calls; identifier sanitization in DB layer
- **Auth bypass risk:** If `DASHBOARD_API_SECRET` is unset, all API routes are public — documented but needs operator awareness

---

## SECTION 8: ECOSYSTEM CONNECTIONS

### Shared Code / Patterns with Portfolio

Lyra is the **hub** for the entire Penny Lane Project portfolio. The codebase explicitly hardcodes all 11 portfolio apps:

```typescript
// worker/src/process-job.ts
const PORTFOLIO_SCAN_DIRS: Record<string, string> = {
  Advocera: "the_penny_lane_project/Advocera",
  Codra: "the_penny_lane_project/Codra",
  FounderOS: "the_penny_lane_project/FounderOS",
  Mythos: "the_penny_lane_project/Mythos",
  Passagr: "the_penny_lane_project/Passagr",
  Relevnt: "the_penny_lane_project/Relevnt",
  embr: "the_penny_lane_project/embr",
  ready: "the_penny_lane_project/ready",
  Dashboard: "the_penny_lane_project/dashboard",
  "Restoration Project": "the_penny_lane_project/restoration-project",
  "sarahsahl.pro": "the_penny_lane_project/sarahsahl_pro",
};
```

### Shared Infrastructure

- `the_penny_lane_project/` directory: Contains codebase intelligence snapshots (markdown docs) for all 11 apps — Advocera, Codra, FounderOS, Mythos, Passagr, Relevnt, embr, ready, Dashboard, restoration-project, sarahsahl_pro
- `expectations/` directory: One architectural expectations document per app (10 files found)
- `portfolio.json`: Maps all 11 apps to local filesystem paths (Sarah's Desktop on macOS)
- **Shared Supabase instance** implied — one `DATABASE_URL` governs all `lyra_*` tables
- **Shared Linear workspace** implied — `LINEAR_TEAM_ID` is a single value; per-project overrides via `LINEAR_PROJECT_ID_[PROJECTNAME]` env vars
- `portfolio.py`, `linear_sync.py`, `batch_fix.py`, `bootstrap_portfolio.sh` — Python utility scripts that operate across the full portfolio

### Data Connections

The audit worker directly reads the filesystem of sister repos (via `localPath` or `portfolio_mirror` source type). Findings from all 11 apps flow into the same Supabase `lyra_projects` table. Linear sync writes to a single Linear team. This is a unified operational data layer across the portfolio.

### Cross-references

Lyra explicitly cites Relevnt, Codra, Ready, Mythos, Passagr, Advocera, embr, and the personal projects in README, expectations docs, and worker code. `expectations/relevnt-expectations.md`, `expectations/codra-expectations.md`, etc. are all present. Lyra is architecturally aware of and designed to serve the full portfolio.

---

## SECTION 9: WHAT'S MISSING (CRITICAL)

### Gaps for a Production-Ready Product

1. **No test coverage.** Zero test files. For a system that modifies code, queues repairs, and tracks findings across a portfolio, this is the highest-severity gap. Any regression in the merge logic, auth middleware, or Linear sync would be invisible until user-reported.
2. **Worker is not containerized.** No `Dockerfile` for the worker process. Deploying the worker requires manual setup of Node.js environment, env vars, and process management. Not production-grade without a container or a managed process host.
3. **Python repair engine is disconnected.** The most ambitious architectural component — autonomous code patching with vector memory and Docker evaluation — has no API integration with the dashboard. It's a standalone CLI that must be run manually. The dashboard's "queue repair" records intent but triggers nothing.
4. **Single-secret auth** is too limited for any shared or team use. No OAuth, no per-user sessions, no audit trail of who did what.
5. **No mobile responsiveness.** Fixed sidebar layout breaks on small screens. Not a blocker for a single-operator tool, but relevant for any productization.

### Gaps for Investor Readiness

1. **No analytics.** No product metrics — no usage events, session counts, feature adoption, or cohort data. An investor would expect to see "N projects audited, M findings resolved, K repairs queued" as measured business metrics.
2. **No monetization or pricing model.** There is no plan, no feature gate, no billing. This is entirely an internal tool.
3. **No test coverage.** Signals early-stage engineering to investors.
4. **The product → customer thesis is unstated in the code.** Lyra is clearly excellent internal infrastructure, but how it becomes a product (SaaS, open source, or tool for hire) is not defined anywhere in the codebase.

### Gaps in the Codebase Itself

1. **`lyra-dashboard.jsx` in repo root** — Old single-file React prototype; appears orphaned. Not imported anywhere.
2. **`dashboard/Untitled`** — Empty scratch file committed to the repo.
3. **`lyra_repair_jobs` CREATE migration not found** — ALTER statements reference it but the CREATE TABLE was not found in the reviewed migration files. Needs verification.
4. **No `lyra_orchestration_events` or `lyra_project_snapshots` CREATE migrations found** — Referenced in env vars and code, but schema not found in reviewed migrations.
5. **Worker uses only OpenAI despite multi-provider routing config** — The routing config UI and `routing-config.ts` are well-built, but `worker/src/llm.ts` ignores them and reads only `OPENAI_API_KEY` directly.
6. **`portfolio.json` contains hardcoded macOS Desktop paths** — Local development artifact that would fail in any CI/CD context.

### Recommended Next Steps (Priority Order)

1. **Add tests** — Start with the finding merge logic (`mergeFindings2`), auth middleware session verification, and Linear sync mapping. These are the highest-consequence code paths with no coverage.
2. **Containerize the worker** — Write a `Dockerfile` for `worker/`. This unblocks consistent deployment and removes "works on my machine" risk.
3. **Wire the repair engine to the dashboard** — Create a POST endpoint that the Python engine calls on completion, so `lyra_repair_jobs` rows get updated and findings move to `fixed_pending_verify` automatically. This closes the most visible gap in the workflow.
4. **Add product analytics** — Instrument with PostHog or Segment. Track: audits run, findings surfaced, findings resolved, Linear syncs, repairs queued. These are the metrics that demonstrate product value.
5. **Create the remaining database migrations** — Ensure `lyra_orchestration_events`, `lyra_project_snapshots`, and `lyra_repair_jobs` (CREATE TABLE) are all accounted for in `supabase/migrations/` so the schema is fully reproducible.

---

## SECTION 10: EXECUTIVE SUMMARY

**What this is and what problem it solves.** Lyra is an autonomous code quality operations platform built by Sarah Sahl to manage technical debt and architectural integrity across a portfolio of 11 actively developed applications. The problem it addresses is real and underserved: as a solo builder maintaining a growing portfolio of TypeScript and Python applications, tracking which projects have bugs, which need re-auditing, which findings have been fixed, and which issues have been synced to Linear becomes unmanageable without tooling. Lyra solves this by ingesting LLM-generated audit findings into a structured data model, surfacing them in a polished dashboard, routing them to a job queue for automated re-audit, and syncing with Linear for engineering workflow integration — all with a weekly cron that keeps the portfolio continuously assessed.

**Technical credibility.** What's been built in 13 days is substantial: a Next.js 16 / React 19 web application with 29 API endpoints, a TypeScript worker with BullMQ/DB-poll dual-mode job processing, 10 Supabase migrations defining a coherent schema with proper RLS and foreign keys, a multi-provider LLM routing system spanning OpenAI, Anthropic, Gemini, and open-source models, a fully spec'd Python repair engine with Qdrant vector memory, a Netlify-deployed scheduled audit cron, Sentry error monitoring, and a bespoke design system with full dark mode that reads like a professional developer product. The architecture is clean — repository pattern, single-instance DB pool, clear separation between UI components, business logic, and data access. TypeScript is strict throughout. The commit history (90 commits, 21 PRs) shows rapid iteration with disciplined PR-based workflow. The builder clearly understands production infrastructure: they hardened auth, sanitized SQL identifiers, wrote RLS policies, and documented the full operational workflow.

**Honest assessment of current state.** Lyra is a genuine alpha-stage product: core workflows run end-to-end (import → audit → view → sync → queue), the UX is deliberately polished, and the infrastructure is correctly architected. The critical gaps are the absence of any test coverage, the Python repair engine's disconnection from the dashboard workflow (the most compelling feature is not yet integrated), and the absence of analytics or monetization thinking. Reaching a credible beta milestone would require: (1) test coverage for the finding merge logic and auth middleware, (2) containerizing the worker for reproducible deployment, (3) wiring the repair engine's completion callback into the dashboard job system, and (4) adding product analytics to demonstrate usage. The gap between "impressive internal tool" and "investable product" is primarily definitional — the engineering quality is already ahead of most seed-stage companies — but the product story (who pays for this, how, and why Lyra vs. existing QA tools) needs to be made explicit outside the codebase.

---

```
─────────────────────────────────────────────────────
AUDIT METADATA
Project:           Lyra (lyra-dashboard / The Penny Lane Project)
Date:              2026-03-20
Agent:             claude-sonnet-4-6
Codebase access:   Full read-only (all files accessible)
Confidence level:  High — read all key source files directly;
                   minor gaps in unexplored API route implementations
                   and unconfirmed live deployment URL
Sections with gaps:
  §1  — Live URL not discoverable in config
  §5  — No analytics data to report (none exists)
  §6  — No monetization to report (none exists)
  §9  — lyra_repair_jobs CREATE migration not confirmed;
         lyra_orchestration_events and lyra_project_snapshots
         CREATE migrations not found
Total files analyzed: ~75 source files read directly
─────────────────────────────────────────────────────
```

The comprehensive audit is complete above. The exploration agent has also confirmed the file inventory independently. The report is ready — no files needed to be changed, as this was a research and analysis task.

Here's a quick orientation to what the audit found:

**tl;dr for Lyra:**
- **Status: Alpha** — Core pipeline (import → audit → view → sync → queue) works end-to-end. Design quality is exceptional.
- **Biggest strengths:** Clean repository-pattern architecture, strict TypeScript, full dark mode, 29 API routes, Supabase schema with RLS, Linear bidirectional sync, Netlify-deployed with weekly cron, polished bespoke design system.
- **Biggest gaps:** Zero test coverage, Python repair engine not wired to the dashboard (most ambitious feature is disconnected), worker uses only OpenAI despite multi-provider routing config, no product analytics, single-secret auth.
- **90 commits in 13 days** — extremely high velocity with clean conventional commits and PR-based workflow.
- **Ecosystem position:** Lyra is the hub that explicitly references and audits all 11 Penny Lane portfolio apps; it's the connective tissue of the entire portfolio intelligence layer.

---
```
AUDIT METADATA
Project:           Lyra (lyra-dashboard / The Penny Lane Project)
Date:              2026-03-20
Agent:             claude-sonnet-4-6
Codebase access:   Full read-only (~75 source files directly read)
Confidence level:  High
Sections with gaps: §1 (live URL), §5 (no analytics), §6 (no monetization), §9 (3 CREATE migrations unconfirmed)
```