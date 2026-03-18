# Lyra worker

Processes `lyra_audit_jobs` from BullMQ queue **lyra-audit** (or polls the DB every `LYRA_JOB_POLL_MS` if `REDIS_URL` is unset).

## Env

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Same Postgres as dashboard (Supabase). |
| `OPENAI_API_KEY` | For real audits | Without it, jobs complete with a config finding only. |
| `REDIS_URL` / `LYRA_REDIS_URL` | No | If set, uses BullMQ; else polls queued rows. |
| `LYRA_REPO_ROOT` | No | Path to Lyra repo root (expects `core_system_prompt`, `expectations/`, `the_penny_lane_project/`). Default: parent of `worker/`. |
| `LYRA_AUDIT_MODEL` | No | Default `gpt-4o-mini`. |
| `LYRA_JOB_POLL_MS` | No | Poll interval when Redis disabled. Default `8000`. |

## Scripts

- `npm run dev` — `tsx watch src/index.ts`
- `npm run build && npm start` — compiled JS

Deploy this process on any long-lived host (Railway, Fly, VPS, etc.) with repo checkout or mount.
