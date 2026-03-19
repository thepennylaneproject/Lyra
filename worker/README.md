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
