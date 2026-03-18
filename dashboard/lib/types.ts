/**
 * Shared data models for LYRA dashboard.
 * Aligned with open_findings.json schema and project.json.template.
 */

export type Severity = "blocker" | "major" | "minor" | "nit";
export type Priority = "P0" | "P1" | "P2" | "P3";
export type FindingType = "bug" | "enhancement" | "debt" | "question";

export type FindingStatus =
  | "open"
  | "accepted"
  | "in_progress"
  | "fixed_pending_verify"
  | "fixed_verified"
  | "wont_fix"
  | "deferred"
  | "duplicate"
  | "converted_to_enhancement";

export interface ProofHook {
  hook_type?: string;
  type?: string;
  summary?: string;
  value?: string;
  file?: string;
  start_line?: number;
}

export interface SuggestedFix {
  approach?: string;
  affected_files?: string[];
  estimated_effort?: string;
  risk_notes?: string;
  tests_needed?: string[];
}

export interface HistoryEvent {
  timestamp: string;
  actor: string;
  event: string;
  notes?: string;
}

export interface Finding {
  finding_id: string;
  title: string;
  description?: string;
  type: FindingType;
  severity: Severity;
  priority: Priority;
  status: FindingStatus;
  confidence?: string;
  category?: string;
  proof_hooks?: ProofHook[];
  suggested_fix?: SuggestedFix;
  history?: HistoryEvent[];
}

export interface Project {
  name: string;
  findings: Finding[];
  lastUpdated?: string;
  repositoryUrl?: string;
  /** Optional: stack/hosting from project.json.template */
  stack?: {
    language?: string;
    framework?: string;
    build?: string;
    hosting?: string;
    database?: string;
    css?: string;
  };
}

export interface SyncMapping {
  linear_id: string;
  identifier?: string;
  url?: string;
  lyra_status: FindingStatus;
  created_at?: string;
  last_synced?: string;
}

export interface SyncState {
  mappings: Record<string, SyncMapping>;
  last_sync: string | null;
}

/** Open findings file schema (import/export) */
export interface OpenFindingsSchema {
  schema_version?: string;
  open_findings: Finding[];
  findings?: Finding[];
}

/** A finding queued to the repair engine from the dashboard. */
export interface RepairJob {
  finding_id: string;
  project_name: string;
  queued_at: string;
  status: "queued" | "running" | "completed" | "failed";
  patch_applied?: boolean;
  cost_usd?: number;
  provider_used?: string;
  completed_at?: string;
  error?: string;
}
