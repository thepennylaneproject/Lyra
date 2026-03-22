# Lyra — near-term theme priorities (implementation track)

This document records the **default near-term priorities** derived from the latent-capability audit (compounding priorities). Use it to align dashboard, worker, and CLI work without re-litigating themes each sprint.

**Phased implementation checklist:** [`REMEDIATION_PLAN.md`](./REMEDIATION_PLAN.md) (epics, file hints, sprint order).

## Confirmed theme focus (in order)

1. **Loop closure (audit ↔ Linear ↔ repair)** — Close the gap between siloed artifacts so status and history feel like one thread (audit plan Theme 1 + 5; incremental slices first).
2. **Triage unification** — One ordering of “what matters next” across `audits/session.py`, `portfolio.py`, and the dashboard (`PRIORITY_ORDER` / severity / confidence) (Theme 2 + 6).
3. **Honest coverage & mirror fidelity** — Surface sampling limits and mirror staleness so operators do not over-trust sparse audits (Theme 3 + 10).
4. **Run-over-run signals** — Use `lyra_audit_runs` as a time series: deltas, spikes, “something changed” (Theme 7).
5. **Portfolio narrative** — Optional digests on top of PatternPanel aggregates (Theme 4; later / optional LLM job).

## Workflows: when to use what

| Surface | Best for |
|--------|----------|
| **Dashboard** (Next.js on Netlify) | Reviewing findings, orchestration, Linear sync, repair queue, worker history with `DATABASE_URL` + worker + Redis. |
| **`python3 audits/session.py`** | Local canonical `audits/open_findings.json` triage: next action, triage list, fix/done/skip, can-ship — ideal when the repo is the source of truth. |
| **`python3 portfolio.py`** | Multiple **separate git checkouts** listed in `~/.lyra/portfolio.json` — global “next” across machines paths, not the dashboard DB. |

The dashboard and CLI can diverge if projects live only in Postgres JSON and never sync to `open_findings.json`. Prefer **one source of truth** per environment: DB for hosted ops, files for local script workflows.

## Implemented incremental slices (this track)

- **Worker:** Primary `*report*.md` intelligence file under each app’s `the_penny_lane_project/<App>/` tree is included (bounded excerpt) before sampled source files.
- **Dashboard:** Project worker audit history shows **vs prior run** delta on `findings_added` and a short sampling/coverage note.
- **Worker:** `lyra_audit_runs.exhaustiveness` is **`sampled`** when any per-project `project_audit_details` entry used a sampled manifest (was previously always `exhaustive` on success).
- **Dashboard:** Completed runs **table** + **+findings sparkline** (last 12), **Kind** column (`payload.audit_kind`), **coverage** from DB or per-project payload; **Details** + redacted JSON + Advanced raw trace; **run-series alerts**: coverage regression vs prior run and **two consecutive zero-add runs** with unchanged scope fingerprint (see [`REMEDIATION_PLAN.md`](./REMEDIATION_PLAN.md) Phase 1 / 3).
- **Dashboard:** Finding detail **closure loop** strip: Lyra status, repair ledger row(s) vs UI queue, Linear mapping + drift hint; **`GET /api/findings/lifecycle`**; copy aligned with **docs/DASHBOARD.md** (audit worker vs repair engine) ([`REMEDIATION_PLAN.md`](./REMEDIATION_PLAN.md) Phase 4).
- **Dashboard:** **Import** shows **merge summary** (added / updated / unchanged by `finding_id` + fingerprint); sidebar **source of truth** note + optional doc URL; **Export open_findings.json** from project header ([`REMEDIATION_PLAN.md`](./REMEDIATION_PLAN.md) Phase 5).
- **Dashboard:** Shared **`fragile-files`** helper with PatternPanel; **Next action** shows hotspot overlap + **View portfolio patterns** (scrolls to `#lyra-pattern-panel`); **ResolvedNextAction** carries backlog `next_action` / `risk_class` / `summary`; **Project cards** show top backlog row with next step + risk.
- **Dashboard (cognitive-load / Phase 0 + UX):** Portfolio URL + sidebar coherence (`portfolio-url-state`, `navHighlightView`); audit **import** control copy + refetch projects after sync; **Engine** routing degraded banner + dimmed routing block; **`use-queue-repair`** + server `fetchQueue` reconciliation; **ConfirmDialog** for remove/discard; operations tab **`<details>`** sections; **OrchestrationPanel** instance cache + dispatch bypass + “Updated” time; repair queue Set **composite keys only**. Triage parity: [`docs/TRIAGE_PARITY.md`](./TRIAGE_PARITY.md).

Longer-term items (shared triage module, repair-memory feedback into audits, automated digests) remain backlog per the full audit.
