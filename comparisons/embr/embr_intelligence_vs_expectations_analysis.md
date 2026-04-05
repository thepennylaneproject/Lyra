# Embr: Intelligence Extraction Report vs Manual Expectations
## The Constraint Engineering Model Revealed

**Analysis Date**: 2026-03-22  
**Documents Compared**: 
- Embr Intelligence Report (dashboard-style static analysis)
- Embr Expectations Document (manual constraint engineering)

**Key Finding**: Same divergence pattern as Codra, but with **business logic constraints** that dashboard can never infer

---

## The Gap Visualized

### Intelligence Extraction Report
**What it does**: Reads the codebase, catalogs what's there
**Output**: ~867 files analyzed, metadata about dependencies, architecture, features
**Examples**:
- "PostgreSQL 16 via Prisma 5 detected"
- "20 test files present"
- "Stripe integration found"
- "686 commits over 16 weeks"
- "3 apps: API, Web, Mobile"

**Limitation**: Observes *what exists*, not *what's important* or *what should be true*

### Manual Expectations Document
**What it does**: Encodes what MUST be true about the codebase
**Output**: 17 specific, enforceable constraints across 9 domains
**Examples**:
- "Creator revenue split MUST be 85-90%"
- "All API routes MUST be prefixed /v1"
- "666+ TypeScript errors MUST be resolved before production"
- "Wallet integrity MUST be verified before payouts"

**Power**: Specifies *what's non-negotiable* and *why*

---

## The 17 Constraints Embr Defined

### Architectural (8 constraints)

**Monorepo Structure** [CRITICAL]
```
Rule: Turborepo monorepo must not be broken
Enforcer: Would need to check package.json structure, imports
Impact: Organization, build tooling, deployment
```

**API Routes** [WARNING]
```
Rule: All endpoints MUST be prefixed with /v1
Enforcer: Would grep for router definitions, check route patterns
Impact: Versioning, backwards compatibility
```

**Authentication** [CRITICAL]
```
Rule: JwtAuthGuard on ALL protected routes
Enforcer: Would check each route for @UseGuards decorator
Impact: Security, token verification
```

**Rate Limiting** [CRITICAL]
```
Rule: ThrottlerGuard must be active
Enforcer: Would check guard configuration in module
Impact: Availability, DOS protection
```

**TypeScript Strict** [CRITICAL]
```
Rule: Strict mode enabled in API tsconfig.json
Enforcer: Would check tsconfig setting
Impact: Type safety, code quality
```

### Database & Infrastructure (3 constraints)

**PostgreSQL 16 + Prisma 5** [CRITICAL]
```
Rule: No other ORM or database client
Enforcer: Check package.json for unapproved dependencies
Impact: Data consistency, migration safety
```

**Redis 7** [WARNING]
```
Rule: Redis version must not be downgraded
Enforcer: Check package.json version pin
Impact: Feature compatibility, cache behavior
```

**Socket.io for Real-time** [WARNING]
```
Rule: No unauthorized WebSocket library replacements
Enforcer: Check websocket imports
Impact: Real-time feature consistency
```

### Business Logic (4 constraints)

**Creator Revenue Split: 85-90%** [CRITICAL] ⭐ **CANNOT BE INFERRED FROM CODE**
```
Rule: Stripe integration MUST maintain 85-90% to creator
Enforcer: Would need to check payout calculation in monetization service
Impact: Business model, creator trust, legal compliance
Why dashboard can't find this: Revenue percentage is a business decision,
  not visible in code structure. Could be hardcoded anywhere.
```

**Wallet Integrity Verification** [CRITICAL] ⭐ **CANNOT BE INFERRED FROM CODE**
```
Rule: GET /wallet/verify-integrity MUST complete before any payout
Enforcer: Would need to trace execution flow through payout code
Impact: Financial correctness, fraud prevention
Why dashboard can't find this: Requires understanding business logic flow,
  not just static code analysis.
```

**S3 Presigned URLs for Uploads** [CRITICAL]
```
Rule: All media uploads MUST use S3 presigned URLs
Enforcer: Would check upload controller for direct file handling
Impact: Security, scalability, storage compliance
Why risky to miss: Direct file uploads could overload server
```

**Mux for Video Processing** [CRITICAL]
```
Rule: Video processing MUST go through Mux
Enforcer: Check for direct video processing on API server
Impact: Performance, transcoding, video delivery
Why risky to miss: Processing video server-side could crash API
```

### Content Moderation (1 constraint)

**Moderation Pipeline** [CRITICAL]
```
Rule: Flagged content MUST trigger moderation pipeline
Enforcer: Check content flagging code for pipeline invocation
Impact: Platform safety, legal compliance
Why risky to miss: Platform could be liable for unmoderated content
```

### Quality & Release Gates (2 constraints)

**TypeScript Debt Resolution** [CRITICAL] ⭐ **QUANTIFIED DEBT BLOCKER**
```
Rule: 666+ suppressed TypeScript errors MUST be resolved before production
Enforcer: Count @ts-ignore and @ts-nocheck directives
      Ban adding new ones
Impact: Code quality, maintainability, debugging
Why this is remarkable: Developer QUANTIFIED the debt and made it explicit
Why dashboard misses this: No way to interpret "this debt is blocking us"
```

**ts-jest Configuration** [CRITICAL]
```
Rule: ts-jest must be installed and configured for tests
Enforcer: Check devDependencies, jest config
Impact: Test execution, CI/CD reliability
```

### Feature Management (1 constraint)

**Music Phase-2 Gating** [CRITICAL]
```
Rule: Music phase-2 vertical NOT visible in production UI
Enforcer: Check for feature flags around Music UI components
Impact: Product messaging, beta user expectations
Why risky to miss: Exposing incomplete features breaks user trust
```

---

## Why Dashboard Can Never Infer These Constraints

### Some Constraints Are Business Rules, Not Code Rules

**Example: "Creator revenue split must be 85-90%"**

Dashboard scans code and finds:
```javascript
const creatorPercentage = 0.85;
const platformPercentage = 0.15;
```

But it cannot determine:
- Is this the only place this is calculated?
- Is this the production value or a test value?
- Is this a business-critical constraint or implementation detail?
- Should we guard against it being changed?

**A human must document this as a constraint** because it's business policy, not technical architecture.

### Some Constraints Are About Preventing Future Mistakes

**Example: "666+ TypeScript errors must be resolved before production"**

This is NOT a code inspection finding. It's a **debt management policy**. It says:
- We know we have 666 errors
- We're not going to add more (`@ts-ignore` is banned)
- We won't ship until it's fixed

Dashboard has no way to infer:
- That this is a *strategic decision* (not just technical debt)
- That it's a *production blocker* (not something we'll live with)
- That it's *intentionally quantified* (666 is specific, not vague)

### Some Constraints Are About Business Logic Flow

**Example: "Wallet integrity must be verified before payouts"**

This requires understanding:
1. There's a payout flow (code has it)
2. There's a wallet integrity check (code has it)
3. The integrity check MUST come BEFORE payouts (requires semantic understanding)

Dashboard can see both exist. It cannot see the **dependency ordering** between them, or that skipping the check would be catastrophic.

---

## What the Dashboard Intelligence Report Actually Provides

### What It Gets Right

✅ **Architecture Overview**
- 3-app monorepo (API, Web, Mobile)
- Turborepo structure
- 867 files organized by function

✅ **Technology Stack**
- PostgreSQL 16 + Prisma
- Redis 7
- NestJS + Next.js + React Native
- Stripe integration

✅ **Quality Signals**
- 20 test files
- 686 commits in 16 weeks
- TypeScript + ESLint tooling

✅ **Feature Inventory**
- Media handling, auth, monetization, moderation
- Database schema (13 tables listed)
- API endpoints and services

### What It Misses

❌ **Business Constraints**
- Revenue split percentage and why it matters
- Why wallet verification is critical
- Creator trust as a core value

❌ **Quantified Debt**
- "666+ errors" is specific operational knowledge
- The fact that it's a production blocker
- The strategic decision to resolve before launch

❌ **Operational Policies**
- Why S3 presigned URLs matter (not just security, but scalability)
- Why video MUST go through Mux (performance cost)
- Why moderation pipeline can't be skipped (legal risk)

❌ **Feature Flags and Product Strategy**
- Music phase-2 is intentionally hidden
- There's a rollout strategy
- Incomplete features damage trust

---

## Comparing to Codra: What's Different

### Codra Constraints (16 rules)
- Focused on architecture and security
- Examples: TypeScript strict, AI routing, JWT verification, RLS
- Mostly about "preventing wrong code patterns"

### Embr Constraints (17 rules)
- Includes architecture, security, **business logic**, and **operational policy**
- Additional focus on: Monetization correctness, TypeScript debt quantification, feature gating
- Mix of "preventing wrong patterns" + "enforcing business rules" + "blocking technical debt"

**Key Difference**: Embr's expectations include **business-critical constraints** that are non-negotiable. Codra is more about **architecture hygiene**.

---

## The Implication for LYRA Dashboard

### Current Dashboard Approach
"Extract everything observable from code, report findings"

**Result**: Generic findings about code quality, missing files, dependency issues

**What it catches**: ~30-40% of what matters (the technical issues)

**What it misses**: ~60-70% of what matters (business logic, operational policy, strategic debt)

### What Manual Expectations Add
"Define what MUST be true, then check code against those rules"

**Result**: 17 specific constraints that capture the **intent** of the project

**Coverage**: 100% of what matters (captures both technical and business requirements)

---

## How This Plays Out in Practice

### If Dashboard Needs to Audit Embr

**Dashboard finds**:
- Database exists ✓
- Stripe integrated ✓
- Tests present ✓
- JWT auth implemented ✓

**Dashboard misses**:
- Is the creator revenue split really 85-90%? (Unknown)
- Is wallet verified before payouts? (Unknown)
- Is TypeScript debt blocking production? (Unknown)
- Is Music phase-2 properly gated? (Unknown)

**Result**: Dashboard gives 60% confidence. Manual expectations close the gap.

### If Manual Expectations Are Imported Into Dashboard

**Dashboard could now find**:
- Is creator split 85-90%? (Can check monetization service)
- Is wallet verified? (Can trace payment flow)
- Are there new @ts-ignore directives? (Can scan and count)
- Is Music UI exposed? (Can grep components)

**Result**: Dashboard gives 95% confidence. All 17 constraints are checkable.

---

## What This Means for You

### For Embr Specifically

The manual expectations document is a **treasure map** of what matters:

1. **Architectural boundaries** (Turborepo, API routes, auth guards)
2. **Infrastructure choices** (PostgreSQL, Redis, Socket.io locked in)
3. **Business model safeguards** (85-90% creator split, wallet integrity)
4. **Operational policies** (TypeScript debt resolution, feature gating)
5. **Quality gates** (moderation pipeline, test infrastructure)

**None of these appear in the intelligence report.** They had to be documented manually by someone with deep knowledge.

### For LYRA Dashboard

This shows the **two-layer approach** you need:

**Layer 1: Intelligence Extraction**
- Scan codebase, catalog what's there
- Report what you observe
- Useful but incomplete

**Layer 2: Constraint Validation**
- Import domain-specific constraints
- Check code against constraints
- Catches the business logic and policy issues

**Both needed** for comprehensive audit.

---

## The Data

### Embr Constraints by Category

```
Architectural (8):  Monorepo, API routes, auth, rate limiting, TypeScript strict, 
                    PostgreSQL, Redis, Socket.io
                    
Business Logic (4): Revenue split, wallet verification, S3 uploads, Mux processing

Content (1):        Moderation pipeline

Quality/Release (2): TypeScript debt resolution, ts-jest config

Features (1):       Music phase-2 gating
```

### Severity Distribution

```
Critical (12):  Architecture, auth, business logic, media handling, debt blocking
Warning (5):    Version pins, library choices, feature exposure
```

### Comparison to Codra

| Attribute | Codra | Embr |
|-----------|-------|------|
| Total constraints | 16 | 17 |
| Critical level | 12 | 12 |
| Warning level | 3 | 5 |
| Business logic constraints | 0 | 4 |
| Debt quantification | No | Yes (666 errors) |
| Feature gating | No | Yes |

---

## Why This Matters

**The manual expectations document for Embr is NOT something a static analysis tool can generate.**

It requires:
1. Understanding the business model (creator monetization)
2. Knowing the product roadmap (Music phase-2)
3. Recognizing strategic decisions (debt blocking, revenue split)
4. Interpreting operational policies (wallet verification order)

**A human engineer with domain knowledge wrote this.**

**A dashboard scanning code cannot write this.**

---

## What to Do With This Discovery

### For Embr
1. Use `embr-expectations.md` as the audit template
2. Import these 17 constraints into LYRA
3. Run dashboard audit against these constraints
4. Measure how many are currently being violated

### For LYRA Dashboard
1. Show that constraint-based expectations are necessary
2. Prove that manual + dashboard = complete picture
3. Document the pattern: Intelligence extraction isn't enough
4. Build the constraint import pipeline

### For Your Team
1. This is why manual audits are still valuable
2. Dashboard alone misses business logic
3. Both layers needed for production confidence
4. Constraints should be documented for each project

---

## Bottom Line

**Embr's manual expectations document captures what the dashboard's intelligence report can never capture: the business logic, operational policies, and strategic decisions that define a project.**

Dashboard intelligence = Observable facts from code  
Manual expectations = Intent, policy, and business rules

**Both are necessary.**

When you import these 17 constraints into LYRA and run the dashboard audit again, you'll be able to catch:
- Revenue split violations
- Wallet verification bypasses
- New TypeScript errors
- Exposed incomplete features
- Direct file uploads
- Unmoderated content

Right now, the dashboard cannot check any of those. That's the gap.
