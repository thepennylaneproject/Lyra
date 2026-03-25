# LYRA Constraint-Based Audit Implementation Roadmap
## Moving from Manual to Autonomous with Constraint Validation

**Date**: 2026-03-24
**Status**: Analysis complete → Implementation phase starting
**Scope**: Embr project (17 constraints) → Portfolio-wide (Codra, Relevnt)

---

## What We Know

### The Discovery
From comparisons/embr analysis, we've proven that:
- **Dashboard intelligence** finds 14 observable items (code structure, dependencies, patterns)
- **Manual expectations** define 17 constraints (business logic, policy, strategy)
- **Gap**: 12 constraints are invisible to static analysis (71% of constraints)
- **Solution**: Two-layer audit model combining both

### The Proof
- Embr's manual expectations document defines 17 specific constraints
- Dashboard intelligence report found only 14 observable items
- 12 constraints require human domain expertise to document and verify
- Examples: revenue split 85-90%, wallet verification ordering, TS error limits, feature gating

### The Roadmap
- **7 easy checks**: 1 day (dependencies, config)
- **4 moderate checks**: 3 days (code scanning, route analysis)
- **6 complex checks**: 5 days (business logic, feature flags, policy)
- **Total**: 2 weeks to 100% constraint coverage

---

## Current Architecture Gap

### What Exists
✅ Dashboard reads findings from `audits/open_findings.json`
✅ Dashboard displays findings by severity/priority
✅ Repair queue routes findings through LLM providers
✅ Type system supports Finding, RepairJob, RepairPolicy
✅ Finding model has severity, priority, type, etc.

### What's Missing
❌ Constraint definition layer (where do constraints live?)
❌ Constraint validation engine (how are constraints checked?)
❌ Constraint failure reporting (how do violations surface?)
❌ CI/CD integration (how are constraints enforced?)
❌ Dashboard constraint UI (how does user see constraint status?)

---

## Implementation Path

### Phase 1: Constraint Infrastructure (Days 1-2)

#### 1.1 Create constraint definition schema
```typescript
// dashboard/lib/constraint-types.ts - NEW FILE
export interface ConstraintCheck {
  id: string;                    // "embr-001"
  name: string;                  // "Creator revenue split 85-90%"
  category: string;              // "business-logic" | "policy" | "architecture"
  severity: "critical" | "warning";
  description: string;
  why_required: string;          // Why this constraint matters
  how_to_verify: string;         // High-level check approach
  check_type: "easy" | "moderate" | "complex";
  implementation?: {
    bash_command?: string;
    code_path?: string;
    function?: string;
    requires_manual_review?: boolean;
  };
}

export interface ConstraintViolation {
  constraint_id: string;
  violation_type: "not_found" | "incorrect_value" | "missing" | "unauthorized";
  severity: "critical" | "warning";
  current_state: string;
  expected_state: string;
  remediation: string;
  project: string;
}

export interface ConstraintAuditResult {
  project: string;
  run_id: string;
  timestamp: string;
  total_constraints: number;
  passed: number;
  failed: number;
  warnings: number;
  violations: ConstraintViolation[];
  coverage_percentage: number;
}
```

#### 1.2 Create constraint library for Embr
```typescript
// dashboard/lib/constraints/embr-constraints.ts - NEW FILE
export const EMBR_CONSTRAINTS: ConstraintCheck[] = [
  {
    id: "embr-001",
    name: "Creator revenue split 85-90%",
    category: "business-logic",
    severity: "critical",
    description: "Revenue split to creators must be between 85% and 90%",
    why_required: "Contract with creators; changing split breaks trust and business model",
    how_to_verify: "Search monetization service for split calculation; verify range",
    check_type: "complex",
    implementation: {
      code_path: "apps/api/src/core/monetization",
      requires_manual_review: true,
    },
  },
  {
    id: "embr-002",
    name: "Wallet verification before payouts",
    category: "business-logic",
    severity: "critical",
    description: "Payout flow must call verify-integrity before sending funds",
    why_required: "Skipping verification enables fraud; financial integrity requirement",
    how_to_verify: "Trace payout flow; confirm verify() called first",
    check_type: "complex",
    implementation: {
      code_path: "apps/api/src/core/monetization/services/payout.service.ts",
      requires_manual_review: true,
    },
  },
  // ... 15 more constraints from embr_audit_checklist_implementation.md
];
```

#### 1.3 Create constraint validation engine
```typescript
// dashboard/lib/constraint-validator.ts - NEW FILE
export interface ConstraintValidator {
  validateConstraint(
    constraint: ConstraintCheck,
    projectPath: string
  ): Promise<ConstraintViolation[]>;
}

// Easy constraints (dependency checks)
export async function validateDependencyConstraint(
  constraint: ConstraintCheck,
  projectPath: string
): Promise<ConstraintViolation[]> {
  // Read package.json, check for dependency presence/version
}

// Moderate constraints (code scanning)
export async function validateCodeScanConstraint(
  constraint: ConstraintCheck,
  projectPath: string
): Promise<ConstraintViolation[]> {
  // Use grep/regex to scan for patterns
}

// Complex constraints (requires manual review)
export async function validateComplexConstraint(
  constraint: ConstraintCheck,
  projectPath: string,
  manualReviewData?: Record<string, unknown>
): Promise<ConstraintViolation[]> {
  // Requires human input or AI analysis
}
```

### Phase 2: Easy Checks Implementation (Day 3)

#### 2.1 Implement 7 easy checks
- Turborepo structure verification
- TypeScript strict mode check
- Prisma/PostgreSQL version pinning
- Redis 7 presence
- Socket.io dependency
- ts-jest configuration
- Package.json validation

```typescript
// dashboard/lib/constraint-checks/easy.ts - NEW FILE
export async function checkTurborepoStructure(
  projectPath: string
): Promise<ConstraintViolation[]> {
  const violations: ConstraintViolation[] = [];

  // Check apps/api, apps/web, apps/mobile exist
  // Check turbo.json is valid JSON
  // Check workspaces defined

  return violations;
}
```

### Phase 3: Moderate Checks Implementation (Days 4-6)

#### 3.1 Implement 4 moderate checks
- /v1 route prefix verification
- JwtAuthGuard application
- ThrottlerGuard enforcement
- SES-only email verification

```typescript
// dashboard/lib/constraint-checks/moderate.ts - NEW FILE
export async function checkApiRoutePrefix(
  projectPath: string
): Promise<ConstraintViolation[]> {
  // Find all @Get, @Post, @Put, @Delete decorators
  // Count how many have /v1 prefix
  // Report any without
}
```

### Phase 4: Complex Checks Implementation (Days 7-11)

#### 4.1 Implement 6 complex checks
- Revenue split business logic
- Payout flow tracing
- S3 presigned URL validation
- Moderation pipeline tracing
- TypeScript error count enforcement
- Feature flag (Music phase-2) gating

```typescript
// dashboard/lib/constraint-checks/complex.ts - NEW FILE
export async function checkRevenueConstraint(
  projectPath: string,
  manualReviewResult?: { approved: boolean; split: number }
): Promise<ConstraintViolation[]> {
  // Find monetization service
  // Scan for revenue split calculation
  // Return violation if outside 85-90% range
}
```

### Phase 5: Dashboard Integration (Days 12-14)

#### 5.1 Create constraint audit API endpoint
```typescript
// dashboard/app/api/audits/constraints/route.ts - NEW FILE
export async function POST(req: Request) {
  const { projectPath } = await req.json();

  // Run all EMBR_CONSTRAINTS
  // Collect violations
  // Return ConstraintAuditResult
  // Save to database
}
```

#### 5.2 Add constraint view to dashboard
- New "Constraints" tab next to "Findings"
- Shows constraint violations
- Pass/fail status for each check
- Remediation guidance

#### 5.3 Update types to include constraints
```typescript
// Extend Finding type or create ConstraintFinding
export interface ConstraintFinding {
  constraint_id: string;
  violation: ConstraintViolation;
  remediation_steps: string[];
  queue_for_repair: boolean;
}
```

### Phase 6: CI/CD Integration (Week 2)

#### 6.1 Add constraint check to pipeline
```yaml
# .github/workflows/audit.yml
- name: Run constraint audit
  run: |
    npm run audit:constraints -- --project embr

- name: Check critical constraints
  run: |
    npm run verify:constraints -- --fail-on critical
```

#### 6.2 Set up production gate
- Cannot deploy if critical constraints fail
- Dashboard shows constraint violations in PR
- Automated constraint check results in commit status

---

## File Structure After Implementation

```
dashboard/
├── lib/
│   ├── constraint-types.ts           (NEW - Constraint data models)
│   ├── constraint-validator.ts       (NEW - Validation engine)
│   ├── constraints/
│   │   ├── embr-constraints.ts       (NEW - Embr constraint definitions)
│   │   ├── codra-constraints.ts      (NEW - Codra constraints from analysis)
│   │   └── relevnt-constraints.ts    (NEW - Relevnt constraints)
│   ├── constraint-checks/
│   │   ├── easy.ts                   (NEW - 7 easy checks)
│   │   ├── moderate.ts               (NEW - 4 moderate checks)
│   │   ├── complex.ts                (NEW - 6 complex checks)
│   │   └── index.ts                  (NEW - Export all)
│   └── audit-reader.ts               (EXTEND - Add constraint results reading)
├── app/
│   ├── api/
│   │   └── audits/
│   │       ├── constraints/
│   │       │   └── route.ts          (NEW - Constraint audit endpoint)
│   │       └── route.ts              (EXTEND - Include constraints)
│   └── components/
│       └── ConstraintView.tsx        (NEW - Constraint violations display)
```

---

## Implementation Checklist

### Phase 1: Foundation (Days 1-2)
- [ ] Create constraint-types.ts with ConstraintCheck, ConstraintViolation, ConstraintAuditResult
- [ ] Create constraint-validator.ts with validation framework
- [ ] Create embr-constraints.ts with all 17 constraint definitions
- [ ] Document validation approach for each constraint

### Phase 2: Easy Checks (Day 3)
- [ ] Implement checkTurborepoStructure
- [ ] Implement checkTypescriptStrict
- [ ] Implement checkPrismaVersion
- [ ] Implement checkRedisVersion
- [ ] Implement checkSocketio
- [ ] Implement checkTsJest
- [ ] Test all 7 checks against Embr codebase

### Phase 3: Moderate Checks (Days 4-6)
- [ ] Implement checkApiRoutePrefixes
- [ ] Implement checkJwtAuthGuard
- [ ] Implement checkThrottlerGuard
- [ ] Implement checkSesOnly
- [ ] Test code scanning patterns
- [ ] Refine regex patterns if needed

### Phase 4: Complex Checks (Days 7-11)
- [ ] Implement checkRevenueConstraint (with manual review interface)
- [ ] Implement checkWalletVerification (flow tracing)
- [ ] Implement checkS3Presigned
- [ ] Implement checkModerationPipeline
- [ ] Implement checkTypescriptErrors (count + trend)
- [ ] Implement checkMusicPhase2Gating
- [ ] Create manual review workflow for complex checks

### Phase 5: Dashboard Integration (Days 12-14)
- [ ] Create constraint audit API endpoint
- [ ] Build constraint violations display component
- [ ] Add "Constraints" tab to dashboard
- [ ] Show pass/fail status per constraint
- [ ] Display remediation guidance
- [ ] Save constraint audit results to database

### Phase 6: CI/CD Integration (Week 2)
- [ ] Add constraint check to GitHub Actions
- [ ] Configure production gate
- [ ] Set up failure notifications
- [ ] Document constraint enforcement policy

---

## Success Criteria

### Immediate (End of Implementation)
✅ All 17 Embr constraints have defined checks
✅ 7 easy checks are fully automated
✅ 4 moderate checks are automated with code scanning
✅ 6 complex checks have manual review workflow
✅ Dashboard shows constraint violations
✅ CI/CD enforces critical constraints

### Coverage
✅ 100% of constraints defined
✅ 95% of constraints automated
✅ 5% requiring manual review (business logic decisions)

### Business Value
✅ Cannot merge code that violates business logic constraints
✅ Cannot deploy code that violates policy constraints
✅ Investor-ready: "100% constraint compliance"
✅ Audit trail: All constraint violations logged

---

## Integration with Broader LYRA Strategy

### Constraint Model Scalability
This pattern works across **all projects**:

1. **Embr**: 17 constraints (9 sections) — [STATUS: Analysis complete]
2. **Codra**: 16 constraints identified in previous analysis — [STATUS: Analysis exists]
3. **Relevnt**: ~20 constraints from 82 findings analysis — [STATUS: Analysis exists]

### Portfolio Roadmap
- **Week 1**: Embr constraints implemented + working
- **Week 2**: Codra constraints ported (same framework)
- **Week 3**: Relevnt constraints ported
- **Month 2**: Build constraint library UI (reusable constraint templates)
- **Month 3**: Scaling to next portfolio projects

### LYRA Architectural Impact
This transforms LYRA from:
- ❌ "Code quality scanner" → ✅ "Business logic validator"
- ❌ "Bug finder" → ✅ "Contract enforcer"
- ❌ "Manual audits" → ✅ "Automated governance"

---

## Immediate Next Steps (This Week)

### Option A: Build the Foundation (Recommended)
1. Create constraint-types.ts and embr-constraints.ts
2. Build constraint-validator.ts framework
3. Implement 7 easy checks
4. Get first constraint audit working end-to-end
5. Show "7/17 constraints passing" in dashboard

**Timeline**: 2-3 days
**Output**: Proof of concept with foundation ready for moderate/complex checks

### Option B: Start with Easy Checks
1. Skip framework building
2. Start with 7 easy checks immediately
3. Hardcode constraint definitions
4. Get them working
5. Refactor into framework later

**Timeline**: 1 day
**Output**: Immediate working constraint checks

### Option C: Build Manual Review Interface First
1. Start with complex checks (revenue, payout, etc.)
2. Design manual review workflow
3. Get human-in-the-loop working
4. Add easy/moderate checks after

**Timeline**: 2-3 days
**Output**: Manual review system + 6 complex checks

---

## Decision Points

1. **Constraint Storage**: Where do constraint definitions live?
   - Option A: TypeScript files (embr-constraints.ts, codra-constraints.ts)
   - Option B: Database table (lyra_constraints)
   - Option C: YAML files in repo
   - **Recommendation**: TypeScript for now, migrate to database later

2. **Manual Review Storage**: How do we store manual review results?
   - Option A: UI form + database
   - Option B: Markdown files
   - Option C: Comments in source
   - **Recommendation**: Database + UI form

3. **Violation Reporting**: What happens when a constraint fails?
   - Option A: Treated as Finding (queued for repair)
   - Option B: Treated as separate entity (constraint violation)
   - Option C: Both (violation + repair recommendation)
   - **Recommendation**: Separate entity + repair option

---

## Questions for Alignment

Before starting implementation, clarify:

1. **Priority**: Should we implement all 17 at once, or phase them?
2. **Manual Review**: For complex checks, do we have subject matter experts ready?
3. **Enforcement**: When should constraints start blocking PRs/deploys?
4. **Scope**: Start with Embr only, or import Codra/Relevnt constraints too?
5. **Dashboard**: Does the constraint UI exist, or do we build from scratch?

---

## Supporting Documents

**Completed Analysis** (in comparisons/embr/):
- `EMBR_SMOKING_GUN.md` — The proof (10 min read)
- `embr_audit_checklist_implementation.md` — The blueprint (25 min read)
- `embr_definitive_gap_analysis.md` — The details (20 min read)
- `EMBR_COMPLETE_ANALYSIS_AND_ACTION_PLAN.md` — The plan (15 min read)
- `THE_UNIVERSAL_PATTERN.md` — Pattern across projects (15 min read)

**Ready to Implement**:
- 17 constraint definitions ✓
- 17 verification approaches ✓
- 3 difficulty tiers (easy/moderate/complex) ✓
- 2-week timeline ✓
- Success criteria ✓

---

## Next Session TODO

1. Read this roadmap
2. Choose implementation approach (A, B, or C)
3. Confirm decisions on constraint storage/reporting
4. Create constraint-types.ts
5. Create embr-constraints.ts
6. Begin Phase 1 or 2 based on choice

---

**End of Roadmap**
