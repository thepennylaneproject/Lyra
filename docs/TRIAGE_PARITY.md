# Triage parity — CLI vs dashboard

This matrix explains **why “next” can differ** between surfaces. Ordering enums (`PRIORITY_ORDER`, `SEVERITY_ORDER`) are intentionally aligned where noted; **workflow gates** are not.

| Surface | Scope | “Next” logic | Status filter for queue | Sort / tie-break |
|--------|--------|----------------|---------------------------|------------------|
| **`python3 audits/session.py`** (default) | Single repo, `audits/open_findings.json` | **Decision tree:** in-progress → pending verify → blockers → questions → sorted actionable (non-question) | Actionable = `open`, `accepted` only for triage lists | `sort_key`: priority → severity → **confidence** → **effort** (see `audits/session.py`) |
| **`python3 audits/session.py triage`** | Same | Tiered buckets: P0, then P1 (non-question), questions, P2/P3 | Same | Same `sort_key` within buckets |
| **`python3 portfolio.py next`** | Multi-repo `~/.lyra/portfolio.json` | Single global row: min `sort_key` across projects | **`open`, `accepted` only** (stricter than dashboard “active”) | **Priority → severity only** (`portfolio.py` `sort_key`; no confidence/effort) |
| **Dashboard** [`resolve-next-action.ts`](../dashboard/lib/resolve-next-action.ts) | Projects in DB | **Maintenance backlog first** (per project, not `done`/`deferred`), else top **active** finding portfolio-wide | Active = `STATUS_GROUPS.active` (`open`, `accepted`, `in_progress`) | Backlog: priority + severity; findings: `sortFindings` = priority → severity **only** |

## Intentional differences

1. **Backlog vs raw findings:** Only the dashboard considers `maintenanceBacklog` before individual findings.
2. **Active statuses:** Dashboard includes `in_progress` in the candidate pool for “next finding”; `portfolio.py next` does not include `in_progress` in its flat list (session.py handles in-progress as a **gate** before triage).
3. **Session gates:** `session.py` may tell you to finish in-progress work or verify fixes **before** showing the next sorted item. The dashboard hero card does not replay that full gate tree; use **Finding** workflow and **Closure loop** for per-finding state.
4. **Confidence / effort:** Session runner tie-breaks with confidence and suggested-fix effort; portfolio CLI and dashboard `sortFindings` do **not**.

## When to align vs document

- **Align:** Priority and severity numeric orders should stay in sync across Python and [`dashboard/lib/constants.ts`](../dashboard/lib/constants.ts) unless a product decision says otherwise.
- **Document only:** Adding confidence/effort to the dashboard hero would increase noise for operators; backlog-first behavior is dashboard-specific product logic.

## Related

- Workflows table: [`LYRA_NEAR_TERM_THEMES.md`](./LYRA_NEAR_TERM_THEMES.md)
- Remediation Phase 6: [`REMEDIATION_PLAN.md`](./REMEDIATION_PLAN.md)
