# LYRA Manual vs Dashboard Comparison Analysis
**Generated: 2026-03-22**

---

## Executive Summary

Your manual LYRA runs are detecting **fundamentally different classes of issues** than the dashboard. The dashboard appears to be running a narrower audit suite focused primarily on UX/accessibility issues, while your manual runs capture a rich taxonomy of architectural, data integrity, and performance issues.

### Key Findings:
- **Codra**: Dashboard reports 70 findings vs Manual's 19 — but they're **entirely different finding sets** (no overlap)
- **Relevnt**: Manual reports 82 findings vs Dashboard's 53 — Manual has 36 unique categories vs Dashboard's 3
- **Embr**: Only in manual (78 findings) — No dashboard equivalent
- **Advocera**: Only in dashboard (1 finding) — No manual equivalent

**Critical Issue**: The dashboard is not capturing the depth and diversity of issues your manual workflow detects. Quality risk is **HIGH**.

---

## Detailed Findings by Project

### 1. CODRA: Complete Audit Divergence

#### Snapshot
| Metric | Manual | Dashboard | Gap |
|--------|--------|-----------|-----|
| Total Findings | 19 | 70 | +51 (dashboard extra) |
| Finding Overlap | 0 | 0 | No shared findings |
| Finding Types | 2 types | 1 type | Dashboard only reports bugs |

#### Manual Findings (All Missing from Dashboard)
All 19 manual findings are **`debt` items** reporting schema violations from multi-agent auditors:

**Categories Present in Manual Only:**
- `synth-debt` (16 findings) — Generated from synthetic audit output validation
- `constraint-violation` (1)
- `missing-validation` (1)
- `type-error` (1)

**Example Missing Findings:**
- "Schema Violation in runtime-bug-hunter output" (P2)
- "Schema Violation in ux-flow-auditor output" (P2)
- "Schema Violation in performance-cost-auditor output" (P2)
- "Schema Violation in security-privacy-auditor output" (P2)

**Interpretation**: Your manual runs validate the OUTPUT of the multi-agent auditors themselves. When they produce malformed or unexpected schema, you catch it. The dashboard skips this validation layer.

#### Dashboard Findings (All Extra in Dashboard)
All 70 dashboard findings are **`bug` type** issues spread across UX/accessibility domains:

**Categories in Dashboard Only:**
- `ux` (48 findings) — UI/interaction issues
- `logic` (18 findings) — Functional/behavioral issues
- `visual-consistency` (1)
- `cognitive-load` (1)
- `accessibility` (1)
- `security` (1)

**Priority Distribution:**
- P0 (blocker): 18
- P1 (critical): 46
- P2 (important): 6

**Example Dashboard Findings:**
- "Missing Alt Text for Images" (P0)
- "Accent Color Misuse" (P1)
- "Missing accessibility attributes for alerts" (P1)

#### Root Cause Analysis
**Hypothesis**: The dashboard runs a different audit pipeline.

Possible causes:
1. **Schema validation auditor disabled** — The `synthese-debt` findings suggest you run a meta-validator that checks if auditor outputs match expected schemas. Dashboard may skip this.
2. **Different auditor suite** — Dashboard may run only design/UX auditors, not architectural/data auditors.
3. **Output filtering** — Dashboard may filter out non-UX categories before presentation.

---

### 2. RELEVNT: Coverage Collapse

#### Snapshot
| Metric | Manual | Dashboard | Gap |
|--------|--------|-----------|-----|
| Total Findings | 82 | 53 | -29 (manual has more) |
| Finding Overlap | 0 | 0 | No shared findings |
| Unique Categories | 36 | 3 | 92% category loss |
| Finding Types | 4 types | 1 type | Dashboard only reports bugs |

#### Manual Findings (All Missing from Dashboard)
Manual reports **41 debt + 27 bugs + 8 questions + 6 enhancements** across 36 distinct categories:

**Top Categories by Count (Manual Only):**
- `copy-mismatch` (7) — UI text doesn't match data
- `migration-gap` (8) — Database migrations missing
- `schema-violation` (6) — Schema/code mismatch
- `n-plus-one` (4) — N+1 query patterns
- `type-drift` (4) — Type inconsistencies
- `error-handling` (4) — Error handling gaps
- `missing-state` (3) — UI state management issues
- `missing-rls` (2) — Row-level security gaps
- `missing-error-boundary` (2) — React error boundaries missing
- `nav-dead-end` (2) — Navigation issues
- `orphaned-data` (2) — Data lifecycle issues

**Additional Unique Categories:**
- `a11y-gap`, `api-cost`, `architecture`, `async-bug`, `auth`, `auth-bypass`, `broken-flow`, `bundle-size`, `cache-miss`, `cache-staleness`, `code-quality`, `data-mismatch`, `dead-code`, `deploy-risk`, `missing-method-guard`, `missing-ui-state`, `missing-validation`, `race-condition`, `schema-mismatch`, `session-storage-usage`, `validation-gap`

**Priority Distribution (Manual):**
- P0 (blocker): 1
- P1 (critical): 33
- P2 (important): 32
- P3 (minor): 16

**Critical Missing Findings Examples:**
- P1: "market_snapshots table referenced in code but no migration exists"
- P1: "admin_config table referenced in code but no migration exists"
- P1: "signal_classifications table referenced in code but no migration exists"
- P1: "cache_invalidation_log table referenced in code but no migration exists"
- P2: "ai_usage_log.user_id has duplicate FK constraints with conflicting ON DELETE behaviour"

#### Dashboard Findings (All Extra in Dashboard)
Dashboard reports **53 bugs** in only 3 categories:

**Categories in Dashboard Only:**
- `ux` (41 findings) — User experience issues
- `logic` (11 findings) — Functional/behavioral issues
- `security` (1) — Security issue

**Priority Distribution (Dashboard):**
- P0 (blocker): 14
- P1 (critical): 36
- P2 (important): 3

**Example Dashboard Findings:**
- "Draft Expectations Not Activated" (P0)
- "Missing Validation Commands" (P1)
- "Draft Expectations Document Not Activated" (P0)

#### Root Cause Analysis

**Severity**: 🔴 **CRITICAL** — The dashboard is missing 82 findings while reporting only 53 different ones.

The divergence suggests:

1. **No data layer auditing** — Dashboard isn't catching:
   - Migration gaps (8 findings)
   - Schema violations (6)
   - Database constraint issues
   - FK/RLS configuration problems
   
2. **No performance auditing** — Missing:
   - N+1 query patterns (4)
   - Cache staleness issues (1)
   - Bundle size issues (2)
   - API cost implications (3)

3. **No architectural validation** — Missing:
   - Auth bypass risks (1)
   - Deploy risks (1)
   - Race conditions (1)
   - Type drift issues (4)

4. **Narrow categorization** — Dashboard collapses 36 manual categories into 3, losing issue classification fidelity.

---

## Additional Projects

### Embr (Manual Only)
- **78 findings** in manual LYRA runs
- **No dashboard equivalent** — This project isn't being audited through dashboard
- **Risk**: Zero visibility into embr quality through dashboard

### Advocera (Dashboard Only)
- **1 finding** in dashboard: "Missing Validation Commands" (P0, blocker)
- **No manual equivalent** — This project doesn't appear to be in your manual audit rotation
- **Possible reason**: Advocera is early-stage or just added to dashboard

---

## Structural Issues with Dashboard Implementation

### 1. **Different Schema for Output**
- Manual files use key: `"findings"`
- Dashboard files use key: `"open_findings"`
- Indicates different schema versions or different output pipelines

### 2. **Finding Type Collapse**
Manual reports diverse types: `debt`, `bug`, `question`, `enhancement`
Dashboard reports only: `bug`

This means:
- No debt items are being escalated
- No questions/uncertainties are being flagged
- No enhancement opportunities are being tracked

### 3. **Category System Too Broad**
Dashboard categories (`ux`, `logic`, `security`) are parent-level abstractions.
Manual categories are **specific problem patterns** that enable targeted fixes.

| Manual | Dashboard |
|--------|-----------|
| `n-plus-one` | `logic` |
| `cache-staleness` | `logic` |
| `missing-rls` | `security` |
| `auth-bypass` | `security` |
| `copy-mismatch` | `ux` |
| `missing-state` | `ux` |

Loss of specificity = harder to triage and fix.

### 4. **No Meta-Validation**
Manual catches schema violations in auditor output (`synth-debt`).
Dashboard doesn't validate its own auditor pipeline.
Risk: Garbage in = garbage out, undetected.

---

## Recommended Fixes for Dashboard Quality

### High Priority (Do First)
1. **Enable data layer auditing** in dashboard
   - Add migration gap detection
   - Add schema/FK constraint validation
   - Add RLS policy validation

2. **Restore finding type diversity**
   - Dashboard should report `debt`, `question`, `enhancement` findings
   - Current `bug`-only approach loses context

3. **Implement auditor output validation**
   - Dashboard should run the same meta-validation you do manually
   - Catch schema violations in auditor output before surfacing

### Medium Priority
4. **Preserve category taxonomy**
   - Don't collapse manual's 36-category system to 3
   - At minimum, use as-is; better: use as facets for filtering

5. **Add Embr & Advocera to consistent audit** 
   - Embr: 78 findings in manual, 0 in dashboard (gap)
   - Advocera: 1 finding in dashboard, 0 in manual (incomplete)

6. **Align finding priority levels**
   - Manual: P0, P1, P2, P3
   - Dashboard: P0, P1, P2 (missing P3)
   - Standardize

### Lower Priority
7. **Add filtering/faceting** by category to dashboard UI
   - Manual's rich categories are valuable for triage
   - Make them explorable in the dashboard interface

8. **Track finding lifecycle** consistently
   - Both should use same `last_seen_at`, `first_seen_at` fields
   - Enable trend analysis across manual and dashboard runs

---

## Workflow Recommendations

### To Avoid Quality Loss

**Until dashboard is fixed:**
- Continue running manual audits as source of truth
- Use dashboard for quick UX/accessibility spot-checks
- Don't rely on dashboard for architectural/data integrity validation
- Don't trust dashboard for performance/cost findings

**Longer term:**
- Align dashboard pipeline with manual pipeline
- Run same auditor suite
- Apply same categorization
- Validate auditor output integrity

### For Investor Storytelling

The gap between manual and dashboard findings is actually a **feature**:
- Manual = deep, exhaustive, multi-dimensional audit (your edge)
- Dashboard = accessible subset for quick team reviews

**Positioning**: LYRA offers layered quality control:
- Dashboard tier: Fast UX/accessibility validation
- Enterprise tier: Full architectural + data + performance audit

---

## Appendix: Detailed Finding Categories

### Manual Categories (Relevnt Only - Showing Reach)
```
a11y-gap, api-cost, architecture, async-bug, async-inefficiency, auth, 
auth-bypass, broken-flow, build-config, bundle-size, cache-miss, 
cache-staleness, code-quality, constraint-violation, copy-mismatch, 
data-mismatch, dead-code, deploy-risk, error-handling, migration-dependency, 
migration-gap, missing-error-boundary, missing-method-guard, missing-rls, 
missing-state, missing-ui-state, missing-validation, n-plus-one, 
nav-dead-end, orphaned-data, race-condition, schema-mismatch, 
schema-violation, session-storage-usage, type-drift, type-error, 
validation-gap
```

### Dashboard Categories (Relevnt)
```
logic, security, ux
```

### Severity/Priority Alignment
Both use `severity` + `priority` fields, but current values suggest:
- Severity: `blocker`, `critical`, `warning`, `info`
- Priority: `P0`, `P1`, `P2`, `P3`

Dashboard should mirror manual values to maintain consistency.

---

## Next Steps

1. **Diagnostic**: Run manual audits on Codra/Relevnt with verbose logging to identify which auditors produce which findings
2. **Parity check**: Compare dashboard auditor configuration to manual configuration
3. **Fix auditor list**: Dashboard likely needs additional auditors enabled
4. **Test cycle**: Run dashboard after fixes and re-compare these reports
5. **Stakeholder comms**: Document the interim UX/accessibility focus as intentional dashboard scope (not a bug)
