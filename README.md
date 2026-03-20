# Dev Team Six — Portfolio Intelligence & Audit Infrastructure

> Part of [The Penny Lane Project](https://thepennylaneproject.org) — technology that serves the individual.

## What This Is

This repository is the central intelligence and quality-assurance hub for The Penny Lane Project — a portfolio of 11 actively developed applications built by Sarah Sahl. It houses codebase intelligence reports, structured expectations documents, and the LYRA multi-agent audit system that continuously validates each application against its architectural constraints.

## Current Status

**Active** — Codebase intelligence reports and expectations documents are in place for all 11 applications. The LYRA audit system is operational and ready to run against any application in the portfolio.

## The 11 Applications

| Application | Domain | Stack |
|:---|:---|:---|
| **Advocera** | Legal-tech | Python / SQLite |
| **Codra** | AI-powered development platform | TypeScript / React / Netlify Functions |
| **FounderOS** | Founder productivity suite | Next.js 14 App Router |
| **Mythos** | AI marketing operations | TypeScript monorepo |
| **Passagr** | Travel visa research | TypeScript / React |
| **Relevnt** | Job market intelligence | TypeScript / React |
| **embr** | Creator monetization | NestJS / Next.js / React Native (Turborepo) |
| **ready** | Career readiness | TypeScript / React / Vite |
| **Dashboard** | Personal medical data | Python / Streamlit |
| **Restoration Project** | Blog & briefing site | Next.js |
| **sarahsahl.pro** | Portfolio site | Static HTML / CSS / JS |

## Repository Structure

```
the_penny_lane_project/   # Codebase intelligence reports (one per app)
expectations/             # Architectural expectations documents (one per app)
audits/                   # LYRA audit system — multi-agent quality assurance
  session.py              # Session runner (low-cognitive-load workflow)
  open_findings.json      # Canonical current state of open audit findings
  index.json              # Append-only audit run history
  prompts/                # Agent prompts (Logic, Data, UX, Performance, Security, Deploy)
  schema/                 # JSON Schema for audit output contract
  findings/               # Individual finding case files
  runs/                   # Immutable run outputs
```

## Deploy stack (dashboard + audits)

- **Dashboard:** Next.js in `dashboard/` — **canonical host: Netlify** (see root `netlify.toml`). `dashboard/vercel.json` is optional/alternate; prefer one host to avoid divergent config.
- **API auth (production):** Set **`DASHBOARD_API_SECRET`** or reuse **`ORCHESTRATION_ENQUEUE_SECRET`**. When set, all `/api/*` routes except **`GET /api/health`** require either a browser login (unlock screen) or `Authorization: Bearer <secret>` / `x-lyra-api-secret`. Netlify scheduled `enqueue-weekly-audit` already sends Bearer for orchestration POST.
- **Health:** `GET /api/health` — public JSON `{ ok: true }` for uptime checks.
- **Observability (optional):** Set **`SENTRY_DSN`** (and **`NEXT_PUBLIC_SENTRY_DSN`** for client) for error monitoring; no DSN = no-op. Optionally set `SENTRY_ORG` and `SENTRY_PROJECT` for source map uploads in CI.
- **Data:** **Supabase Postgres** — run migrations in `supabase/migrations/` (core tables + RLS). RLS locks `lyra_*` for anon/authenticated PostgREST; the app server using `DATABASE_URL` (owner/service role) keeps full access.
- **Worker:** `worker/` — BullMQ (or DB poll) + OpenAI; processes queued audits. See `worker/README.md` and `audits/COPILOT-AGENTS.md`.
- **CI:** GitHub Actions (`.github/workflows/ci.yml`) — dashboard lint, `tsc --noEmit`, build; worker build.

## Audit System (LYRA)

LYRA is a multi-agent audit system with six specialized agents:

- **Agent A** — Runtime & Logic Bug Hunter
- **Agent B** — Data Integrity / Schema / RLS Auditor
- **Agent C** — UX Flow & Copy Consistency Auditor
- **Agent D** — Performance & Cost Auditor
- **Agent E** — Security & Privacy Auditor
- **Agent F** — Build/Deploy & Observability Auditor

To run an audit session:

```bash
python3 audits/session.py        # What should I do next?
python3 audits/session.py triage # Show prioritized fix list
python3 audits/session.py status # Full dashboard
```

See [`audits/README.md`](audits/README.md) for full documentation.

Near-term theme priorities and CLI vs dashboard workflows: [`docs/LYRA_NEAR_TERM_THEMES.md`](docs/LYRA_NEAR_TERM_THEMES.md).

## Dashboard

The dashboard is the primary way to review audit output, queue repairs, and manage projects without running everything manually. For how queuing, audits, and the repair engine fit together (dashboard-first workflow), see **[`docs/DASHBOARD.md`](docs/DASHBOARD.md)**.

```bash
cd dashboard
npm install
npm run dev
```

Useful checks:

```bash
npm run lint
npm run typecheck
npm run build
```

From the dashboard UI, use **Import project** to load `open_findings.json`, then use **sync now** and the project-level repair controls to keep manual work inside the app. UI copy conventions (nav vs actions) are in [`docs/VOICE.md`](docs/VOICE.md).

## Orchestration (Supabase + Netlify + worker)

- **Postgres:** `DATABASE_URL` — projects in `lyra_projects`, jobs in `lyra_audit_jobs`, completed summaries in **`lyra_audit_runs`**, Linear mappings in **`lyra_linear_sync`** when migrations are applied (see `supabase/migrations/`).
- **Enqueue / API gate:** `ORCHESTRATION_ENQUEUE_SECRET` or `DASHBOARD_API_SECRET` — Netlify cron and dashboard POST use Bearer; browser session uses the unlock screen after first load. Client `apiFetch` also sends the orchestration secret from **session storage** when set (same value as the orchestration panel field).
- **Worker:** `worker/` with `OPENAI_API_KEY`, same `DATABASE_URL`, optional `REDIS_URL` for BullMQ. Audits use **sampled** code context (see `worker/README.md`), not a full-repo scan.
- **Weekly schedule:** Netlify function `dashboard/netlify/functions/enqueue-weekly-audit.ts` (Monday 09:00 UTC).
- **Per-project audit history:** Dashboard project view lists recent `lyra_audit_runs` / `lyra_audit_jobs` for that app. `GET /api/orchestration/runs?project=Name` returns the same JSON.

Routing remains env-driven: `LYRA_ROUTING_CONFIG`, `LYRA_ROUTING_STRATEGY`, and `LYRA_*_MODEL` for the dashboard engine view and repair engine.

## License

All rights reserved. © Sarah Sahl / The Penny Lane Project.
