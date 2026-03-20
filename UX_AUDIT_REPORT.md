# Lyra Dashboard – UX & Product Audit Report

**Audit Date:** March 20, 2026
**Auditor:** Senior Product Manager / UX Systems Designer
**Scope:** Dashboard primary flows, empty states, navigation, feedback, and naming conventions

---

## Executive Summary

The Lyra dashboard successfully communicates its technical purpose (audit findings, repair queuing, orchestration management) but suffers from several confusing interaction patterns, ambiguous feedback, and unclear semantic choices that will trap or disorient users in real-world use. Most issues arise not from missing features but from **misalignment between user expectations and system behavior**, particularly in status feedback, navigation, and the import flow.

**Core user goals identified:**
- Import and organize code audit findings
- Review findings and understand their severity/impact
- Move findings through a fix workflow (open → in_progress → done)
- Queue automated repairs and monitor their progress
- Understand system state (repair queue, model routing, orchestration)

---

## UX Bug List

### UX-001: Ambiguous Login Copy – Two Secret Names Confuse Users

**Flow/Screen:** DashboardLogin (page.tsx, ~line 205)
**Type:** Copy/semantics bug
**Severity:** Major
**Symptom:** User reads "Enter the same value as `DASHBOARD_API_SECRET` or `ORCHESTRATION_ENQUEUE_SECRET`" and doesn't know which one to use or when each applies. Confusion is compounded by mention of CI/Netlify context in the same paragraph.

**Root Cause:** The help text mixes three separate use cases (local dev, production, CI) without clear separation. Users can't quickly determine which secret they need.

**Proposed change:**
```
Current:
"Enter the same value as DASHBOARD_API_SECRET or ORCHESTRATION_ENQUEUE_SECRET from
dashboard/.env.local (local dev) or Netlify env (production). CI and Netlify functions
use Authorization: Bearer …"

Suggested:
"Enter your API secret to unlock the dashboard.

• Local dev: Use DASHBOARD_API_SECRET from dashboard/.env.local
• Production: Use ORCHESTRATION_ENQUEUE_SECRET from Netlify environment
• CI/Workers: Use Authorization: Bearer [same value]

Don't have a secret? Leave blank if auth is disabled."
```

---

### UX-002: Import Modal Layout Obscures What's Optional vs. Required

**Flow/Screen:** ImportModal (page.tsx)
**Type:** UX flow bug / Copy bug
**Severity:** Major
**Symptom:** User sees three input sections (Project name, Repository URL, File upload, Paste JSON) and doesn't understand which combinations are valid. The current layout implies a linear flow, but actually: `(name OR derived from repo) AND (JSON file OR paste OR empty)`.

**Root Cause:** Form sections are presented in sequence with ambiguous labels. "Or paste JSON, or leave blank for an empty project" appears *after* the file upload, implying it's an afterthought, when it's actually a primary entry path.

**Proposed change:**
```
Restructure to 2 clear sections:

SECTION 1: "Project identity (required)"
├─ Choose one:
│  ├─ Project name: [textbox] (required if no repo URL)
│  └─ Repository URL: [textbox] (auto-derives name if blank)

SECTION 2: "Audit findings (optional)"
├─ Choose one:
│  ├─ Load from file: [drag/drop zone]
│  ├─ Paste JSON: [textarea]
│  └─ Start empty: (leave both blank)

[Onboard button]
```

This clarifies that (1) name/repo are alternatives, (2) JSON input is optional, and (3) users can create projects with no findings initially.

---

### UX-003: No Loading State or Success Message on Import

**Flow/Screen:** ImportModal → page.tsx handleImport
**Type:** Feedback bug
**Severity:** Major
**Symptom:** User clicks "Onboard" button. Cursor doesn't change, button doesn't show loading state, and nothing happens for 1-2 seconds. User doesn't know if the action succeeded and may click again.

**Root Cause:** The `handleSubmit` function calls `onImport()` (async) without showing loading feedback. The button has no `disabled` or loading state.

**Proposed change:**
```typescript
// Add loading state:
const [submitting, setSubmitting] = useState(false);

async function handleSubmit() {
  const trimmedName = name.trim();
  // ... validation ...
  setSubmitting(true);
  try {
    await onImport({ /* ... */ });
    // Success: Modal closes automatically via parent
  } catch (e) {
    setError(e instanceof Error ? e.message : String(e));
  } finally {
    setSubmitting(false);
  }
}

// Update button:
<button
  type="button"
  onClick={handleSubmit}
  disabled={submitting}
  style={{ /* ... */ }}
>
  {submitting ? "onboarding…" : "Onboard"}
</button>
```

---

### UX-004: "Back" Navigation Button Direction Is Semantically Backwards

**Flow/Screen:** ProjectView (back button at top, ~line 97)
**Type:** Copy/semantics bug
**Severity:** Minor
**Symptom:** Button text reads "← portfolio" but arrow points left. Users expect "← back" or "< back". The arrow doesn't clearly indicate direction of navigation (up in hierarchy, not left on screen).

**Root Cause:** Inconsistent mental model: arrow direction (←) doesn't match hierarchy direction (up/out).

**Proposed change:**
```
Current: "← portfolio"
Option A (clearest): "← back to portfolio"
Option B (concise): "back"
Option C (chevron style): "< portfolio"

Recommended: "← back to portfolio" – explicitly states the direction and destination.
```

---

### UX-005: Empty Findings State Is Ambiguous About Whether It's Good or Bad

**Flow/Screen:** ProjectView, filtered to show no results
**Type:** Feedback bug / Copy bug
**Severity:** Minor
**Symptom:** When a project has no active findings, the screen shows icon "✓" with text "No active findings". User sees a checkmark and might think "great, nothing to do," but doesn't understand context: is this a complete state? Should they run an audit? Is the project good?

**Root Cause:** The checkmark icon is appropriately positive when findings are truly resolved, but ambiguous when genuinely empty (no audit has run, or findings were cleared).

**Proposed change:**
```
Differentiate empty from resolved:

If filter === "active" && filtered.length === 0 && project.findings.length > 0:
  // Filtered to nothing
  title: "No active findings"
  icon: "→" (or "✓" with better copy)

If filter === "active" && findings.length === 0:
  // Truly empty—no findings at all
  title: "No findings yet. Run an audit to discover issues."
  icon: "◆" (diamond, neutral)
  action: <button>Run audit</button> (if orchestration available)

If resolved.length > 0 && active.length === 0:
  // All fixed
  title: "All findings resolved. Ready to ship."
  icon: "✓"
```

---

### UX-006: Queue Repair Success Feedback Is Too Subtle and Ephemeral

**Flow/Screen:** FindingDetail panel, queue repair button (~line 272)
**Type:** Feedback bug
**Severity:** Major
**Symptom:** User clicks "queue repair →" button. A small label appears below: "Queued." or "Failed." in 11px monospace text. It disappears or gets replaced after a few seconds. User might miss it entirely, especially if they've already navigated away.

**Root Cause:** Success feedback is delegated to a small text label in the actions footer. No toast, badge update, or persistent indicator shows the repair was queued.

**Proposed change:**
```
Option A (Persistent badge): Once queued, replace the button with a colored badge:
  <span style={{
    background: "var(--ink-amber-bg)",
    border: "0.5px solid var(--ink-amber-border)",
    color: "var(--ink-amber)",
    padding: "4px 10px",
    borderRadius: "3px"
  }}>
    ◎ queued for repair
  </span>

Plus, update the Finding status badge in the list to also show "queued for repair"
instead of previous status, so it persists as user navigates.

Option B (Toast): Show a system toast at top/bottom of viewport:
  "Repair queued for UX-042 · dismiss"

Recommended: Option A + update finding's queued status in list, so it's discoverable.
```

---

### UX-007: Finding Status State Machine Is Opaque – Users Don't Know Available Next Steps

**Flow/Screen:** FindingDetail panel, action buttons (~line 238)
**Type:** Discoverability bug / UX flow bug
**Severity:** Major
**Symptom:** User opens a finding and sees action buttons like "Start fix" and "Defer". They don't understand:
  - What happens if they click "Start fix"? Does it automatically run? Does it just change a label?
  - How do they mark a finding as actually fixed?
  - What's the difference between "Defer" and "won't fix"?
  - Why do different statuses show different button sets?

**Root Cause:** Status machine is encoded in conditionals (line 238+) with no visible state diagram or help text. Users must infer the workflow from button labels alone.

**Proposed change:**
```typescript
// Add a "status workflow" section above the action buttons:

const WORKFLOW_HINTS: Record<FindingStatus, { hint: string; nextSteps: string[] }> = {
  open: {
    hint: "Finding is new and unresolved.",
    nextSteps: ["Start fix (begin work)", "Defer (postpone)", "Won't fix (intentional)"]
  },
  in_progress: {
    hint: "You're actively working on this fix.",
    nextSteps: ["Mark done (work complete, pending verification)"]
  },
  fixed_pending_verify: {
    hint: "Fix is implemented; needs verification.",
    nextSteps: ["Verify fix (confirm it works)", "Reopen (fix didn't work)"]
  },
  // ...
};

// Render:
<div style={{ fontSize: "11px", color: "var(--ink-text-3)", marginBottom: "1rem" }}>
  {WORKFLOW_HINTS[finding.status]?.hint}
</div>

// And document the action buttons:
<button type="button" onClick={...} title="Move to 'in_progress' status">
  Start fix
</button>
```

Alternatively, add a collapsible "How to fix findings" help section in the sidebar with the full state machine.

---

### UX-008: "Ship" Readiness Indicator Is Cryptic

**Flow/Screen:** ProjectView header (~line 112)
**Type:** Copy/semantics bug
**Severity:** Minor
**Symptom:** When a project meets readiness, a green "✓ ship" indicator appears. User doesn't understand:
  - What does "ship" mean? (Deploy? Release?)
  - Why are blockers and questions the only blockers to shipping?
  - What do I do now that it's shippable?

**Root Cause:** "Ship" is jargon from startups/ops context; not all users will understand. No explanation of the criteria.

**Proposed change:**
```
Change from: "✓ ship"
Change to: "✓ ready to deploy" or add a tooltip

On hover, show:
"Deployment ready
• No blockers
• No open questions
• All pending items resolved

Next: Review the fix summary and deploy."

Or, replace the checkmark badge with a more actionable card:
<div style={{ padding: "0.75rem", border: "1px solid var(--ink-green)", borderRadius: "var(--radius-md)" }}>
  <strong style={{ color: "var(--ink-green)" }}>Ready to deploy</strong>
  <p style={{ fontSize: "11px", margin: "0.25rem 0 0" }}>
    All blockers resolved. No open questions. You can merge and deploy.
  </p>
  <button onClick={handleDeploy}>Merge to main</button>
</div>
```

---

### UX-009: "Pending" Status Filter Label Is Not Self-Explanatory

**Flow/Screen:** ProjectView filter bar (~line 216)
**Type:** Copy/semantics bug
**Severity:** Minor
**Symptom:** Filter buttons show "active (5) · pending (2) · resolved (8) · all (15)". User doesn't know what "pending" means. Looking at the code, "pending" maps to `["fixed_pending_verify"]` – but that's not obvious from the label.

**Root Cause:** "Pending" is ambiguous: pending action? pending user input? pending approval?

**Proposed change:**
```
Change: "pending" → "pending_verification" or "pending_approval"

Or add tooltips:
<button title="Finding has fix applied, awaiting verification">
  pending ({counts.pending})
</button>

Or be more explicit in filter UI:
active | awaiting_fix | awaiting_verification | resolved | all
```

---

### UX-010: Sync Now Button Provides No Feedback About What It's Doing or How Long It Takes

**Flow/Screen:** Shell (sidebar footer, ~line 254)
**Type:** Feedback bug
**Severity:** Minor
**Symptom:** User clicks "sync now" in the sidebar. Text changes to "syncing…" but then nothing visible happens for several seconds. User doesn't know:
  - What is being synced? (Findings? Orchestration state?)
  - How long will it take?
  - Did it succeed or fail if text doesn't change?

**Root Cause:** Loading state only shows as text change; no progress indicator, no success/failure message shown to user.

**Proposed change:**
```
Add success/error message below button:

const [syncMsg, setSyncMsg] = useState<string | null>(null);
// ... already exists at line 46 ...

Then, in handleSync (line 57), set success/failure message:
  if (res.ok) setSyncMsg("Synced. Findings updated.");
  else setSyncMsg("Sync failed. Try again.");

Auto-dismiss after 3 seconds:
  useEffect(() => {
    if (syncMsg) {
      const timer = setTimeout(() => setSyncMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [syncMsg]);

Render:
<button onClick={handleSync} disabled={syncing}>
  {syncing ? "syncing…" : "sync now"}
</button>
{syncMsg && (
  <div style={{
    fontSize: "10px",
    color: syncMsg.includes("failed") ? "var(--ink-red)" : "var(--ink-green)",
    marginTop: "0.25rem"
  }}>
    {syncMsg}
  </div>
)}
```

---

### UX-011: Orchestration Section Collapses on Error – Users Can't Take Action

**Flow/Screen:** OrchestrationPanel (~line 295)
**Type:** UX flow bug
**Severity:** Major
**Symptom:** If the orchestration API fails (e.g., database not configured), the entire OrchestrationPanel returns `null`, leaving users unable to:
  - Understand what went wrong
  - Know if orchestration is available
  - See the queue or take alternative actions

Users also lose visibility into whether orchestration *should* work.

**Root Cause:** When `!data`, the component returns `null` after logging error. Error is shown only if `loadError` is set, but that line returns `null` anyway.

**Proposed change:**
```typescript
// Current code (line 295-303):
if (!data) {
  if (loadError) {
    return (
      <div style={{ ... }}>
        {loadError}
      </div>
    );
  }
  return null;  // <-- Users see nothing
}

// Suggested:
if (!data) {
  return (
    <section style={{ ... }}>
      <div style={{ fontSize: "9px", ... }}>Orchestration</div>
      {loadError ? (
        <div style={{ color: "var(--ink-red)", ... }}>
          <strong>Orchestration unavailable:</strong> {loadError}
          <button onClick={() => load(undefined, { bypassCache: true })}>
            Retry
          </button>
        </div>
      ) : (
        <div style={{ color: "var(--ink-text-4)" }}>
          Initializing orchestration...
        </div>
      )}
    </section>
  );
}
```

This keeps the section visible and informative even when the API fails.

---

### UX-012: Finding Status Updates Have No Loading State – User Might Click Twice

**Flow/Screen:** FindingDetail action buttons (~line 240-269)
**Type:** Feedback bug
**Severity:** Minor
**Symptom:** User clicks "Start fix". Button remains clickable for 1-2 seconds while API call is in flight. If network is slow, user might click again, causing duplicate requests.

**Root Cause:** `onAction` async call isn't tracked with loading state; buttons don't disable during the request.

**Proposed change:**
```typescript
// Add loading state in FindingDetail:
const [actionInFlight, setActionInFlight] = useState<string | null>(null);

const handleAction = async (findingId: string, newStatus: FindingStatus) => {
  setActionInFlight(findingId);
  try {
    await onAction(findingId, newStatus);
  } catch (e) {
    setActionError(e.message);
  } finally {
    setActionInFlight(null);
  }
};

// Disable buttons during flight:
<button
  type="button"
  onClick={() => handleAction(finding.finding_id, "in_progress")}
  disabled={actionInFlight === finding.finding_id}
>
  {actionInFlight === finding.finding_id ? "…" : "Start fix"}
</button>
```

---

### UX-013: Engine View Routing Table Is Hard to Scan – Task Names Use Underscores

**Flow/Screen:** EngineView task routing table (~line 217)
**Type:** Copy/semantics bug
**Severity:** Minor
**Symptom:** Table shows task names like `generate_pseudo_code_fixes` and `apply_code_patches`. User has to parse underscores and infer what the task does. No legend or hover tooltips explain each task.

**Root Cause:** Task names are technical identifiers; users need semantic explanations.

**Proposed change:**
```typescript
const TASK_LABELS: Record<string, string> = {
  generate_pseudo_code_fixes: "Code fix generation",
  apply_code_patches: "Patch application",
  run_tests: "Test execution",
  validate_output: "Output validation",
  // ...
};

// In table:
<span style={{ ... }}>
  {TASK_LABELS[task] || task.replace(/_/g, " ")}
</span>
<span style={{ fontSize: "9px", color: "var(--ink-text-4)", marginLeft: "0.25rem" }}>
  ({task})  {/* Show technical name in parens for reference */}
</span>
```

---

### UX-014: Project Removal Uses Native confirm() – Inconsistent and No Recovery Path on Error

**Flow/Screen:** page.tsx handleRemove (~line 160)
**Type:** UX flow bug
**Severity:** Minor
**Symptom:** User clicks remove button on a project. Native browser `confirm()` dialog appears (not styled like the app). If they click yes but the DELETE fails, error message appears but user has already mentally closed the tab. The error doesn't show where to retry.

**Root Cause:** Native browser confirm is used instead of app-styled modal. Error doesn't link back to the project or provide clear next step.

**Proposed change:**
```typescript
// Replace browser confirm with app-styled modal:

const [removeConfirmProject, setRemoveConfirmProject] = useState<string | null>(null);

// Then in render:
{removeConfirmProject && (
  <div role="dialog" style={{ ... }}>
    <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
      Remove {removeConfirmProject}?
    </div>
    <p style={{ fontSize: "11px", marginBottom: "0.75rem" }}>
      This cannot be undone. All findings and audit history for this project will be deleted.
    </p>
    <div style={{ display: "flex", gap: "0.5rem" }}>
      <button
        onClick={() => handleRemove(removeConfirmProject)}
        style={{ color: "var(--ink-red)" }}
      >
        Remove
      </button>
      <button onClick={() => setRemoveConfirmProject(null)}>
        Cancel
      </button>
    </div>
  </div>
)}
```

Also, on error, keep the dialog open and show:
```
<div style={{ color: "var(--ink-red)" }}>
  Could not remove {projectName}. {errorMsg}
  <button onClick={() => setRemoveError(null)}>Try again</button>
</div>
```

---

### UX-015: "Engine" Navigation Label Doesn't Hint at Its Purpose

**Flow/Screen:** Shell sidebar nav (~line 169)
**Type:** Discoverability bug
**Severity:** Minor
**Symptom:** New user sees nav button labeled "Engine" with a queue count. They don't understand:
  - Is this for running audits?
  - Is this for monitoring repairs?
  - What is an "engine" in this context?

**Root Cause:** "Engine" is an implementation detail; users need functional labels.

**Proposed change:**
```
Change: "Engine" → "Repair queue" or "Repairs"

Or add tooltip on hover:
title="Repair queue and model routing configuration"

Or use longer label if space allows:
"Repair Queue"

And add help icon (?) that reveals:
"Monitor automated repair jobs, configure model routing, and check costs."
```

---

### UX-016: No Indication Which Secret Is Currently Active (for Enqueue)

**Flow/Screen:** OrchestrationPanel secret input (~line 333)
**Type:** Feedback bug
**Severity:** Minor
**Symptom:** User pastes enqueue secret into the field. Field changes to a masked password input but doesn't indicate the secret is now active/saved. User might wonder if they need to click a button to confirm, or if it auto-saved.

**Root Cause:** Input uses no visual feedback (no checkmark, no "saved" message). Auto-saves to session storage but user doesn't see confirmation.

**Proposed change:**
```typescript
const [secretSaved, setSecretSaved] = useState(false);

const persistSecret = (v: string) => {
  setEnqueueSecret(v);
  setSecretSaved(false);
  try {
    if (v.trim()) {
      sessionStorage.setItem(LYRA_ENQUEUE_SECRET_STORAGE_KEY, v.trim());
      // Show success feedback:
      setSecretSaved(true);
      setTimeout(() => setSecretSaved(false), 2000);
    } else {
      sessionStorage.removeItem(LYRA_ENQUEUE_SECRET_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
};

// Render:
<div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
  <input
    type="password"
    placeholder="paste secret to enable Run buttons"
    value={enqueueSecret}
    onChange={(e) => persistSecret(e.target.value)}
    style={{ ... }}
  />
  {secretSaved && (
    <span style={{ fontSize: "10px", color: "var(--ink-green)" }}>
      ✓ saved
    </span>
  )}
</div>
```

---

### UX-017: Linear Sync and Project Audit History Components Are Unexplained

**Flow/Screen:** ProjectView (~line 158-160)
**Type:** Discoverability bug
**Severity:** Minor
**Symptom:** User sees two components rendered in project view:
  - `<LinearSync projectName={project.name} />`
  - `<ProjectAuditHistory projectName={project.name} />`

But there's no label or explanation. User doesn't understand:
  - What is "Linear Sync"?
  - Why is audit history shown here?
  - How do I use these?

**Root Cause:** Components are rendered inline without context or section labels.

**Proposed change:**
```
Add section labels:

<div style={{ marginBottom: "1.5rem", fontSize: "9px", fontWeight: 500, ... }}>
  Integrations
</div>
<LinearSync projectName={project.name} />

<div style={{ marginBottom: "1.5rem", fontSize: "9px", fontWeight: 500, ... }}>
  Audit History
</div>
<ProjectAuditHistory projectName={project.name} />
```

Or, if these components have self-descriptive internal headers, ensure they're visible and explanatory.

---

### UX-018: Error Messages Sometimes Truncated Without Indication

**Flow/Screen:** EngineView (~line 139, 259); OrchestrationPanel (~line 143)
**Type:** Feedback bug
**Severity:** Minor
**Symptom:** When API errors occur, messages are cut at 120-200 characters (e.g., "Could not load routing (400): ..."). User can't read the full error and doesn't know there's more text.

**Root Cause:** Error text is truncated for display but no ellipsis or "show more" button is provided.

**Proposed change:**
```typescript
// Instead of truncating:
const errText = await response.text();
setError(`Could not load (${response.status}): ${errText.slice(0, 200)}`);

// Make it expandable:
const [showFullError, setShowFullError] = useState(false);
const maxPreviewChars = 200;

<div style={{ ... }}>
  {showFullError ? errText : `${errText.slice(0, maxPreviewChars)}${errText.length > maxPreviewChars ? '…' : ''}`}
  {errText.length > maxPreviewChars && (
    <button
      onClick={() => setShowFullError(!showFullError)}
      style={{ marginLeft: "0.5rem", textDecoration: "underline", fontSize: "10px" }}
    >
      {showFullError ? "hide" : "show more"}
    </button>
  )}
</div>
```

---

## Cross-Flow Patterns

### Pattern 1: No Loading States on Async Actions
**Affected flows:** Import, status updates, queue repair, repair deletion, sync, dispatch actions.
**Issue:** Many async operations lack visual feedback (disabled buttons, loading text, spinners). Users can't tell if their action succeeded and may retry.
**Fix:** Add loading state tracking to all async operations. Disable buttons/inputs during flight.

---

### Pattern 2: Success Feedback Is Weak or Ephemeral
**Affected flows:** Queue repair, status updates, sync, import.
**Issue:** Success messages are small text that fades or appears briefly. Important state changes aren't celebrated or persisted visually.
**Fix:** Use persistent badges, toast notifications, or status updates in lists to confirm actions.

---

### Pattern 3: Semantic/Jargon Mismatch
**Affected flows:** Status labels ("pending"), action labels ("Start fix"), feature names ("Engine", "ship").
**Issue:** Labels assume technical knowledge or use ambiguous terms.
**Fix:** Audit all labels for user-facing clarity. Add tooltips, help text, or rename to functional terms.

---

### Pattern 4: Error States Hide Content Instead of Showing Fallbacks
**Affected flows:** Orchestration panel, engine view.
**Issue:** When APIs fail, entire sections collapse or return null. Users lose visibility.
**Fix:** Always show the section container with error messaging and retry option.

---

### Pattern 5: Status State Machines Are Invisible
**Affected flows:** Finding status workflow.
**Issue:** Users must infer the workflow from button availability. No help text or state diagram.
**Fix:** Document workflow in UI with tooltips, state hints, or a collapsible guide.

---

## Product Coherence Notes

### Finding Status Workflow Is Unclear
The system defines a specific state machine for finding statuses (open → in_progress → fixed_pending_verify → fixed_verified), but:
- The state machine isn't documented in UI
- Button labels don't clearly indicate state transitions
- "Defer" and "Won't fix" are treated as "resolved" but their difference isn't explained
- Users can't distinguish between "fixed but unverified" and "deferred intentionally"

**Recommendation:** Make the state machine explicit in a help section or in-context tooltips. Consider clearer status names: `{open, in_progress, done_pending_review, done_verified, intentionally_deferred, wont_fix}`.

---

### "Ship Readiness" Is a Product Assumption, Not a User Goal
The dashboard includes a "ship" indicator when blockers + questions are zero. However:
- Users might care about other blockers (e.g., performance debt)
- The term "ship" isn't universal—some teams say "merge," "deploy," "release"
- Reaching "shippable" state doesn't suggest the next action

**Recommendation:** Rename to "Ready to deploy" and add an action: "Review summary and merge" or "Go to PR." Make deployment integration explicit.

---

### Orchestration/Enqueue Secrets Are Conflated
The system requires users to know about ORCHESTRATION_ENQUEUE_SECRET, DASHBOARD_API_SECRET, and Bearer tokens. But:
- Local dev, production, and CI all have different conventions
- The login screen conflates all three
- Orchestration secret is a separate input in a separate panel

**Recommendation:** Simplify: use one secret type. Add a setup wizard for first-time users. Make clear what's required vs. optional.

---

### Finding "Queued for Repair" State Is a Side Effect, Not a First-Class Status
When a user queues a repair, the finding isn't marked with a status that indicates "queued for repair." Instead:
- A small badge appears on the card
- The status bar at top right shows "queued for repair"
- But the finding's own status doesn't change (e.g., still shows "in_progress")

This creates cognitive dissonance: is the repair queued or is the finding being worked on?

**Recommendation:** Either (a) add "queued_for_repair" as a status that the finding can be in, or (b) show "queued for repair" as a secondary badge/tag separate from status. Make it visually persistent and scannable in the list view.

---

## Top 5 UX Bugs to Fix First

These fixes unlock immediate user value and remove the biggest sources of confusion:

### 🔴 #1: Add Loading States and Success Feedback (UX-003, UX-006, UX-012, UX-010)

**Impact:** Users will know their actions succeeded and won't accidentally retry.
**Effort:** Low (add state tracking and loading indicators)
**Duration:** 1-2 hours

**Changes:**
- Import modal: show loading state on button, show success message or navigate away
- Queue repair: show persistent badge, update finding status in list
- Status updates: disable buttons during flight, show loading text
- Sync button: show success/failure message with 3-second dismiss

---

### 🔴 #2: Clarify Finding Status Workflow (UX-007, UX-014)

**Impact:** Users understand how to move findings through their fix lifecycle.
**Effort:** Medium (add help text, state machine documentation)
**Duration:** 2-3 hours

**Changes:**
- Add "Status workflow" section above action buttons in FindingDetail
- Show available next steps in natural language
- Add a collapsible "How to fix" guide in the sidebar

---

### 🔴 #3: Restructure Import Modal (UX-002)

**Impact:** Users understand which fields are required and which paths are valid.
**Effort:** Medium (UI redesign, form structure change)
**Duration:** 2-3 hours

**Changes:**
- Group name/repo as alternatives (pick one)
- Group JSON input as alternatives (pick one or none)
- Add clear labels: "Project identity (required)" and "Audit findings (optional)"

---

### 🔴 #4: Improve Error Visibility in Orchestration & Engine Views (UX-011, UX-018)

**Impact:** Users understand what went wrong and know what to do.
**Effort:** Low-Medium (show fallback UI, add expandable errors)
**Duration:** 1-2 hours

**Changes:**
- Keep OrchestrationPanel visible even on error, show retry button
- Add "show more" button for truncated error messages
- Ensure all error states show a clear recovery path

---

### 🔴 #5: Rename Cryptic Labels (UX-001, UX-008, UX-009, UX-013, UX-015)

**Impact:** Users immediately understand features and requirements.
**Effort:** Low (text changes only, add tooltips)
**Duration:** 1-2 hours

**Changes:**
- Login: separate local dev / production / CI instructions
- "Ship" → "Ready to deploy"
- "Pending" → "Pending verification"
- "Engine" → "Repair queue"
- Add TASK_LABELS mapping for engine routing table

---

## Testing Recommendations

To validate fixes, conduct brief usability tests with:

1. **First-time user (no context):** Can they import a project without confusion?
2. **Status update flow:** Can they move a finding from open → in progress → done without guessing?
3. **Queue repair:** Do they see clear feedback that the repair was queued?
4. **Error handling:** When an API fails, do they understand the error and know how to retry?

---

## Summary Table

| ID | Screen | Type | Severity | Fix Effort |
|:---|:-------|:-----|:---------|:-----------|
| UX-001 | Login | Copy | Major | Low |
| UX-002 | Import modal | Flow | Major | Medium |
| UX-003 | Import modal | Feedback | Major | Low |
| UX-004 | ProjectView | Copy | Minor | Low |
| UX-005 | ProjectView | Feedback | Minor | Medium |
| UX-006 | FindingDetail | Feedback | Major | Low |
| UX-007 | FindingDetail | Discoverability | Major | Medium |
| UX-008 | ProjectView header | Copy | Minor | Low |
| UX-009 | ProjectView filter | Copy | Minor | Low |
| UX-010 | Shell sidebar | Feedback | Minor | Low |
| UX-011 | OrchestrationPanel | Flow | Major | Low |
| UX-012 | FindingDetail | Feedback | Minor | Low |
| UX-013 | EngineView | Copy | Minor | Low |
| UX-014 | page.tsx | Flow | Minor | Low |
| UX-015 | Shell nav | Discoverability | Minor | Low |
| UX-016 | OrchestrationPanel | Feedback | Minor | Low |
| UX-017 | ProjectView | Discoverability | Minor | Low |
| UX-018 | EngineView | Feedback | Minor | Low |

---

## Conclusion

The Lyra dashboard successfully communicates its core purpose but suffers from weak feedback loops, ambiguous semantic choices, and hidden workflows. The top five fixes—loading states, status workflow clarity, import modal restructure, error visibility, and label clarity—will remove most sources of user confusion and unlock confidence in the tool.

Most issues are **not** missing features but rather **misalignment between user expectations and system behavior**. Fixing these will make Lyra feel more intentional and reliable.
