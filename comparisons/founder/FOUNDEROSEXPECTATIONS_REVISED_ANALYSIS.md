# FounderOS: The Real Expectations Document
## Revised Analysis - This Version is Much Better

**Date**: 2026-03-29  
**Document Found**: `founderos-expectations.md` (REAL operational constraints)  
**Status**: ✅ **Solid foundation** (14 constraints), but **incomplete for full coverage**  
**Urgency**: Fill gaps in business logic (15-20 additional constraints needed)

---

## What This Document IS (14 Operational Constraints)

This is a **proper operational expectations document** with:
- ✅ Clear severity levels (critical, warning, suggestion)
- ✅ Specific file paths and naming conventions
- ✅ Build-breaking requirements (Supabase middleware, Docker)
- ✅ Security constraints (SQL injection, multitenancy, encryption)
- ✅ Architectural constraints (Next.js 14, App Router only, TypeScript required)

### The 14 Constraints (By Category)

**Language & Runtime (3)**
1. Next.js 14 App Router — no Pages Router [CRITICAL]
2. TypeScript required — no .js files [WARNING]
3. Tailwind CSS only — no other CSS frameworks [SUGGESTION]

**API Architecture (2)**
4. All routes in `src/app/api/**/route.ts` [CRITICAL]
5. Supabase middleware protects `/api/*` [CRITICAL - except /api/events/health]

**Database (4)**
6. PostgreSQL via `pg` pool in `src/lib/db.ts` [WARNING]
7. Supabase client for user-scoped data [CRITICAL]
8. No SQL injection — parameterized statements only [CRITICAL]
9. Multitenancy scoped to `organizations` table [CRITICAL]

**Dependencies (1)**
10. `@supabase/auth-helpers-nextjs` required in `package.json` [CRITICAL - **CURRENTLY MISSING**]

**AI Routing (2)**
11. All AI calls through `src/ai/AIRouter.ts` [CRITICAL]
12. AI keys encrypted in `user_ai_settings` table [CRITICAL]

**Infrastructure (2)**
13. Docker multi-stage build must remain functional [CRITICAL]
14. Redis usage must be documented [SUGGESTION]

---

## What This Document ISN'T (The Gaps)

### Gap 1: Email Management (0 constraints)
**Dashboard found**: IMAP/SMTP integration, nodemailer, EmailIntelligenceEngine  
**Expectations cover**: Nothing

Missing constraints:
- [ ] Email provider lock-in (IMAP/SMTP providers required/forbidden)
- [ ] Email header parsing rules (what's safe to analyze?)
- [ ] PII redaction policy (how to handle sensitive email data)
- [ ] Email draft safety checks (AI-generated emails validation)
- [ ] Unsubscribe link requirements

**Example**: Dashboard sees `src/lib/email.ts` but can't validate the parsing rules or safety gates.

---

### Gap 2: Campaign Execution (0 constraints)
**Dashboard found**: CampaignAnalyticsEngine, CampaignOutcomeEngine, CampaignStrategist  
**Expectations cover**: Nothing

Missing constraints:
- [ ] Campaign success definition (what metrics matter?)
- [ ] Campaign outcome calculation (open rate? reply rate? custom?)
- [ ] Send rate limits (emails/hour per campaign)
- [ ] Campaign execution retries (max attempts on failure)
- [ ] Campaign strategy validation (approved strategies only?)

**Example**: Dashboard sees CampaignAnalyticsEngine exists but doesn't know the formula for success.

---

### Gap 3: Contact Scoring (0 constraints)
**Dashboard found**: Contact scoring logic, triage, snapshots endpoints  
**Expectations cover**: Nothing

Missing constraints:
- [ ] Scoring algorithm and factors (how weighted?)
- [ ] Score range (0-100? 0-10? custom?)
- [ ] Recalculation frequency (real-time? daily? on-demand?)
- [ ] Threshold actions (>X = priority? <Y = ignore?)

**Example**: Dashboard finds `src/hooks/useContactScore()` but can't validate the ranges.

---

### Gap 4: Revenue & Monetization (0 constraints)
**Dashboard found**: Tier-based pricing, feature gating, revenue/ai/ directory  
**Expectations cover**: Nothing

Missing constraints:
- [ ] Pricing tiers and limits (Free: X, Pro: Y, Enterprise: Z)
- [ ] Creator revenue split (creator gets %?, platform gets %?)
- [ ] Payout frequency and rules (weekly? monthly? thresholds?)
- [ ] Feature gate enforcement (campaigns behind Pro tier?)
- [ ] Billing processor and webhook handlers

**Example**: Dashboard finds feature gating but can't check the tier mapping.

---

### Gap 5: AI Cost Control (0 constraints)
**Dashboard found**: CostTracker.ts, token tracking, multi-provider calls  
**Expectations cover**: 2 constraints (routing through AIRouter, key encryption)

Missing constraints:
- [ ] Daily cost budget limits (warn at $X, block at $Y)
- [ ] Per-request cost limits (max $Z per call)
- [ ] Token budgets (input/output limits per request)
- [ ] Cost tracking granularity (per user? per request? per model?)
- [ ] Cost overrun handling (warn user? block requests? alert ops?)

**Example**: Dashboard finds CostTracker.ts but doesn't know if there's a $10/day limit or $1000/day.

---

### Gap 6: AI Multi-Provider Strategy (Partial)
**Dashboard found**: AIRouter.ts, 5+ providers (OpenAI, Anthropic, DeepSeek, Google, Mistral)  
**Expectations cover**: 2 constraints (route through AIRouter, key storage)

Missing constraints:
- [ ] Approved providers list (locked in? can be added?)
- [ ] Fallback order (primary → secondary → tertiary?)
- [ ] Provider selection criteria (latency? cost? quality?)
- [ ] Timeout per provider (seconds?)
- [ ] Max retries across providers

**Example**: Dashboard sees AIRouter.ts but can't validate the fallback strategy.

---

### Gap 7: Automation Safety (0 constraints)
**Dashboard found**: WorkflowEngine, AutomationHub, automation rules, test endpoint  
**Expectations cover**: Nothing

Missing constraints:
- [ ] Allowed automation triggers (email? contact scored? webhook?)
- [ ] Allowed automation actions (send email? update field? call API?)
- [ ] Forbidden automations (delete contact? disable user?)
- [ ] Rule complexity limits (max conditions? max actions?)
- [ ] Pre-execution testing requirement (must pass tests?)
- [ ] Execution rate limits (per automation? per user?)

**Example**: Dashboard finds WorkflowEngine but doesn't know what automations are safe.

---

### Gap 8: Feature Flags & Product Strategy (0 constraints)
**Dashboard found**: Multiple feature areas (Automations, Campaigns, Domains, Email, Onboarding, etc.)  
**Expectations cover**: Nothing

Missing constraints:
- [ ] Feature status (stable? beta? experimental?)
- [ ] Beta feature gating (flag name? condition?)
- [ ] Experimental feature defaults (off by default?)
- [ ] Feature flag rollout policy (% of users? internal only?)
- [ ] Feature flag implementation (database? code? LaunchDarkly?)

**Example**: Dashboard finds the Automations feature but doesn't know if it's behind a flag.

---

### Gap 9: Production Readiness (0 constraints)
**Dashboard found**: Beta status, low test coverage (2 files for 259 total), no error monitoring  
**Expectations cover**: Nothing

Missing constraints:
- [ ] Error monitoring requirement (Sentry/Bugsnag before production)
- [ ] Test coverage minimum (X% required? which modules?)
- [ ] TypeScript strict mode (enabled or optional?)
- [ ] Deployment checklist (what must pass?)
- [ ] Rollback procedures (how to revert?)

**Example**: Critical gap — no error monitoring service found, but no constraint requiring it.

---

### Gap 10: Build Dependency Issue (1 CRITICAL FINDING)
**Constraint 10 notes**: 
> "@supabase/auth-helpers-nextjs is currently **missing from `package.json`**, which causes a **build failure**."

**Status**: 🔴 **This is a blocking issue**
- The build likely fails if deployed
- The constraint explicitly requires this dependency
- This is a CRITICAL-severity problem

**Action**: Add `@supabase/auth-helpers-nextjs` to `package.json` dependencies immediately.

---

## Revised Coverage Analysis

### Current FounderOS Expectations: 14 Constraints

**By Domain**:
- ✅ Language/Runtime: 3 constraints
- ✅ API Architecture: 2 constraints
- ✅ Database: 4 constraints
- ✅ Dependencies: 1 constraint (MISSING - CRITICAL)
- ✅ AI Routing: 2 constraints
- ✅ Infrastructure: 2 constraints
- ❌ Email Management: 0 constraints
- ❌ Campaign Logic: 0 constraints
- ❌ Contact Scoring: 0 constraints
- ❌ Revenue/Monetization: 0 constraints
- ❌ AI Cost Control: 0 constraints (partial via AIRouter)
- ❌ AI Multi-Provider: 0 constraints (partial via AIRouter)
- ❌ Automation Safety: 0 constraints
- ❌ Feature Flags: 0 constraints
- ❌ Production Readiness: 0 constraints

**Coverage**: ~50% (14 of estimated 30 constraints)

### Comparison to Portfolio

| Project | Constraints | Coverage | Status |
|---------|-------------|----------|--------|
| Codra | 16 | 80% | ✓ ACTIVE |
| Embr | 17 | 90% | ✓ ACTIVE |
| FounderOS | 14 | 50% | ⚠️ PARTIAL |
| Relevnt | 36+ | 95% | ✓ ACTIVE |

**FounderOS is better than the draft (6 constraints), but still incomplete for a 259-file project.**

---

## The Good News

This expectations document shows **real architectural thinking**:
- ✅ Clear multitenancy model (organizations table)
- ✅ Security-first (encrypted AI keys, SQL injection prevention)
- ✅ Middleware-based auth protection
- ✅ AI routing abstraction layer
- ✅ Database pooling conventions
- ✅ Infrastructure requirements (Docker, Redis)

**This is solid work.** It's not a draft — it's operational constraints ready to drive automated audits.

---

## The Work Remaining: Add 15-20 Constraints

### Quick Priority Tiers

**CRITICAL (Do First - 3 items)**
1. Fix missing `@supabase/auth-helpers-nextjs` dependency
2. AI cost control constraints (budgets, per-request limits)
3. Production readiness checklist (error monitoring, test coverage)

**HIGH (Do Next - 7-8 items)**
4. Email management rules (provider lock, safety checks, parsing)
5. Campaign execution constraints (success metrics, send rates)
6. Contact scoring algorithm (range, factors, thresholds)
7. Revenue sharing rules (tiers, creator split, payouts)
8. Automation safety gates (allowed triggers, forbidden actions)
9. Feature flag strategy (status, gating, rollout)
10. AI provider strategy (approved list, fallback order)

**MEDIUM (Do Later - 4-5 items)**
11. AI timeout and retry policies
12. Error handling and observability
13. Deployment and rollback procedures
14. Monitoring and alerting requirements

**EFFORT**: ~2-3 days to add 15-20 constraints

---

## Action Plan: Complete FounderOS Expectations

### Today (Monday): Audit Current Document
- [ ] Note: Missing `@supabase/auth-helpers-nextjs` is CRITICAL
- [ ] Verify the 14 existing constraints are accurate
- [ ] Identify which are actively enforced

### This Week: Fill Critical Gaps

**Tuesday**: AI & Cost Control (3 constraints)
- [ ] AI cost budgets (daily limit, per-request limit)
- [ ] AI provider strategy (approved providers, fallback)
- [ ] Token limits and timeout policy

**Wednesday**: Business Logic (5-6 constraints)
- [ ] Email management rules
- [ ] Campaign execution (success metrics, send rates)
- [ ] Contact scoring algorithm
- [ ] Revenue sharing/monetization tiers

**Thursday**: Operations & Safety (4-5 constraints)
- [ ] Automation rule validation
- [ ] Feature flags and beta gating
- [ ] Production readiness checklist
- [ ] Error monitoring requirement

**Friday**: Review & Finalize
- [ ] Team review of new constraints
- [ ] Add to expectations document
- [ ] Mark complete (29-34 total constraints)

---

## Files to Create

1. **FounderOS_Revised_Gap_Analysis.md** — Show what's good, what's missing
2. **FounderOS_Missing_Constraints_Template.md** — Fill-in-the-blank for 15-20 new constraints
3. **FounderOS_Complete_Expectations.md** — Final merged document with all 29-34 constraints

---

## The Bottom Line

**FounderOS has a SOLID foundation** (14 operational constraints)  
**But it's INCOMPLETE** for a complex project with email, campaigns, AI routing, and revenue  
**Need to add 15-20 more constraints** to reach 90%+ coverage  
**Timeline: 2-3 days of work**

**Quick win**: Add the missing `@supabase/auth-helpers-nextjs` to package.json right now.

---

## Critical Discovery: Build Failure Risk

The document itself warns:
> "This dependency must be present in `dependencies` before any deployment."

**Question for you**: Is the project currently deployable? Or is the build failing due to the missing dependency?

If it's currently failing → Fix this IMMEDIATELY (before anything else)
If it's already fixed → Check if expectations need updating to mark this as RESOLVED
