# FounderOS — Missing Constraints Template
## Add 15-20 Constraints to Reach 90%+ Coverage

**Current**: 14 constraints (framework, API, database, AI routing)  
**Missing**: 15-20 constraints (business logic, operations, safety)  
**Target**: 29-34 constraints total  
**Timeline**: 2-3 days to research and document

---

## Section 5: Email Management

> **Status**: NOT DOCUMENTED  
> **Dashboard found**: IMAP/SMTP, nodemailer, EmailIntelligenceEngine, EmailComposer, AIDraftModal  
> **Codebase**: 5+ email endpoints, email parsing, draft generation

### 5.1 Email Provider Lock-in
**Status**: [EDIT THIS - FILL IN]

Email account management uses IMAP and SMTP. Define which providers are approved/required.

```
TEMPLATE (FILL IN):
IMAP provider LOCKED TO: [YOUR CHOICE - Gmail? Outlook? Self-hosted?]
SMTP provider LOCKED TO: [YOUR CHOICE]

Can IMAP be switched to a different provider?
  [ ] YES — other providers approved
  [ ] NO — locked to [PROVIDER]

Can SMTP be switched to a different provider?
  [ ] YES — other providers approved
  [ ] NO — locked to [PROVIDER]

Configuration requirement:
  Required environment variables:
    - IMAP_HOST, IMAP_PORT, IMAP_USER, IMAP_PASS
    - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE
  Storage location: [ENVIRONMENT VARIABLES / VAULT / .env]

Severity: [critical / warning / suggestion]

**Flag**: Switching providers without approval; storing credentials in code
```

**Interview question**: Can the email provider be changed, or is it locked in for compliance reasons?

---

### 5.2 Email Header Parsing Rules
**Status**: [EDIT THIS - FILL IN]

EmailIntelligenceEngine analyzes emails. Define what data is extracted and privacy rules.

```
TEMPLATE (FILL IN):
Email headers that MAY be parsed:
  - From, To: [YES / NO]
  - Cc, Bcc: [YES / NO]
  - Subject: [YES / NO]
  - Date, Message-ID: [YES / NO]
  - [Custom headers?]: [LIST]

Email body analysis:
  - Full text parsing: [YES / NO]
  - Sentiment analysis: [YES / NO]
  - Intent extraction: [YES / NO]

PII Handling:
  - PII Detection: [YES / NO]
  - If YES, which types: [CREDIT_CARD / SSN / EMAIL / PHONE / CUSTOM]
  - How redacted: [MASKED / REDACTED / REMOVED / ENCRYPTED]

Data retention:
  - Email metadata: [DAYS]
  - Full email text: [DAYS]
  - Analysis results: [DAYS]

Fields PROHIBITED from analysis:
  - [FIELD]: [REASON]
  - [FIELD]: [REASON]

Severity: [critical / warning / suggestion]

**Flag**: Parsing restricted fields; storing unredacted PII; retention beyond limits
```

**Interview question**: What email data is safe to analyze? Any customer privacy constraints?

---

### 5.3 AI Draft Composition Safety
**Status**: [EDIT THIS - FILL IN]

EmailComposer and AIDraftModal generate emails. Define safety gates before sending.

```
TEMPLATE (FILL IN):
AI draft generation safety checks:

Pre-generation:
  - [ ] Template validation: [YES / NO]
  - [ ] Recipient validation: [YES / NO]

During generation:
  - [ ] Streaming preview: [YES / NO]
  - [ ] Length limits: [MAX CHARS]
  - [ ] Timeout: [SECONDS]

Post-generation (before user sees):
  - [ ] Profanity filter: [YES / NO]
  - [ ] Brand voice compliance: [YES / NO]
  - [ ] Link validation: [YES / NO]

User review phase:
  - [ ] Required edits: [NONE / OPTIONAL / REQUIRED]
  - [ ] Change tracking: [YES / NO]

Pre-send validation:
  - [ ] Unsubscribe link required: [YES / NO / IF BULK]
  - [ ] CAN-SPAM compliance: [YES / NO]
  - [ ] Recipient preference check: [YES / NO / REQUIRED]
  - [ ] Recipient opted-out check: [YES / NO / REQUIRED]
  - [ ] Legal review required: [YES / NO / FOR_TYPES: [LIST]]

Send rate limits:
  - Max emails per hour: [NUMBER] per user
  - Max recipients per draft: [NUMBER]
  - Max retries on failure: [NUMBER]

Severity: [critical / warning / suggestion]

**Flag**: Bypassing safety checks; sending to opted-out users; missing unsubscribe links
```

**Interview question**: What safety gates must pass before an AI-drafted email can be sent?

---

## Section 6: Campaign Execution

> **Status**: NOT DOCUMENTED  
> **Dashboard found**: CampaignAnalyticsEngine, CampaignOutcomeEngine, CampaignStrategist  
> **Codebase**: Campaign creation, execution, analytics, outcomes

### 6.1 Campaign Success Metrics
**Status**: [EDIT THIS - FILL IN]

Define what makes a campaign successful.

```
TEMPLATE (FILL IN):
Campaign success is defined as:
  
  Metric 1: [METRIC_NAME]
    Type: [open_rate / click_rate / reply_rate / conversion / custom]
    Threshold: [>X% / >X /  custom_formula]
    Weight: [X%]

  Metric 2: [METRIC_NAME]
    Type: [...]
    Threshold: [...]
    Weight: [X%]

  [Additional metrics as needed]

Success formula:
  Campaign is SUCCESSFUL if:
    - [CONDITION 1] AND [CONDITION 2] ...
    - OR [CONDITION 3]
    - [EXPLAIN]

Outcome calculation:
  - Data source: [HOW TRACKED - pixel? click? reply?]
  - Update frequency: [REAL-TIME / HOURLY / DAILY / WEEKLY]
  - Attribution window: [DAYS]
  - Deduplication: [HOW - BY CONTACT? BY EMAIL? NONE?]

Campaign execution:
  - Pre-send checks: [VALIDATE RECIPIENTS? TEMPLATE? OTHER?]
  - Send rate limit: [EMAILS / HOUR]
  - Max retries: [NUMBER]
  - Error behavior: [STOP / SKIP / RETRY]

Severity: [critical / warning / suggestion]

**Flag**: Success metrics changed; outcome calculation differs; send limits exceeded
```

**Interview question**: How do you define campaign success? What metrics matter most?

---

## Section 7: Contact Scoring

> **Status**: NOT DOCUMENTED  
> **Dashboard found**: Contact scoring endpoints, daily triage, snapshots  
> **Codebase**: `contacts/[id]/score/route.ts`, scoring logic

### 7.1 Contact Scoring Algorithm
**Status**: [EDIT THIS - FILL IN]

Define how contacts are scored and prioritized.

```
TEMPLATE (FILL IN):
Contact score range: [MIN] to [MAX]
  Default score: [NUMBER]
  [Explain scale: 0 = unengaged, 100 = highly engaged?]

Scoring factors:
  Factor 1: [FACTOR_NAME]
    Weight: [X%]
    Calculation: [HOW_WEIGHTED]
    
  Factor 2: [FACTOR_NAME]
    Weight: [X%]
    Calculation: [...]

  [Additional factors]

Score thresholds and actions:
  Score >X (High priority):
    - Action: [SEND_IMMEDIATELY / QUEUE / PERSONALIZE / OTHER]
    - Send rate: [ACCELERATED / NORMAL]
    - Segment: [VIPS / TOP_TIER]

  Score X-Y (Medium priority):
    - Action: [...]
    - Send rate: [...]

  Score <Z (Low priority):
    - Action: [SKIP / QUEUE_LATER / REMOVE]

Recalculation:
  - Frequency: [REAL_TIME / DAILY / HOURLY / ON_DEMAND]
  - Trigger: [EVERY_EMAIL? OPEN? CLICK? REPLY?]
  - Recalc time window: [DAYS] (only count interactions in last X days)

Edge cases:
  - New contacts: start at [SCORE]
  - Inactive >X days: [DECAY / RESET / NO_CHANGE]
  - Bounces: [REMOVE / SCORE_0 / PRESERVE]

Severity: [critical / warning / suggestion]

**Flag**: Score outside documented range; formula changed; thresholds violated
```

**Interview question**: How do you calculate contact quality? What's the scoring algorithm?

---

## Section 8: Revenue & Monetization

> **Status**: NOT DOCUMENTED  
> **Dashboard found**: Tier-based pricing, feature gating, revenue/ai/ directory  
> **Codebase**: Pricing logic, feature gates, billing

### 8.1 Pricing Tiers and Feature Gating
**Status**: [EDIT THIS - FILL IN]

Define pricing tiers and which features are locked behind them.

```
TEMPLATE (FILL IN):
Pricing tiers:

Tier: FREE
  Price: $0/month
  Features:
    - Campaigns: [X / month / unlimited]
    - Email accounts: [X]
    - Automation rules: [X]
    - AI features: [YES / NO]
    - Storage: [LIMIT]
  Limits:
    - Send limit: [EMAILS / MONTH]
    - API calls: [CALLS / DAY]

Tier: PRO
  Price: $[X] / month
  Features:
    - [LIST]
  Limits:
    - [LIST]

Tier: ENTERPRISE
  Price: Custom
  Features:
    - [LIST]

Feature gating:
  Feature: Campaigns
    Gate: [PRO_ONLY / ALWAYS_FREE / ENTERPRISE]
  Feature: Automations
    Gate: [...]
  Feature: Custom domain
    Gate: [...]
  Feature: [FEATURE]
    Gate: [...]

Billing and payments:
  Payment processor: [STRIPE / OTHER]
  Billing cycle: [MONTHLY / ANNUAL / CUSTOM]
  Invoice generation: [AUTOMATIC / MANUAL]
  Failed payment retry: [POLICY]

Revenue allocation (if creator revenue exists):
  Creator revenue: [X%] of revenue
  Platform revenue: [X%]
  Payout frequency: [WEEKLY / MONTHLY]
  Minimum payout: $[AMOUNT]
  Payout method: [STRIPE / BANK_TRANSFER]

Downgrade policy:
  Downgrading from Pro to Free: [ALLOWED / RESTRICTED]
  Consequence: [FEATURES_DISABLED / DOWNGRADE_AT_END_OF_CYCLE / IMMEDIATE]

Severity: [critical / warning / suggestion]

**Flag**: Tier limits exceeded; feature access outside gate; revenue split changed
```

**Interview question**: What's the pricing model? Do creators get a cut? How are tiers enforced?

---

## Section 9: AI Cost Control

> **Status**: PARTIAL (AIRouter constraint exists, but no cost limits)  
> **Dashboard found**: CostTracker.ts, token tracking, multi-provider calls  
> **Codebase**: Cost tracking, token counting

### 9.1 AI Cost Budgets and Limits
**Status**: [EDIT THIS - FILL IN]

Define spending limits and cost tracking requirements.

```
TEMPLATE (FILL IN):
Cost tracking:
  - Tracking required: [YES / NO / PER_REQUEST / PER_DAY / PER_USER]
  - Log location: [DATABASE_TABLE / LOG_FILE / OTHER]
  - Granularity: [PER_USER / PER_REQUEST / PER_MODEL]
  - Update frequency: [REAL_TIME / HOURLY / DAILY]

Daily cost limits:
  Warning threshold: $[X] / day
    - Alert: [EMAIL / SLACK / DASHBOARD / NONE]
  Soft block threshold: $[Y] / day
    - Behavior: [WARN_USER / SLOW_DOWN / REQUIRE_APPROVAL]
  Hard block threshold: $[Z] / day
    - Behavior: [REJECT_ALL_REQUESTS / NOTIFY_OPS]

Per-request cost limits:
  Max cost per request: $[AMOUNT]
    - Behavior if exceeded: [REJECT / WARN / ALLOW]
  Max input tokens: [NUMBER]
  Max output tokens: [NUMBER]

Per-user limits (if applicable):
  Monthly budget: $[AMOUNT] per user
  Behavior on exceed: [BLOCK / WARN / REQUIRE_APPROVAL]

Cost overrun recovery:
  How to restore functionality: [MANUAL_RESET / AUTO_RESET_AT_MIDNIGHT / OTHER]
  Who can override: [ADMIN / USER / NONE]

Severity: [critical / warning / suggestion]

**Flag**: Cost tracking disabled; limits removed; overages not logged
```

**Interview question**: What's the daily/monthly AI cost budget? When do you warn or block users?

---

## Section 10: AI Multi-Provider Strategy

> **Status**: PARTIAL (AIRouter constraint exists, but no fallback/selection logic)  
> **Dashboard found**: 5+ providers (OpenAI, Anthropic, DeepSeek, Google, Mistral)  
> **Codebase**: AIRouter.ts, multiple provider files

### 10.1 Approved AI Providers and Fallback Strategy
**Status**: [EDIT THIS - FILL IN]

Define which providers are approved and how selection/fallback works.

```
TEMPLATE (FILL IN):
Approved AI providers:
  ✓ OpenAI (GPT-4) — LOCKED_IN / LOCKED_OUT / OPTIONAL
  ✓ Anthropic (Claude) — LOCKED_IN / LOCKED_OUT / OPTIONAL
  ✓ DeepSeek — LOCKED_IN / LOCKED_OUT / OPTIONAL
  ✓ Google Gemini — LOCKED_IN / LOCKED_OUT / OPTIONAL
  ✓ Mistral — LOCKED_IN / LOCKED_OUT / OPTIONAL
  [ ] [OTHER PROVIDER] — LOCKED_IN / LOCKED_OUT / OPTIONAL

Providers that CANNOT be added without approval:
  - [PROVIDER_NAME]
  - [PROVIDER_NAME]

Provider selection logic:
  Default provider: [PROVIDER]
  Selection criteria:
    - Cost: [PRIMARY / SECONDARY / IGNORED]
    - Latency: [PRIMARY / SECONDARY / IGNORED]
    - Quality: [PRIMARY / SECONDARY / IGNORED]
    - [OTHER]: [...]

Fallback strategy:
  Primary provider: [PROVIDER]
    - Fallback to: [SECONDARY]
    - On error: [TIMEOUT / RATE_LIMIT / QUALITY / OTHER]
    
  Secondary provider: [PROVIDER]
    - Fallback to: [TERTIARY]
    - On error: [...]
    
  Tertiary provider: [PROVIDER]
    - If all fail: [RETRY_PRIMARY / ERROR_TO_USER / QUEUE_FOR_LATER]

Retry policy:
  Max retries: [NUMBER]
  Retry backoff: [FIXED / EXPONENTIAL]
  Backoff interval: [SECONDS]
  Max total time: [SECONDS]

Provider timeouts:
  Per-provider timeout: [SECONDS]
  Fallback trigger: [HARD_TIMEOUT / SOFT_TIMEOUT_X_SECONDS]

New provider additions:
  Can new providers be added: [NEVER / WITH_APPROVAL_FROM_CTO / WITH_CODE_REVIEW / ANYTIME]
  Testing requirement: [NONE / UNIT_TESTS / INTEGRATION_TESTS / LOAD_TESTS]

Severity: [critical / warning / suggestion]

**Flag**: Unapproved provider added; fallback order changed; infinite retries; no timeout
```

**Interview question**: Which AI providers are you locked into? What's the fallback order?

---

## Section 11: Automation & Workflow Safety

> **Status**: NOT DOCUMENTED  
> **Dashboard found**: WorkflowEngine, AutomationHub, automation test endpoint  
> **Codebase**: Workflow execution, rule validation

### 11.1 Automation Rules and Execution Safety
**Status**: [EDIT THIS - FILL IN]

Define what automations are allowed and safety constraints.

```
TEMPLATE (FILL IN):
Allowed automation triggers:
  - Email received: [YES / NO]
  - Campaign sent: [YES / NO]
  - Contact scored >X: [YES / NO]
  - User action: [YES / NO]
  - Custom webhook: [YES / NO]
  - Scheduled (cron): [YES / NO]
  - [OTHER]: [YES / NO]

Allowed automation actions:
  - Send email: [YES / NO]
  - Update contact field: [YES / NO]
  - Trigger campaign: [YES / NO]
  - Call webhook: [YES / NO]
  - Create task: [YES / NO]
  - Delete contact: [YES / NO]
  - [OTHER]: [YES / NO]

Forbidden automations:
  Action: [DESCRIBE WHY NOT ALLOWED]
  Action: [...]

Automation rule complexity limits:
  Max conditions per trigger: [NUMBER]
  Max actions per rule: [NUMBER]
  Max total rules per automation: [NUMBER]
  Max nested conditions: [DEPTH]

Automation execution:
  - All automations must pass testing before going live: [YES / NO]
  - Test endpoint: [YES / NO - /api/automations/test/route.ts exists]
  - Max concurrent automations: [NUMBER]

Execution rate limits:
  - Emails per automation: [EMAILS / HOUR]
  - Contacts per automation: [CONTACTS / DAY]
  - API calls per automation: [CALLS / HOUR]

Error handling:
  - Failed execution: [RETRY / SKIP / ALERT]
  - Max retries: [NUMBER]
  - Retry backoff: [FIXED / EXPONENTIAL / LINEAR]

Automation lifecycle:
  - Can automations be paused: [YES / NO]
  - Can automations be stopped mid-run: [YES / NO]
  - Audit trail: [REQUIRED / OPTIONAL / NONE]
  - Can results be rolled back: [YES / NO]

Severity: [critical / warning / suggestion]

**Flag**: Forbidden action executed; rule complexity exceeded; untested automations running
```

**Interview question**: What automations are safe? Should they be tested before execution?

---

## Section 12: Feature Flags & Beta Features

> **Status**: NOT DOCUMENTED  
> **Dashboard found**: Multiple feature areas, multi-tier pricing  
> **Codebase**: Feature gating patterns

### 12.1 Feature Flags and Rollout Policy
**Status**: [EDIT THIS - FILL IN]

Define which features are behind flags and how they're rolled out.

```
TEMPLATE (FILL IN):
Feature status matrix:

Feature: Campaigns
  Status: [STABLE / BETA / EXPERIMENTAL / DEPRECATED]
  Behind flag: [YES / NO]
  Flag name: [FLAG_NAME]
  Default: [ENABLED / DISABLED]
  Rollout: [ALL / BETA_USERS / INTERNAL_ONLY]

Feature: Automations
  Status: [...]
  Behind flag: [...]
  Flag name: [...]
  Default: [...]
  Rollout: [...]

Feature: Email Intelligence
  Status: [...]
  ...

Feature: Contact Scoring
  Status: [...]
  ...

Feature: Visual Generation
  Status: [...]
  ...

Feature: Custom Domain
  Status: [...]
  ...

Feature: [OTHER]
  Status: [...]
  ...

Feature flag implementation:
  Storage: [DATABASE / CODE / LAUNCH_DARKLY / OTHER]
  Updatable without redeploy: [YES / NO]
  Rollout controls: [PERCENTAGE / SEGMENT / PERMISSION_BASED]

Beta feature defaults:
  - Visible to: [BETA_USERS_ONLY / INTERNAL_ONLY / ALL_WITH_FLAG]
  - Require opt-in: [YES / NO]
  - Support commitment: [FULL / LIMITED / NONE]

Experimental feature defaults:
  - Visible to: [INTERNAL_ONLY / NOBODY]
  - Enable by: [ADMIN / NOBODY]
  - Support commitment: [NONE]

Deprecation policy:
  - Deprecated features: [NONE / LIST]
  - Sunset date: [DATE]
  - Migration path: [HOW_TO_UPGRADE]

Severity: [critical / warning / suggestion]

**Flag**: Beta/experimental feature exposed to all users; missing flag logic
```

**Interview question**: Which features are beta? How are they gated?

---

## Section 13: Production Readiness

> **Status**: NOT DOCUMENTED  
> **Dashboard found**: Beta status, 2 test files for 259 total, no error monitoring  
> **Codebase**: Low test coverage, no Sentry/Bugsnag

### 13.1 Production Deployment Requirements
**Status**: [EDIT THIS - FILL IN]

Define what must be true before deploying to production.

```
TEMPLATE (FILL IN):
Deployment checklist:

Code quality:
  [ ] All tests passing: [REQUIRED / OPTIONAL]
  [ ] Test coverage >X%: [REQUIRED / OPTIONAL]
  [ ] Lint issues: [0 / <10 / IGNORED]
  [ ] TypeScript errors: [0 / <5 / IGNORED]
  [ ] No hardcoded secrets: [REQUIRED / OPTIONAL]

Security:
  [ ] All API endpoints have auth: [REQUIRED / OPTIONAL]
  [ ] RLS policies reviewed: [REQUIRED / OPTIONAL]
  [ ] Security headers configured: [REQUIRED / OPTIONAL]
  [ ] No unencrypted credentials: [REQUIRED / OPTIONAL]
  [ ] HTTPS enforced: [REQUIRED / OPTIONAL]

Operations:
  [ ] Error monitoring configured: [REQUIRED / OPTIONAL - Sentry/Bugsnag?]
  [ ] Logging configured: [REQUIRED / OPTIONAL]
  [ ] Database backups enabled: [REQUIRED / OPTIONAL]
  [ ] Database migrations tested: [REQUIRED / OPTIONAL]
  [ ] Rollback plan documented: [REQUIRED / OPTIONAL]

Business logic:
  [ ] Feature gates working: [REQUIRED / OPTIONAL]
  [ ] Revenue tracking working: [REQUIRED / OPTIONAL]
  [ ] Contact scoring working: [REQUIRED / OPTIONAL]
  [ ] Email safety checks passing: [REQUIRED / OPTIONAL]
  [ ] AI provider fallback tested: [REQUIRED / OPTIONAL]

Approval & sign-off:
  [ ] CTO approval: [REQUIRED / OPTIONAL]
  [ ] Security review: [REQUIRED / OPTIONAL]
  [ ] Product review: [REQUIRED / OPTIONAL]
  [ ] Operations review: [REQUIRED / OPTIONAL]

Severity: [critical / warning / suggestion]

**Flag**: Deploying without checklist; skipping required items
```

**Interview question**: What must pass before shipping to production?

---

### 13.2 Error Monitoring and Observability
**Status**: [EDIT THIS - FILL IN]

Error monitoring is currently MISSING. This is critical for production.

```
TEMPLATE (FILL IN):
Error monitoring requirement:
  Status: [REQUIRED / OPTIONAL]
  Provider: [Sentry / Bugsnag / DataDog / OTHER]
  
  If required, must be configured BEFORE production deployment.

Configuration:
  Environments: [production / staging / development]
  Sample rate: [100% / X%]
  Release tracking: [YES / NO]

Alert triggers:
  Error rate >X% in 5-minute window: [ALERT / WARN / IGNORE]
  Specific error [ERROR_TYPE]: [ALERT / IGNORE]
  API response time >X seconds: [ALERT / IGNORE]
  Database query time >X seconds: [ALERT / IGNORE]

Monitored systems (minimum):
  [ ] All API endpoints
  [ ] All AI provider calls
  [ ] All database queries
  [ ] All Supabase RLS violations
  [ ] All automation executions
  [ ] [OTHER]

Alert recipients:
  On-call: [EMAIL / SLACK / PAGERDUTY]
  Escalation: [POLICY]

Severity: [CRITICAL - must be configured]

**Flag**: No error monitoring; alerts disabled; errors not logged
```

**Critical question**: Where do production errors go? This is missing entirely.

---

## Template Completion Checklist

- [ ] Section 5: Email Management (5.1, 5.2, 5.3)
- [ ] Section 6: Campaign Execution (6.1)
- [ ] Section 7: Contact Scoring (7.1)
- [ ] Section 8: Revenue & Monetization (8.1)
- [ ] Section 9: AI Cost Control (9.1)
- [ ] Section 10: AI Multi-Provider (10.1)
- [ ] Section 11: Automation Safety (11.1)
- [ ] Section 12: Feature Flags (12.1)
- [ ] Section 13: Production Readiness (13.1, 13.2)

**Total new constraints**: 13 sections × 1-3 constraints each = 13-20 constraints

**Combined with existing 14 constraints**: 27-34 total constraints (~85-90% coverage)

---

## Interview Schedule

**Tuesday**: Email + AI Cost (Sections 5, 9)
- **Who**: Email/comms lead + AI lead
- **Duration**: 1.5 hours
- **Outcome**: Sections 5.1-5.3, 9.1 drafted

**Wednesday**: Business Logic (Sections 6, 7, 8)
- **Who**: Product lead + Analytics lead
- **Duration**: 2 hours
- **Outcome**: Sections 6.1, 7.1, 8.1 drafted

**Thursday**: AI Strategy + Automation + Features (Sections 10, 11, 12)
- **Who**: AI lead + Engineering lead + Product lead
- **Duration**: 1.5 hours
- **Outcome**: Sections 10.1, 11.1, 12.1 drafted

**Friday**: Production Readiness (Section 13) + Review
- **Who**: CTO + Engineering lead
- **Duration**: 1.5 hours
- **Outcome**: Section 13.1-13.2 drafted + full review + final sign-off

---

## Expected Output

**By Friday EOD**:
- Original 14 constraints: VERIFIED ✓
- New 13-20 constraints: DOCUMENTED ✓
- Total: 27-34 constraints
- Status: ACTIVE (ready for dashboard audit)
- Coverage: ~85-90%

**This puts FounderOS in the same league as Codra (80%), Embr (90%), and Relevnt (95%).**
