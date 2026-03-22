/**
 * User-facing copy for repair / worker concepts (keep implementation terms out of UI).
 */

export const UI_COPY = {
  navPortfolio: "Portfolio",
  /** Sidebar + engine: dashboard record of repairs, not the worker runtime. */
  navRepairLedger: "Repair ledger",
  /** Count badge next to nav item */
  navLedgerCountTitle: "Findings recorded in the repair ledger",
  /** Engine footer / queue section */
  ledgerSectionLabel: "Repair ledger",
  ledgerExplainer:
    "Queuing records intent in this app. The TypeScript audit worker does not drain the repair ledger; patches run separately via the Python repair engine on your checkout (see docs/DASHBOARD.md § “After you queue a repair”).",
  ledgerEmpty: "No ledger entries",
  /** Next action / finding detail */
  addToLedger: "Add to ledger →",
  ledgerAdding: "recording…",
  onLedger: "on repair ledger",
  ledgerIntentHint:
    "Records intent in the dashboard repair ledger only. The audit worker does not apply patches; run the repair engine locally or edit the repo yourself.",
  nextActionOpenProject: "Open in project",
  /** Portfolio Patterns panel (fragile files) */
  nextActionViewPatterns: "View portfolio patterns",
  ledgerRecorded: "Recorded on repair ledger",
  /** Finding detail — closure loop (align with docs/DASHBOARD.md) */
  lifecycleSection: "Closure loop",
  lifecycleLyra: "Lyra record",
  lifecycleRepairLedger: "Repair ledger",
  lifecycleLinear: "Linear",
  lifecycleNextHeading: "What you run outside this app",
  lifecycleLinearNotConfigured: "Linear integration not configured.",
  lifecycleLinearNoIssue: "No Linear issue linked for this finding.",
  lifecycleLinearDrift:
    "Linear last saw a different status than Lyra does now — push an update from the Linear panel if you use issues for tracking.",
  lifecycleRepairNone: "Not on the repair ledger.",
  lifecycleRepairQueued:
    "Ledger row: queued — the Python repair engine (or your editor) still needs to run outside this dashboard.",
  lifecycleRepairRunning: "Ledger row: running (reported externally).",
  lifecycleRepairCompleted: "Ledger row: completed.",
  lifecycleRepairFailed: "Ledger row: failed — see repair queue for detail.",
  lifecycleRepairIntentOnly:
    "Marked on ledger in this session; full job list still loading.",
  lifecycleNextSteps: [
    "Implement or generate fixes in the target checkout (manually or via the Python repair engine with audits/open_findings.json).",
    "Verify the fix, then update Lyra status here when appropriate.",
    "Re-audit from Orchestration or run python3 audits/session.py reaudit in the repo before release.",
  ],
  /** Import modal — merge summary */
  importSummaryHeading: "Import summary",
  importSummaryMergeHint:
    "Compared file rows to the previous project snapshot by finding_id (content fingerprint for updated vs unchanged).",
  importSummaryReplaceHint: "Previous findings list was replaced by the file.",
  importSummaryDone: "Done",
  importSummaryAdded: "New findings",
  importSummaryUpdated: "Updated from file",
  importSummaryUnchanged: "Unchanged (same fingerprint)",
  importSummaryRemoved: "Removed (replaced list)",
  importSummaryTotals: "Totals",
  /** Sidebar: imports audits/open_findings.json + audits/runs into project DB (server filesystem). */
  syncAuditImportLabel: "Import audits from repo",
  syncAuditImportTitle:
    "Reads audits/open_findings.json and audits/runs on the server and merges findings into the dashboard project store. Does not pull from your browser.",
  auditSyncOkShort: "✓ Audits imported",
  auditSyncFailedShort: "✗ Audit import failed",
  /** Engine view when routing API fails */
  engineRoutingDegradedTitle: "Routing unavailable",
  engineRoutingDegradedBody:
    "Task → model mapping could not be loaded. Rows below may be empty or stale until routing loads.",
  /** Confirm dialog */
  confirmRemoveProjectTitle: "Remove project?",
  confirmRemoveProjectBody:
    "This removes the project from Lyra: dashboard record, durable snapshots and events for this project, and queued/completed audit jobs tied to it. Linear mappings and maintenance rows cascade with the project. Your git repository is not affected.",
  confirmDiscardImportTitle: "Discard form?",
  confirmDiscardImportBody: "You have unsaved text in the onboard form.",
  confirmCancel: "Cancel",
  confirmRemove: "Remove",
  confirmDiscard: "Discard",
  /** Project operations sections */
  opsSectionSetup: "Setup & review",
  opsSectionBulk: "Bulk operations & backlog",
  opsSectionLinear: "Linear",
  opsSectionHistory: "Audit history",
  /** Finding save / refresh */
  findingSavedLine: "Saved.",
  findingRefreshFailedLine: "Could not refresh from the server.",
  findingRefreshFailedHint: "Your change is stored. Retry when the connection is back.",
  /** Orchestration panel */
  orchestrationUpdatedPrefix: "Updated",
  /** Host misconfiguration */
  hostMisconfigDetailsSummary: "Deployment details",
  /** Shell — source of truth */
  sourceTruthTitle: "Source of truth",
  sourceTruthBody:
    "This dashboard stores findings in the configured project database. Local CLI workflows use audits/open_findings.json. Use one primary workflow per environment so they do not silently diverge.",
  sourceTruthDocLink: "Workflows table (docs)",
  sourceTruthDocPath: "docs/LYRA_NEAR_TERM_THEMES.md",
  /** Project — export */
  exportOpenFindingsJson: "Export open_findings.json",
  exportOpenFindingsTitle: "Download findings in open_findings.json shape for CLI / repair engine",
} as const;

/** Maintenance backlog `next_action` → short UI label */
export const BACKLOG_NEXT_STEP_LABEL: Record<string, string> = {
  review: "Review",
  plan_task: "Plan task",
  queue_repair: "Queue repair",
  verify: "Verify",
  re_audit: "Re-audit",
  defer: "Defer",
};
