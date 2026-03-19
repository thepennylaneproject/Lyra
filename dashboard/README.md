# LYRA Dashboard

Next.js UI for projects, findings, orchestration, and Linear sync.

## Storage

| Mode | When |
|------|------|
| **Supabase Postgres** | `DATABASE_URL` set → projects in `lyra_projects`, orchestration tables, **`lyra_linear_sync`** for Linear mappings on serverless (run all `supabase/migrations/`). |
| **Local JSON** | No `DATABASE_URL` → `./data/projects.json` (`LYRA_DASHBOARD_DATA_DIR`). |

Orchestration events/snapshots still use `lyra_orchestration_events` / `lyra_project_snapshots` when `DATABASE_URL` is set (auto-created by the app).

## Orchestration (BullMQ)

1. Set `ORCHESTRATION_ENQUEUE_SECRET` in production.
2. `POST /api/orchestration/jobs` with `Authorization: Bearer <secret>` and body `{ "job_type": "weekly_audit" }` (etc.).
3. Run the **worker** (`../worker/`) against the same DB with the **same** `REDIS_URL` when the dashboard uses Redis — otherwise jobs stay `queued` forever in Postgres/BullMQ.

`POST /api/orchestration/queue/clear` (same auth) **obliterates** the `lyra-audit` BullMQ queue and marks all DB rows still in `queued` as `failed`. The orchestration panel includes a **Clear queue (Redis + DB)** button.

Dashboard UI: paste the same secret once (session storage) to enable Run buttons. That value is also sent as **`Authorization: Bearer`** on **`apiFetch`** calls (e.g. Linear sync, project audit history) so `/api/*` middleware accepts the same gate as orchestration without a separate login cookie.

`GET /api/orchestration/runs?project=<name>` — recent `lyra_audit_runs` and `lyra_audit_jobs` for one project (used by the project view **Worker audit history** block).

Dev: if `ORCHESTRATION_ENQUEUE_SECRET` is unset, POST is allowed without auth.

**Linear sync storage:** With `DATABASE_URL`, mappings live in **`lyra_linear_sync`**. Without it, `data/linear_sync.json` is used (fine locally; not durable on Netlify/serverless).

## Netlify

Repo root [`netlify.toml`](../netlify.toml) sets `base = "dashboard"`. Scheduled function enqueues weekly audit Monday 09:00 UTC.

Env on Netlify: `DATABASE_URL`, `ORCHESTRATION_ENQUEUE_SECRET`, `REDIS_URL` (recommended), plus existing Linear/routing vars as needed.

### Production deploy checklist (launch)

Use this before sharing the dashboard URL beyond trusted operators.

1. **Postgres / Supabase**
   - Set **`DATABASE_URL`** on Netlify to the Supabase (or other Postgres) connection string so projects and jobs persist across deploys (not local JSON).
2. **Migrations**
   - Apply every file under [`../supabase/migrations/`](../supabase/migrations/) to that database (Supabase SQL editor, CLI, or CI). This includes core `lyra_*` tables and **`lyra_linear_sync`** for Linear issue mappings.
3. **Linear sync on serverless**
   - Without `DATABASE_URL` + migrations, mappings live in `data/linear_sync.json`, which **does not survive** Netlify/serverless filesystem resets. For production Linear sync, DB mode is required.
4. **API gate**
   - Set **`DASHBOARD_API_SECRET`** or reuse **`ORCHESTRATION_ENQUEUE_SECRET`** so `/api/*` (except `GET /api/health`) is not open to the world.
5. **Worker + Redis (orchestration)**
   - If you use **`REDIS_URL`**, run **`worker/`** with the same `DATABASE_URL` and `REDIS_URL`, or jobs remain `queued` until a worker consumes them (the dashboard explains this in-app).
6. **Single host**
   - Prefer **one** production host (canonical: Netlify per root README) so env and scheduled functions stay consistent.
7. **Smoke test after deploy**
   - Open `/api/health` → `{ ok: true }`.
   - Log in, load portfolio, open a project with `?project=<name>` in the URL (refresh should keep the same project).
   - Optional: run a non-destructive orchestration action with the enqueue secret pasted in the panel.

## Run locally

```bash
cd dashboard
npm install
npm run dev
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres (Supabase). Enables `lyra_projects` + job tables + durable state. |
| `ORCHESTRATION_ENQUEUE_SECRET` | Bearer token for enqueue API + Netlify scheduler. |
| `REDIS_URL` / `LYRA_REDIS_URL` | Push jobs to BullMQ (worker). |
| `LYRA_DASHBOARD_DATA_DIR` | JSON store directory when no `DATABASE_URL`. |
| `LYRA_AUDIT_DIR` | Path to repo `audits/` for engine sync. |
| `LINEAR_*` | Linear sync (optional). |
| `LYRA_ROUTING_*` | Routing / model overrides. |
| `LYRA_POSTGRES_*` | Durable events/snapshots table names. |

See `.env.example`.

## Scripts

- `npm run dev` — Dev server
- `npm run build` / `npm start` — Production
