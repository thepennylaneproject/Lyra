-- Create constraint audit results table
CREATE TABLE IF NOT EXISTS lyra_constraint_audits (
  id BIGSERIAL PRIMARY KEY,
  run_id TEXT NOT NULL UNIQUE,
  project TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_constraints INT NOT NULL,
  passed INT NOT NULL,
  failed INT NOT NULL,
  warnings INT NOT NULL,
  coverage_percentage INT NOT NULL,
  summary TEXT,

  -- Metadata
  easy_passed INT,
  easy_failed INT,
  moderate_passed INT,
  moderate_failed INT,
  complex_passed INT,
  complex_failed INT,
  duration_ms INT,
  auditor TEXT,

  -- JSON data
  violations JSONB DEFAULT '[]'::JSONB,
  metadata JSONB,

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_constraint_audits_project ON lyra_constraint_audits(project);
CREATE INDEX IF NOT EXISTS idx_constraint_audits_timestamp ON lyra_constraint_audits(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_constraint_audits_run_id ON lyra_constraint_audits(run_id);

-- Create constraint violations table (denormalized for query efficiency)
CREATE TABLE IF NOT EXISTS lyra_constraint_violations (
  id BIGSERIAL PRIMARY KEY,
  audit_id BIGINT NOT NULL REFERENCES lyra_constraint_audits(id) ON DELETE CASCADE,
  constraint_id TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  current_state TEXT,
  expected_state TEXT,
  remediation TEXT,

  -- Location info
  file_path TEXT,
  line_number INT,
  context TEXT,

  -- Details
  details JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for violations
CREATE INDEX IF NOT EXISTS idx_violations_audit_id ON lyra_constraint_violations(audit_id);
CREATE INDEX IF NOT EXISTS idx_violations_constraint_id ON lyra_constraint_violations(constraint_id);
CREATE INDEX IF NOT EXISTS idx_violations_severity ON lyra_constraint_violations(severity);

-- Create constraint audit history view
CREATE OR REPLACE VIEW constraint_audit_history AS
SELECT
  ca.id,
  ca.run_id,
  ca.project,
  ca.timestamp,
  ca.total_constraints,
  ca.passed,
  ca.failed,
  ca.warnings,
  ca.coverage_percentage,
  ca.summary,
  COUNT(cv.id) as violation_count,
  CASE
    WHEN ca.failed > 0 THEN 'FAILED'
    WHEN ca.warnings > 0 THEN 'WARNING'
    ELSE 'PASSED'
  END as status
FROM lyra_constraint_audits ca
LEFT JOIN lyra_constraint_violations cv ON ca.id = cv.audit_id
GROUP BY ca.id, ca.run_id, ca.project, ca.timestamp, ca.total_constraints,
         ca.passed, ca.failed, ca.warnings, ca.coverage_percentage, ca.summary;

-- Create constraint violations by severity view
CREATE OR REPLACE VIEW constraint_violations_summary AS
SELECT
  ca.project,
  cv.severity,
  COUNT(*) as count,
  ARRAY_AGG(DISTINCT cv.constraint_id) as constraint_ids,
  MAX(ca.timestamp) as latest_audit
FROM lyra_constraint_audits ca
JOIN lyra_constraint_violations cv ON ca.id = cv.audit_id
GROUP BY ca.project, cv.severity;

-- Enable RLS if needed
ALTER TABLE lyra_constraint_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE lyra_constraint_violations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow authenticated users to read/write)
DROP POLICY IF EXISTS "Allow authenticated to read audits" ON lyra_constraint_audits;
CREATE POLICY "Allow authenticated to read audits" ON lyra_constraint_audits
  FOR SELECT USING (auth.role() = 'authenticated_user');

DROP POLICY IF EXISTS "Allow authenticated to write audits" ON lyra_constraint_audits;
CREATE POLICY "Allow authenticated to write audits" ON lyra_constraint_audits
  FOR INSERT WITH CHECK (auth.role() = 'authenticated_user');

DROP POLICY IF EXISTS "Allow authenticated to read violations" ON lyra_constraint_violations;
CREATE POLICY "Allow authenticated to read violations" ON lyra_constraint_violations
  FOR SELECT USING (auth.role() = 'authenticated_user');

DROP POLICY IF EXISTS "Allow authenticated to write violations" ON lyra_constraint_violations;
CREATE POLICY "Allow authenticated to write violations" ON lyra_constraint_violations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated_user');
