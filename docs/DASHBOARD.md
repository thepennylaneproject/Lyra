# Dashboard-first project management

Use the Lyra dashboard as your primary surface to **review findings**, **orchestrate audits**, and **record repair intent** across projects. This document describes how the app fits into the full loop and what still runs outside the dashboard process.

## What the dashboard is responsible for

- **Projects and findings** — Import or sync `open_findings.json`, browse and update status, decision history.
- **Audit jobs** — Queued work in `lyra_audit_jobs`; the **worker** (`worker/`) drains the queue (BullMQ with Redis, or database polling) and runs audits.
- **Repair queue (engine)** — Rows in `lyra_repair_jobs` when Postgres is configured, or `audits/repair_queue.json` when running without the jobs store. Queuing **records** the job and shows it under **Repair queue** in the app; it does **not** run the Python patch-tree repair engine inside the Next.js host.
- **Run history** — Recent `lyra_audit_runs` and related orchestration data (see root `README.md` orchestration section).

## Day-to-day loop (in the app)

1. Open a project and review findings.
2. Queue repairs or use bulk actions where appropriate.
3. Trigger audits from the orchestration controls when you need a new pass.

## After you queue a repair — closure loop

Queuing persists **intent** and visibility. To actually change code and close findings:

1. **Implement or generate fixes** in the target repository — manually, or by running the standalone **[patch-tree repair engine](../repair_engine/)** against a checkout that includes [`audits/open_findings.json`](../audits/open_findings.json), with Redis / Docker / model endpoints as described in [`audits/REPAIR-ENGINE-README.md`](../audits/REPAIR-ENGINE-README.md).
2. **Verify** — Successful engine apply moves findings toward `fixed_pending_verify` (see REPAIR-ENGINE-README).
3. **Re-audit** — Trigger an audit from the dashboard for the project, or from the repo run `python3 audits/session.py reaudit` per [`audits/WORKFLOW.md`](../audits/WORKFLOW.md).
4. **Release gate** — `python3 audits/session.py canship` (or your equivalent checks) before deploy.

The TypeScript worker processes **audit** jobs, not `lyra_repair_jobs`; there is no separate in-repo worker that only drains the repair queue table.

## Two similar “queue” APIs

| Mechanism | Typical use | Storage |
|-----------|-------------|---------|
| **Engine repair queue** — `POST /api/engine/queue`, finding detail “Send to repair engine” | One finding at a time | `lyra_repair_jobs` or `audits/repair_queue.json` |
| **Bulk repair queue** — `POST /api/bulk-operations/repair-queue` | Many findings | `lyra_maintenance_backlog` (see [`supabase/migrations/`](../supabase/migrations/)) |

Maintenance backlog is also updated from **audit completion** in the worker (`upsertMaintenanceBacklogFromFindings`). Backlog items can link to repair jobs via `backlog_id` / `maintenance_task_id` where the schema supports it.

## Optional: link workflows doc in the UI

The sidebar can show a clickable “Workflows table” link if you set **`NEXT_PUBLIC_LYRA_WORKFLOWS_DOC_URL`** at build time (e.g. a GitHub blob URL for `docs/LYRA_NEAR_TERM_THEMES.md`). Otherwise the UI shows the repo path as plain text.

## Related docs

- [`audits/WORKFLOW.md`](../audits/WORKFLOW.md) — Session commands (`triage`, `fix`, `reaudit`, `canship`).
- [`audits/REPAIR-ENGINE-README.md`](../audits/REPAIR-ENGINE-README.md) — Repair engine CLI, safety, operator workflow.
- [`worker/README.md`](../worker/README.md) — How audit jobs are processed.
- [`docs/VOICE.md`](VOICE.md) — Dashboard copy conventions.
