-- Portfolio-scale constraint audit tables
-- Supports auditing across 13 projects with full history and violation tracking

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Main portfolio audit history table
CREATE TABLE IF NOT EXISTS lyra_portfolio_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id TEXT NOT NULL UNIQUE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Audit metadata
  total_projects INTEGER NOT NULL,
  projects_audited JSONB NOT NULL, -- Array of project IDs
  audit_type TEXT NOT NULL DEFAULT 'full', -- full, quick, critical-only
  trigger_source TEXT NOT NULL, -- scheduled, manual, pr, push, deployment
  difficulty TEXT NOT NULL DEFAULT 'all', -- easy, moderate, complex, all

  -- Aggregated results
  total_constraints INTEGER NOT NULL,
  total_passed INTEGER NOT NULL,
  total_failed INTEGER NOT NULL,
  total_warnings INTEGER NOT NULL,
  portfolio_compliance_percentage NUMERIC(5,2) NOT NULL,
  sla_status TEXT NOT NULL, -- pass, fail

  -- Project breakdown (JSONB for flexibility)
  project_results JSONB NOT NULL, -- [{projectId, compliance, passed, failed, ...}, ...]

  -- Trending and analysis
  common_failures JSONB, -- Top failing constraints
  critical_violations_count INTEGER DEFAULT 0,
  escalation_count INTEGER DEFAULT 0,

  -- Performance metrics
  total_duration_ms INTEGER,
  average_check_time_ms INTEGER,

  -- Metadata
  audited_by TEXT DEFAULT 'system',
  notes TEXT,
  metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on commonly queried fields
CREATE INDEX idx_portfolio_audits_timestamp ON lyra_portfolio_audits(timestamp DESC);
CREATE INDEX idx_portfolio_audits_run_id ON lyra_portfolio_audits(run_id);
CREATE INDEX idx_portfolio_audits_sla_status ON lyra_portfolio_audits(sla_status);
CREATE INDEX idx_portfolio_audits_created_at ON lyra_portfolio_audits(created_at DESC);

-- Per-project compliance tracking
CREATE TABLE IF NOT EXISTS lyra_project_compliance_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID NOT NULL REFERENCES lyra_portfolio_audits(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,

  -- Results for this project
  total_constraints INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  failed INTEGER NOT NULL,
  warnings INTEGER NOT NULL,
  compliance_percentage NUMERIC(5,2) NOT NULL,
  status TEXT NOT NULL, -- pass, warning, fail

  -- Trending
  previous_compliance NUMERIC(5,2),
  compliance_change NUMERIC(5,2),
  trend TEXT, -- up, down, stable

  -- Metadata
  violations_details JSONB, -- [{constraint_id, severity, remediation}, ...]
  duration_ms INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_compliance_project_id ON lyra_project_compliance_history(project_id);
CREATE INDEX idx_project_compliance_audit_id ON lyra_project_compliance_history(audit_id);
CREATE INDEX idx_project_compliance_created_at ON lyra_project_compliance_history(created_at DESC);

-- Portfolio-wide violations table (for aggregation and trending)
CREATE TABLE IF NOT EXISTS lyra_portfolio_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID NOT NULL REFERENCES lyra_portfolio_audits(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,

  -- Violation details
  constraint_id TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  severity TEXT NOT NULL, -- critical, major, minor

  -- State
  current_state TEXT,
  expected_state TEXT,

  -- Remediation
  remediation TEXT,
  auto_fix_available BOOLEAN DEFAULT FALSE,
  auto_fix_suggestion JSONB,

  -- Location
  file_path TEXT,
  line_number INTEGER,
  context TEXT,

  -- Metadata
  details JSONB,
  violation_age INTEGER, -- How many audits has this been failing?

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_portfolio_violations_audit_id ON lyra_portfolio_violations(audit_id);
CREATE INDEX idx_portfolio_violations_project_id ON lyra_portfolio_violations(project_id);
CREATE INDEX idx_portfolio_violations_constraint_id ON lyra_portfolio_violations(constraint_id);
CREATE INDEX idx_portfolio_violations_severity ON lyra_portfolio_violations(severity);
CREATE INDEX idx_portfolio_violations_created_at ON lyra_portfolio_violations(created_at DESC);

-- SLA breach tracking
CREATE TABLE IF NOT EXISTS lyra_sla_breaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID NOT NULL REFERENCES lyra_portfolio_audits(id) ON DELETE CASCADE,

  -- Breach details
  breach_type TEXT NOT NULL, -- per_project, portfolio, critical
  project_id TEXT, -- NULL if portfolio-wide

  -- Values
  minimum_required NUMERIC(5,2) NOT NULL,
  actual_value NUMERIC(5,2) NOT NULL,
  difference NUMERIC(5,2) NOT NULL,

  -- Response
  escalation_level INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open', -- open, acknowledged, resolved
  assigned_to TEXT,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sla_breaches_audit_id ON lyra_sla_breaches(audit_id);
CREATE INDEX idx_sla_breaches_status ON lyra_sla_breaches(status);
CREATE INDEX idx_sla_breaches_project_id ON lyra_sla_breaches(project_id);

-- Escalation actions
CREATE TABLE IF NOT EXISTS lyra_escalation_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  violation_id UUID REFERENCES lyra_portfolio_violations(id) ON DELETE SET NULL,
  sla_breach_id UUID REFERENCES lyra_sla_breaches(id) ON DELETE SET NULL,

  project_id TEXT NOT NULL,
  severity TEXT NOT NULL, -- critical, major, minor
  level INTEGER NOT NULL, -- 1=auto-fix, 2=alert, 3=block, 4=executive

  status TEXT NOT NULL DEFAULT 'open', -- open, in-progress, resolved, dismissed
  action_description TEXT NOT NULL,

  -- Auto-repair
  auto_repair_available BOOLEAN DEFAULT FALSE,
  auto_repair_attempted BOOLEAN DEFAULT FALSE,
  auto_repair_succeeded BOOLEAN DEFAULT FALSE,

  -- Assignment
  assigned_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,

  notes TEXT,
  metadata JSONB
);

CREATE INDEX idx_escalations_project_id ON lyra_escalation_actions(project_id);
CREATE INDEX idx_escalations_status ON lyra_escalation_actions(status);
CREATE INDEX idx_escalations_level ON lyra_escalation_actions(level);
CREATE INDEX idx_escalations_created_at ON lyra_escalation_actions(created_at DESC);

-- Constraint performance metrics (for trending and analytics)
CREATE TABLE IF NOT EXISTS lyra_constraint_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  constraint_id TEXT NOT NULL,
  project_id TEXT NOT NULL,

  -- Pass rate over time
  total_audits INTEGER DEFAULT 0,
  total_passes INTEGER DEFAULT 0,
  total_failures INTEGER DEFAULT 0,
  pass_rate NUMERIC(5,2),

  -- Failure patterns
  consecutive_failures INTEGER DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  first_failure_at TIMESTAMPTZ,

  -- Trends
  trend TEXT, -- improving, stable, degrading

  -- Auto-repair stats
  auto_repair_attempts INTEGER DEFAULT 0,
  auto_repair_successes INTEGER DEFAULT 0,
  average_remediation_time_minutes INTEGER,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_metrics_constraint_id ON lyra_constraint_performance_metrics(constraint_id);
CREATE INDEX idx_metrics_project_id ON lyra_constraint_performance_metrics(project_id);
CREATE INDEX idx_metrics_constraint_project ON lyra_constraint_performance_metrics(constraint_id, project_id);

-- Views for common queries

-- Latest portfolio audit with all details
CREATE OR REPLACE VIEW vw_latest_portfolio_audit AS
SELECT
  pa.id,
  pa.run_id,
  pa.timestamp,
  pa.portfolio_compliance_percentage,
  pa.sla_status,
  pa.total_projects,
  pa.total_constraints,
  pa.total_passed,
  pa.total_failed,
  pa.critical_violations_count,
  COUNT(DISTINCT ppch.project_id) as projects_with_data,
  COUNT(DISTINCT pv.id) as total_violations
FROM lyra_portfolio_audits pa
LEFT JOIN lyra_project_compliance_history ppch ON pa.id = ppch.audit_id
LEFT JOIN lyra_portfolio_violations pv ON pa.id = pv.audit_id
GROUP BY pa.id
ORDER BY pa.timestamp DESC
LIMIT 1;

-- SLA breach summary
CREATE OR REPLACE VIEW vw_sla_breach_summary AS
SELECT
  breach_type,
  COUNT(*) as breach_count,
  COUNT(CASE WHEN status = 'open' THEN 1 END) as open_breaches,
  COUNT(CASE WHEN status = 'acknowledged' THEN 1 END) as acknowledged,
  COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
  AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)::INTEGER as avg_resolution_hours
FROM lyra_sla_breaches
GROUP BY breach_type;

-- Constraint failure trends
CREATE OR REPLACE VIEW vw_constraint_failure_trends AS
SELECT
  constraint_id,
  project_id,
  COUNT(*) as failure_count,
  COUNT(DISTINCT DATE(created_at)) as failure_days,
  COUNT(DISTINCT audit_id) as affected_audits,
  MAX(created_at) as last_failure,
  STRING_AGG(DISTINCT severity, ',' ORDER BY severity) as severity_levels
FROM lyra_portfolio_violations
GROUP BY constraint_id, project_id
ORDER BY failure_count DESC;

-- Project compliance trend
CREATE OR REPLACE VIEW vw_project_compliance_trend AS
SELECT
  project_id,
  created_at::DATE as date,
  AVG(compliance_percentage) as avg_compliance,
  MIN(compliance_percentage) as min_compliance,
  MAX(compliance_percentage) as max_compliance,
  COUNT(DISTINCT audit_id) as audits_per_day
FROM lyra_project_compliance_history
GROUP BY project_id, created_at::DATE
ORDER BY project_id, date DESC;

-- Enable Row Level Security for multi-tenant support (if needed)
ALTER TABLE lyra_portfolio_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE lyra_project_compliance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE lyra_portfolio_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lyra_sla_breaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE lyra_escalation_actions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all data (modify as needed for security)
CREATE POLICY "Allow authenticated users to read portfolio audits"
  ON lyra_portfolio_audits FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read project compliance"
  ON lyra_project_compliance_history FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read violations"
  ON lyra_portfolio_violations FOR SELECT
  USING (auth.role() = 'authenticated');

-- Update timestamp on record change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_portfolio_audits_updated_at BEFORE UPDATE
    ON lyra_portfolio_audits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_violations_updated_at BEFORE UPDATE
    ON lyra_portfolio_violations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sla_breaches_updated_at BEFORE UPDATE
    ON lyra_sla_breaches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escalations_updated_at BEFORE UPDATE
    ON lyra_escalation_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE lyra_portfolio_audits IS 'Central audit history for all projects across the portfolio';
COMMENT ON TABLE lyra_project_compliance_history IS 'Per-project compliance results for trending and analysis';
COMMENT ON TABLE lyra_portfolio_violations IS 'All violations detected across the portfolio';
COMMENT ON TABLE lyra_sla_breaches IS 'SLA breaches and escalations';
COMMENT ON TABLE lyra_escalation_actions IS 'Actions taken to resolve violations';
COMMENT ON TABLE lyra_constraint_performance_metrics IS 'Performance trending for each constraint';
