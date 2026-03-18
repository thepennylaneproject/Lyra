# LYRA Dashboard

Next.js UI for projects, findings, orchestration, and Linear sync.

## Storage

| Mode | When |
|------|------|
| **Supabase Postgres** | `DATABASE_URL` set → projects in `lyra_projects` (run `supabase/migrations/20250318120000_lyra_core.sql`). |
| **Local JSON** | No `DATABASE_URL` → `./data/projects.json` (`LYRA_DASHBOARD_DATA_DIR`). |

Orchestration events/snapshots still use `lyra_orchestration_events` / `lyra_project_snapshots` when `DATABASE_URL` is set (auto-created by the app).

## Orchestration (BullMQ)

1. Set `ORCHESTRATION_ENQUEUE_SECRET` in production.
2. `POST /api/orchestration/jobs` with `Authorization: Bearer <secret>` and body `{ "job_type": "weekly_audit" }` (etc.).
3. Run the **worker** (`../worker/`) against the same DB; optional `REDIS_URL` for instant pickup.

Dashboard UI: paste the same secret once (session storage) to enable Run buttons.

Dev: if `ORCHESTRATION_ENQUEUE_SECRET` is unset, POST is allowed without auth.

## Netlify

Repo root [`netlify.toml`](../netlify.toml) sets `base = "dashboard"`. Scheduled function enqueues weekly audit Monday 09:00 UTC.

Env on Netlify: `DATABASE_URL`, `ORCHESTRATION_ENQUEUE_SECRET`, `REDIS_URL` (recommended), plus existing Linear/routing vars as needed.

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
