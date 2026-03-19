# Lyra worker

Processes `lyra_audit_jobs` from BullMQ queue **lyra-audit** (or polls the DB every `LYRA_JOB_POLL_MS` if `REDIS_URL` is unset).

## Env

On startup the worker loads, in order (later files override): repo `.env` / `.env.local`, `dashboard/.env` / `dashboard/.env.local`, then `worker/.env` / `worker/.env.local`. So you can keep a single `dashboard/.env.local` and run `npm run dev` from `worker/` without copying `DATABASE_URL`.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Same Postgres as dashboard (Supabase). Alias: `LYRA_DATABASE_URL`. |
| `OPENAI_API_KEY` | For real audits | Without it, jobs complete with a config finding only. |
| `REDIS_URL` / `LYRA_REDIS_URL` | No | If set, uses BullMQ; else polls DB. **Production:** set this to avoid steady DB QPS from polling. |
| `LYRA_REPO_ROOT` | No | Path to Lyra repo root (expects `core_system_prompt`, `expectations/`, `the_penny_lane_project/`). Default: parent of `worker/`. |
| `LYRA_AUDIT_MODEL` | No | Default `gpt-4o-mini`. |
| `LYRA_JOB_POLL_MS` | No | Poll interval when Redis disabled (after a job ran). Default `8000`. |
| `LYRA_JOB_POLL_IDLE_MS` | No | Idle backoff when queue empty (no job found). Default `30000`. |

## Scripts

- `npm run dev` — `tsx watch src/index.ts`
- `npm run build && npm start` — compiled JS

Deploy this process on any long-lived host (Railway, Fly, VPS, etc.) with repo checkout or mount. Without `REDIS_URL`, the worker falls back to polling `lyra_audit_jobs` every `LYRA_JOB_POLL_MS` (default 8s), which adds continuous DB load; use Redis in production when running one or more workers.

## Stuck in `queued`?

If the dashboard shows Redis on but jobs never leave `queued`, the worker is not running or is pointed at a different Redis/DB than the dashboard. Start the worker locally: `cd worker && npm install && npm run dev`.

To drop pending work: use the dashboard **Clear queue (Redis + DB)** or `POST /api/orchestration/queue/clear` with the same Bearer secret as enqueue.

## Code context sampling (why few findings?)

Each job runs **one LLM pass** per app. The worker sends the expectations doc plus:

1. **Intelligence report** — If the mirror tree contains a markdown file whose name includes `report` (e.g. `advocera_report.md`), the worker prepends a **bounded excerpt** (see `MAX_REPORT_CHARS` in `src/context.ts`).
2. **Sampled source files** from `the_penny_lane_project/<App>/`, not the whole repo or the full manual `audits/` corpus. Limits are in `src/context.ts` (on the order of **12 files**, **~6k characters** per file, bounded recursion). A small `findings` array is normal unless you raise those limits or add other importers.

See [docs/LYRA_NEAR_TERM_THEMES.md](../docs/LYRA_NEAR_TERM_THEMES.md) for workflow and theme priorities.

Without `OPENAI_API_KEY`, the worker records a single **config** finding instead of a real audit.

## Where completed runs are stored

Postgres tables **`lyra_audit_jobs`** (enqueue + status) and **`lyra_audit_runs`** (finished run: `job_type`, `summary`, `findings_added`, `payload`). The dashboard **project** view includes a **Worker audit history** section when `DATABASE_URL` is set.
