# Lyra — remediation plan (latent-capability follow-through)

This plan turns the **latent-capability audit** into sequenced work. It **extends** [`LYRA_NEAR_TERM_THEMES.md`](./LYRA_NEAR_TERM_THEMES.md) (which stays the priority stack) with concrete epics, deliverables, and file-level hints.

**Principles**

- Prefer **incremental** slices that compound; avoid one big “platform” rewrite.
- **Do not** collapse the safety boundary: hosted dashboard records **intent**; the Python **repair engine** still applies patches outside Next.js (see [`DASHBOARD.md`](./DASHBOARD.md)).
- After each phase, update **this doc** (checkboxes) and, where relevant, **LYRA_NEAR_TERM_THEMES.md** “implemented slices.”

---

## How phases map to themes

| Phase | Near-term theme # | Audit themes addressed |
|-------|-------------------|-------------------------|
| 0 | 1 (loop / calm ops) | Navigation vs URL, honest composite loading, sync clarity |
| 1 | 3 (coverage), 4 (patterns partial) | Run forensics, honest limits, PatternPanel ↔ triage |
| 2 | 7 | Run-over-run signals, simple anomaly hints |
| 3 | 1 | Loop closure UX (audit ↔ Linear ↔ repair) |
| 4 | 2 | Triage unification (dashboard + docs parity; shared module optional) |
| 5 | — (source-of-truth risk) | DB vs `open_findings.json` drift visibility |
| 6 | 5 | Portfolio narrative / digest (optional LLM) |
| UX | 1, operator calm | Queue state consolidation, confirms, operations disclosure, orchestration freshness |

---

## Phase 0 — Navigation & honest loading

**Outcome:** Sidebar highlight matches the mental model (project detail = portfolio context); engine screen does not look authoritative when routing failed; audit import action is labeled for what it does.

| # | Deliverable | Primary touchpoints | Done |
|---|-------------|---------------------|------|
| 0.1 | **Shell nav highlight:** While `activeProject` is set, sidebar selects **Portfolio** (or normalize URL so `view=engine` cannot pair with `project=`). | `Shell.tsx`, `page.tsx`, `use-portfolio-url.ts` | [x] |
| 0.2 | **Engine routing degraded:** Persistent banner + visually subordinate routing sections when `/api/engine/routing` fails. | `EngineView.tsx`, `UI_COPY` | [x] |
| 0.3 | **Audit import control:** Sidebar control text explains `POST /api/sync/audit`; on success refresh portfolio list when import updated DB. | `Shell.tsx`, `UI_COPY`, `page.tsx` | [x] |

**Rule (0.1):** *Project detail is always portfolio context for nav.* URL may still carry `view=engine` for back/forward; highlight follows the rule above.

---

## Phase 1 — Run forensics + calibration (trust)

**Outcome:** Operators can answer “what did this audit actually see?” without opening Postgres or worker logs.

| # | Deliverable | Primary touchpoints | Done |
|---|-------------|---------------------|------|
| 1.1 | **Run detail drawer or expanded row** listing per-project slices from `lyra_audit_runs.payload`: `coverage_complete`, `checklist_id`, scope paths / file counts, `audit_kind`, link to existing summary. | `dashboard/components/ProjectAuditHistory.tsx`, `GET /api/orchestration/runs`, types for `payload` | [x] |
| 1.2 | **Raw LLM trace** behind explicit “Advanced” disclosure (collapsed by default); warn on size / PII. | Same + copy in [`VOICE.md`](./VOICE.md) if new strings | [x] |
| 1.3 | **Parity check:** ensure UI “sampling / coverage” note matches worker fields already written to `project_audit_details` (`worker/src/process-job.ts`). | Worker + dashboard copy | [x] |

**Success criteria:** From the project view, a run opened in the UI shows scope/coverage facts that match the stored JSON; no new secrets in client bundles.

**Risks:** Large `payload` JSON — consider returning a **summary** field from API or trimming `raw_llm_output` server-side for list endpoints.

---

## Phase 2 — Triage + patterns as one story

**Outcome:** “What’s next?” respects **maintenance backlog** semantics and **cross-portfolio fragility** (reuse [`resolve-next-action.ts`](../dashboard/lib/resolve-next-action.ts) + [`PatternPanel.tsx`](../dashboard/components/PatternPanel.tsx) logic).

| # | Deliverable | Primary touchpoints | Done |
|---|-------------|---------------------|------|
| 2.1 | **Next action context line:** if the resolved finding references a file that appears in >1 active finding’s proof hooks (same heuristic as PatternPanel), show one sentence + deep-link to open PatternPanel filtered or scrolled to fragile files. | `NextActionCard.tsx`, `page.tsx`, small shared helper in `dashboard/lib/` | [x] |
| 2.2 | **Backlog-first UX:** on `NextActionCard` / backlog rows, surface `next_action` and `risk_class` from maintenance backlog when present (`worker/src/db.ts` upsert already stores these). | `ProjectCard.tsx`, finding/detail views as needed, types in `dashboard/lib/types` | [x] (card + next-action hero; finding detail optional) |

**Success criteria:** `resolve-next-action` tests extended for “fragile file” banner predicate; no duplicate copy-paste of PatternPanel’s file-count logic (one helper).

---

## Phase 3 — Run-over-run signals

**Outcome:** `lyra_audit_runs` reads as a **time series**, not only a list.

| # | Deliverable | Primary touchpoints | Done |
|---|-------------|---------------------|------|
| 3.1 | **Last N runs table** + **+findings sparkline** (last 12): `findings_added`, `coverage_complete` (DB or payload fallback), explicit **`audit_kind`** column, timestamp. | `ProjectAuditHistory.tsx`, `effectiveCoverageComplete` in `audit-run-forensics.ts` | [x] |
| 3.2 | **Heuristic alerts (no ML):** “`coverage_complete` flipped false vs prior” (DB or payload); “`findings_added` = 0 for two consecutive runs” with **same scope fingerprint** from `project_audit_details` — inline warnings on latest run. | `runSeriesAlerts` + `scopeFingerprintForRunCompare` in `dashboard/lib/audit-run-forensics.ts` | [x] |

**Success criteria:** Alerts are **explainable** in one sentence; unit tests for compare helpers.

---

## Phase 4 — Loop closure UX (audit ↔ Linear ↔ repair)

**Outcome:** Users see **one lifecycle story** even when execution spans three systems (dashboard, Linear, external repair engine).

| # | Deliverable | Primary touchpoints | Done |
|---|-------------|---------------------|------|
| 4.1 | **Finding detail lifecycle strip:** states derived from finding `status`, repair queue membership (`lyra_repair_jobs` / client queue), and Linear mapping (`lyra_linear_sync` / sync APIs) — with explicit “human / external” steps. | `FindingDetail.tsx`, `GET /api/findings/lifecycle`, `listRepairJobsForFinding` | [x] |
| 4.2 | **Copy pass:** align labels with [`DASHBOARD.md`](./DASHBOARD.md) “after you queue a repair” so the UI does not imply the worker runs patches. | `UI_COPY`, `FindingDetail` ledger hint, `EngineView` explainer | [x] |

**Success criteria:** New user can read one finding and know **what happened**, **what’s queued**, and **what they must run locally** next.

---

## Phase 5 — Source-of-truth drift (DB vs files)

**Outcome:** The documented risk (“dashboard and CLI can diverge”) is **visible**, not silent.

| # | Deliverable | Primary touchpoints | Done |
|---|-------------|---------------------|------|
| 5.1 | **Import modal summary:** after import from `open_findings.json`, show counts delta (added/updated/unchanged findings) vs previous project snapshot where computable. | `ImportModal.tsx`, `POST /api/import`, `import-summary.ts` | [x] |
| 5.2 | **Operator note in UI** (portfolio or settings): reminder of **one source of truth per environment** with link to [`LYRA_NEAR_TERM_THEMES.md`](./LYRA_NEAR_TERM_THEMES.md) workflows table. | `Shell.tsx`, `docs-links.ts`, `NEXT_PUBLIC_LYRA_WORKFLOWS_DOC_URL` | [x] |
| 5.3 | *(Optional mid-term)* **Export** bundle (findings JSON for a project) for parity with file-based workflows. | `GET /api/projects/[name]/export-findings`, `ProjectView.tsx` | [x] |

**Success criteria:** Import never silently overwrites without a one-glance summary; docs link is discoverable.

---

## Phase 6 — Triage unification (cross-surface)

**Outcome:** Same **ordering rules** and labels wherever “next” or triage lists appear.

| # | Deliverable | Primary touchpoints | Done |
|---|-------------|---------------------|------|
| 6.1 | **Parity matrix** in docs: `audits/session.py`, `portfolio.py`, `resolve-next-action.ts` — document enum/order differences and intent to align or keep divergent on purpose. | [`docs/TRIAGE_PARITY.md`](./TRIAGE_PARITY.md) | [x] |
| 6.2 | *(Optional)* **Shared artifact:** extract priority/severity ordering + status groups to a single JSON or small TS package consumed by dashboard; Python reads the same file in CI — only if maintenance cost is acceptable. | `dashboard/lib/constants.ts`, Python equivalent | [ ] |

**Success criteria:** No unexplained “why does CLI say X but dashboard says Y?” — either fixed or documented.

---

## UX polish — State, confirms, complexity

**Outcome:** One queue mutation path with server reconciliation; calmer destructive confirms; operations tab does not dump every panel at once; orchestration panel does not serve stale module-global cache after dispatch.

| # | Deliverable | Primary touchpoints | Done |
|---|-------------|---------------------|------|
| UX.1 | **Unified queue repair:** After successful enqueue, `fetchQueue()`; optional `useQueueFinding` hook for shared error/phase. | `page.tsx`, `hooks/use-queue-repair.ts`, `NextActionCard.tsx` | [x] |
| UX.2 | **Finding save refresh copy:** Split “saved” vs “refresh failed” + Retry (no single long concatenated string). | `ProjectView.tsx` | [x] |
| UX.3 | **In-app confirm** for remove project + import discard (no `window.confirm`). | `ConfirmDialog.tsx`, `page.tsx`, `ImportModal.tsx` | [x] |
| UX.4 | **Operations tab:** Progressive disclosure (`<details>` or sub-sections); avoid mounting every heavy panel before expand. | `ProjectView.tsx` | [x] |
| UX.5 | **Orchestration freshness:** Replace module-level cache with component-scoped cache + **bypass cache on dispatch**; show “Updated …” timestamp. | `OrchestrationPanel.tsx` | [x] |
| UX.6 | **Repair queue keys:** Normalize client Set to `project:finding` only (omit jobs missing `project_name`). | `use-engine-queue.ts`, `finding-validation.ts` | [x] |

---

## Phase 7 — Portfolio narrative (later / optional)

**Outcome:** Scheduled or on-demand **cheap** pass over finding metadata (titles, categories, severities) produces a short digest; optional LLM.

| # | Deliverable | Primary touchpoints | Done |
|---|-------------|---------------------|------|
| 7.1 | **Rule-based digest** from PatternPanel aggregates + run deltas (no LLM). | New small component or email-ready markdown | [ ] |
| 7.2 | *(Speculative)* **Worker job type** `portfolio_digest` storing summary in `lyra_audit_runs` with distinct `audit_kind`. | `worker/`, orchestration enqueue | [ ] |

---

## Cross-cutting: tests and observability

- Add **Vitest** coverage for: run-payload formatters, run-vs-run compare helpers, fragile-file helper (Phase 2–3).
- If APIs change shape, extend existing middleware / API tests under `dashboard/lib/__tests__/`.
- Optional: one **Sentry** breadcrumb when user expands raw trace (Phase 1.2) to gauge usage without logging content.

---

## Suggested execution order (sprints)

1. **Sprint 0:** Phase 0 (0.1 → 0.3) + UX.5 + UX.6 — nav truth, honest engine load, fresh orchestration, queue key safety.  
2. **Sprint A:** Phase 1 (1.1 → 1.3), then Phase 3.1 (table) — maximum trust with least product debate.  
3. **Sprint B:** Phase 2 + Phase 3.2 — triage feels smarter.  
4. **Sprint C:** Phase 4 — reduces support burden (“what do I do next?”).  
5. **Sprint D:** UX.1–UX.4 + Phase 6.1 — queue UX, confirms, operations disclosure, triage parity doc.  
6. **Sprint E:** Phase 5 (remaining checks) + Phase 6.2 (only if 6.1 proves painful), Phase 7 as bandwidth allows.

---

## After completion

- Mark checkboxes in this file; trim or archive phases that are cancelled.  
- Mirror **implemented slices** into [`LYRA_NEAR_TERM_THEMES.md`](./LYRA_NEAR_TERM_THEMES.md).  
- If remediation changes operator workflow, add a short **changelog** note in root `README.md` or `docs/DASHBOARD.md`.

---

*Last updated: 2026-03-21 — Phase 0 + UX polish track added (cognitive-load remediation).*
