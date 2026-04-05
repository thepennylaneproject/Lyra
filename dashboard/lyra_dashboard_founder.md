# Founder — Codebase Intelligence Audit

## SECTION 1: PROJECT IDENTITY

### 1. Project Name
founderos [VERIFIED]

### 2. Repository URL
https://github.com/thepennylaneproject/founderos [VERIFIED]

### 3. One-Line Description
Quoted from README or metadata:
> > Part of <a href="https://thepennylaneproject.org">The Penny Lane Project</a> — technology that serves the individual.

Cleaner version: > Part of <a href="https://thepennylaneproject.org">The Penny Lane Project</a> — technology that serves the individual. [VERIFIED OR DIRECTLY QUOTED]

### 4. Project Status
beta [INFERRED FROM CODEBASE SIGNALS]

### 5. Commit Dates
- First commit: 2025-12-21T16:20:25-06:00
- Most recent commit: 2026-03-17T22:06:38-05:00

### 6. Total Number of Commits
77

### 7. Deployment Status
Docker config detected, GitHub Actions detected, README references external URLs

### 8. Live URLs
- https://thepennylaneproject.org
- https://www.docker.com/products/docker-desktop/
- http://json-schema.org/draft-07/schema#
- https://registry.npmjs.org/@alloc/quick-lru/-/quick-lru-5.2.0.tgz
- https://registry.npmjs.org/@aws-crypto/sha256-browser/-/sha256-browser-5.2.0.tgz
- https://registry.npmjs.org/@smithy/is-array-buffer/-/is-array-buffer-2.2.0.tgz
- https://registry.npmjs.org/@smithy/util-buffer-from/-/util-buffer-from-2.2.0.tgz
- https://registry.npmjs.org/@smithy/util-utf8/-/util-utf8-2.3.0.tgz
- https://registry.npmjs.org/@aws-crypto/sha256-js/-/sha256-js-5.2.0.tgz
- https://registry.npmjs.org/@aws-crypto/supports-web-crypto/-/supports-web-crypto-5.2.0.tgz

## SECTION 2: TECHNICAL ARCHITECTURE

### 1. Primary Languages and Frameworks
- Languages: Python, SQL, TypeScript, JavaScript
- Frameworks: Next.js, React

### 2. Full Dependency List
### Core framework dependencies
- @supabase/auth-helpers-nextjs@^0.8.7
- lucide-react@^0.330.0
- next@^15.3.9
- react@^18
- react-dom@^18
- @types/react@^18
- @types/react-dom@^18
- eslint-config-next@^15.3.9

### UI / styling libraries
- tailwind-merge@^2.2.1
- tailwindcss@^3.4.1

### API / data layer
- @supabase/auth-helpers-nextjs@^0.8.7
- @supabase/supabase-js@^2.90.1
- pg@^8.16.3
- @types/pg@^8.16.0

### AI / ML integrations
- [NOT FOUND IN CODEBASE]

### Authentication
- @supabase/auth-helpers-nextjs@^0.8.7
- @supabase/supabase-js@^2.90.1

### Testing
- [NOT FOUND IN CODEBASE]

### Build tooling
- eslint@^8
- eslint-config-next@^15.3.9
- typescript@^5

### Other
- clsx@^2.1.0
- dotenv@^17.2.3
- imapflow@^1.2.1
- node-cron@^3.0.3
- nodemailer@^7.0.11
- shepherd.js@^14.5.1
- uuid@^9.0.1
- zod@^4.3.5
- @types/node@^20
- @types/node-cron@^3.0.11
- @types/nodemailer@^7.0.4
- @types/uuid@^9.0.8
- autoprefixer@^10.4.23
- postcss@^8

### 3. Project Structure
- `AGENTS.md` — documentation
- `Dockerfile` — repository content
- `Makefile` — repository content
- `README.md` — documentation
- `audits` — audit artifacts, reports, and agent prompts
- `database` — repository content
- `docker-compose.yml` — project config file
- `docs` — documentation
- `lyra-starter-v1.1.zip` — repository content
- `next-env.d.ts` — project config file
- `next.config.mjs` — project config file
- `package-lock.json` — project config file
- `package.json` — project config file
- `postcss.config.js` — project config file
- `public` — repository content
- `scripts` — scripts and tooling
- `src` — primary application code
- `tailwind.config.js` — project config file
- `tsconfig.json` — project config file

### 4. Architecture Pattern
**Build**: Next.js (App Router)
**Backend**: Next.js App Router — 53 API route handlers under `app/api/`
**Folder structure**: `features/` — vertical feature slices, `lib/` — shared utilities, API clients, design tokens, `components/` — shared UI components, `hooks/` — custom React hooks
**Validation**: Zod schema validation at API boundaries

### 5. Database / Storage Layer
supabase [VERIFIED OR INFERRED FROM CONFIG]

### 6. API Layer
**API endpoints detected (53):**
- `src/app/api/ai/analyze-email/route.ts` [POST]
- `src/app/api/ai/automation/route.ts` [GET/POST/PATCH/DELETE]
- `src/app/api/ai/brand-voice/route.ts` [GET/POST/PATCH/DELETE]
- `src/app/api/ai/copywriter/route.ts` [GET/POST]
- `src/app/api/ai/draft/route.ts` [POST]
- `src/app/api/ai/generate/route.ts` [GET/POST]
- `src/app/api/ai/personalization/route.ts` [GET/POST/PATCH/DELETE]
- `src/app/api/ai/settings/route.ts` [GET/POST/PATCH/DELETE]
- `src/app/api/ai/strategist/route.ts` [GET/POST]
- `src/app/api/ai/usage/route.ts` [GET]
- `src/app/api/ai/visual/route.ts` [GET/POST]
- `src/app/api/automations/rules/route.ts` [GET/POST/PATCH]
- `src/app/api/automations/test/route.ts` [GET/POST]
- `src/app/api/campaigns/[id]/analytics/route.ts` [GET]
- `src/app/api/campaigns/[id]/execute/route.ts` [GET/POST/PATCH]
- `src/app/api/campaigns/[id]/log-sends/route.ts` [POST]
- `src/app/api/campaigns/[id]/outcomes/route.ts` [GET/POST]
- `src/app/api/campaigns/analytics/dashboard/route.ts` [GET]
- `src/app/api/campaigns/route.ts` [GET/POST/PATCH]
- `src/app/api/contacts/[id]/email-insights/route.ts` [GET/PATCH]
- `src/app/api/contacts/[id]/score/route.ts` [POST]
- `src/app/api/contacts/[id]/snapshot/route.ts` [GET/POST]
- `src/app/api/contacts/route.ts` [GET/POST]
- `src/app/api/contacts/score/route.ts` [GET/POST]
- `src/app/api/contacts/triage/route.ts` [GET/POST]
- ... + 28 more endpoints

### 7. External Service Integrations
- **Supabase** — PostgreSQL DB, Auth, Storage
- **Email Service** — Transactional email
- **DeepSeek** — AI completions (inferred from code)
- **Google Gemini** — AI completions (inferred from code)

### 8. AI/ML Components
**AI-related source files:** `src/app/api/ai/analyze-email/route.ts`, `src/app/api/ai/automation/route.ts`, `src/app/api/ai/brand-voice/route.ts`, `src/app/api/ai/copywriter/route.ts`, `src/app/api/ai/draft/route.ts`, `src/app/api/ai/generate/route.ts`, `src/app/api/ai/personalization/route.ts`, `src/app/api/ai/settings/route.ts`, `src/app/api/ai/strategist/route.ts`, `src/app/api/ai/usage/route.ts`, `src/app/api/ai/visual/route.ts`, `src/app/api/campaigns/[id]/analytics/route.ts`, `src/app/api/campaigns/[id]/execute/route.ts`, `src/app/api/campaigns/[id]/log-sends/route.ts`, `src/app/api/campaigns/[id]/outcomes/route.ts`, `src/app/api/campaigns/analytics/dashboard/route.ts`, `src/app/api/campaigns/route.ts`, `src/app/api/contacts/[id]/email-insights/route.ts`, `src/app/api/domains/[domain]/validate/route.ts`, `src/app/api/domains/route.ts`, `src/app/api/emails/accounts/route.ts`, `src/app/api/emails/drafts/route.ts`, `src/app/api/emails/inbox/route.ts`, `src/app/api/emails/reply/route.ts`, `src/app/api/emails/route.ts`, `src/app/api/emails/send/route.ts`, `src/app/api/jobs/daily-email-intelligence/route.ts`, `src/app/api/jobs/daily-outcomes/route.ts`, `src/app/api/jobs/daily-snapshots/route.ts`, `src/app/api/jobs/daily-triage/route.ts`, `src/ai/AIRouter.ts`, `src/ai/AutomationHub.ts`, `src/ai/BrandVoice.ts`, `src/ai/CampaignStrategist.ts`, `src/ai/Copywriter.ts`, `src/ai/CostTracker.ts`, `src/ai/index.ts`, `src/ai/PersonalizationEngine.ts`, `src/ai/providers/anthropic.ts`, `src/ai/providers/base.ts`, `src/ai/providers/deepseek.ts`, `src/ai/providers/google.ts`, `src/ai/providers/index.ts`, `src/ai/providers/mistral.ts`, `src/ai/providers/openai.ts`, `src/ai/types.ts`, `src/ai/VisualGenerator.ts`, `src/app/(dashboard)/campaigns/page.tsx`, `src/app/(dashboard)/domains/page.tsx`, `src/app/(dashboard)/email-accounts/page.tsx`, `src/campaigns/CampaignEngine.ts`, `src/components/ai/AutomationBuilder.tsx`, `src/components/ai/BrandVoiceWizard.tsx`, `src/components/ai/CampaignStrategistPanel.tsx`, `src/components/ai/CopywriterPanel.tsx`, `src/components/ai/PersonalizationPanel.tsx`, `src/components/ai/VisualGeneratorPanel.tsx`, `src/components/campaigns/CampaignDetailModal.tsx`, `src/components/campaigns/CampaignOutcomesPanel.tsx`, `src/components/campaigns/CreateCampaignForm.tsx`, `src/components/crm/AIDraftModal.tsx`, `src/components/crm/EmailInsightsPanel.tsx`, `src/components/domains/AddDomainForm.tsx`, `src/components/domains/DomainSetupGuide.tsx`, `src/components/email/AddEmailAccountForm.tsx`, `src/components/email/EmailAccountCard.tsx`, `src/components/email/EmailActionButtons.tsx`, `src/components/email/EmailComposer.tsx`, `src/components/email/EmailFolderNav.tsx`, `src/components/Providers.tsx`, `src/domains/DomainManager.ts`, `src/hooks/useCampaignAnalytics.ts`, `src/hooks/useEmailAccounts.ts`, `src/hooks/useEmailActions.ts`, `src/hooks/useEmailInsights.ts`, `src/hooks/useStreamingAI.tsx`, `src/intelligence/CampaignAnalyticsEngine.ts`, `src/intelligence/CampaignOutcomeEngine.ts`, `src/intelligence/EmailIntelligenceEngine.ts`, `src/lib/email.ts`, `src/lib/jobs/dailyContactSnapshots.ts`, `src/lib/jobs/dailyContactTriage.ts`, `src/lib/jobs/dailyEmailIntelligence.ts`, `src/lib/jobs/dailyOutcomeRecalculation.ts`, `src/revenue/ai/FounderAssistant.ts`, `tailwind.config.js`, `AGENTS.md`, `audits/prompts/agent-data.md`, `audits/prompts/agent-deploy.md`, `audits/prompts/agent-logic.md`, `audits/prompts/agent-performance.md`, `audits/prompts/agent-security.md`

**Detected patterns:** Prompt templating, RAG / retrieval augmentation, Streaming completions, Provider/Router architecture, Multi-provider fallback, Token/cost tracking, Model benchmarking

### 9. Authentication and Authorization Model
**Auth libraries:** @supabase/auth-helpers-nextjs@^0.8.7, @supabase/supabase-js@^2.90.1

**Auth-related files:** `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/lib/apiAuth.ts`, `src/lib/auth.ts`, `audits/session.py`

**Auth methods:** Supabase Auth (JWT), Bearer token verification, Row-Level Security, Email/password + OAuth, Route guards

### 10. Environment Variables
- ANTHROPIC_API_KEY
- API_BASE
- DATABASE_SSL_CA
- DATABASE_URL
- DEEPSEEK_API_KEY
- FOUNDER_EMAIL
- GOOGLE_API_KEY
- IMAP_HOST
- IMAP_PASS
- IMAP_PORT
- IMAP_USER
- LINEAR_API
- LINEAR_API_KEY
- LINEAR_LABEL_ID
- LINEAR_PROJECT_ID
- LINEAR_TEAM_ID
- LINEAR_TO_LYRA_STATUS
- MAIL_FROM_ADDRESS
- MISTRAL_API_KEY
- NEXT_PUBLIC_APP_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_SUPABASE_URL
- NODE_ENV
- OPENAI_API_KEY
- POSTGRES_URL
- REDIS_URL
- SMTP_HOST
- SMTP_PASS
- SMTP_PORT
- SMTP_SECURE
- SMTP_USER
- STABILITY_API_KEY
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_SUPABASE_URL

### 11. State Management
**React Context providers (2):** `src/context/UIContext.tsx`, `src/context/UserContext.tsx`

### 12. Database Schema
[NOT FOUND IN CODEBASE]

### 13. Key Subsystem Summaries
**`src/ai/providers/base.ts`** — Prompt template engine / base provider
Exports: `registerProvider`, `getProvider`, `getAllProviders`, `getAvailableProviders`
Behaviours: provider fallback / retry

## SECTION 3: FEATURE INVENTORY

| Feature Area | Files | Key Paths |
|---|---|---|
| **UI Components** | 85 files | `src/app/(dashboard)/automations/page.tsx`, `src/app/(dashboard)/campaigns/page.tsx`, `src/app/(dashboard)/crm/page.tsx`, `src/app/(dashboard)/domains/page.tsx`, `src/app/(dashboard)/email-accounts/page.tsx` + 80 more — signals: JWT auth, exports, HTTP calls, React state, RLS |
| **Specification Engine** | 37 files | `audits/.gitignore`, `audits/LYRA-AUDIT-SUITE.md`, `audits/README.md`, `audits/WORKFLOW.md`, `audits/artifacts/_run_/.gitkeep` + 32 more — signals: JWT auth, RLS |
| **AI / ML Integration** | 35 files | `src/ai/AIRouter.ts`, `src/ai/AutomationHub.ts`, `src/ai/BrandVoice.ts`, `src/ai/CampaignStrategist.ts`, `src/ai/Copywriter.ts` + 30 more — signals: JWT auth, HTTP calls, exports, React state |
| **Other** | 26 files | `database/init.sql`, `lyra-starter-v1.1.zip`, `public/.keep`, `src/automation/WorkflowEngine.ts`, `src/campaigns/CampaignEngine.ts` + 21 more — signals: exports, Stripe integration |
| **Utilities & Scripts** | 22 files | `Makefile`, `scripts/logs.sh`, `scripts/seed-inbox.js`, `scripts/start.sh`, `scripts/stop.sh` + 17 more — signals: React state, exports, HTTP calls, RLS, Stripe integration |
| **Documentation** | 15 files | `.dockerignore`, `AGENTS.md`, `Dockerfile`, `README.md`, `docker-compose.yml` + 10 more |
| **Configuration** | 10 files | `.env.example`, `.eslintrc.json`, `.gitignore`, `next-env.d.ts`, `next.config.mjs` + 5 more |
| **React Hooks** | 10 files | `src/hooks/useCampaignAnalytics.ts`, `src/hooks/useEmailAccounts.ts`, `src/hooks/useEmailActions.ts`, `src/hooks/useEmailInsights.ts`, `src/hooks/useFormDraft.ts` + 5 more — signals: exports, HTTP calls, React state |
| **Database / Migrations** | 8 files | `database/migrations/001_add_event_logging_foundation.sql`, `database/migrations/002_add_email_intelligence_foundation.sql`, `database/migrations/003_email_client_features.sql`, `database/migrations/004_add_authentication_and_multitenancy.sql`, `database/migrations/004_supabase_schema_alignment.sql` + 3 more |
| **Authentication** | 4 files | `audits/session.py`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/lib/auth.ts` — signals: exports, React state, JWT auth, RLS |
| **Onboarding** | 3 files | `src/components/dashboard/OnboardingWelcome.tsx`, `src/components/onboarding/GuidedTour.tsx`, `src/styles/tour.css` — signals: exports, React state |
| **Agent / CI Rules** | 2 files | `.cursor/rules/expectations.mdc`, `.github/workflows/inbox-tests.yml` |
| **Testing** | 1 files | `src/app/api/automations/test/route.ts` |
| **Design System** | 1 files | `src/app/globals.css` |

## SECTION 4: DESIGN SYSTEM & BRAND

**CSS framework:** Tailwind CSS

**Icons:** Icon library detected

**UI component files (45):** `src/app/(dashboard)/layout.tsx`, `src/app/layout.tsx`, `src/components/ai/AutomationBuilder.tsx`, `src/components/ai/BrandVoiceWizard.tsx`, `src/components/ai/CampaignStrategistPanel.tsx`, `src/components/ai/CopywriterPanel.tsx`, `src/components/ai/PersonalizationPanel.tsx`, `src/components/ai/VisualGeneratorPanel.tsx` + more

**Design token / theme files:** `src/components/ui/CommandPalette.tsx`

## SECTION 5: DATA & SCALE SIGNALS

| Signal | Value |
|---|---|
| Total files scanned | 259 |
| Source files sampled | 200 |
| Test files | 2 |
| Config files | 14 |
| Commits | 77 |
| Repository age | ~12 weeks |
| Commit velocity | ~6/week |

**Performance patterns:** Pre-computed aggregates, Code splitting (React.lazy), Memoization, Concurrency control, Content deduplication

## SECTION 6: MONETIZATION & BUSINESS LOGIC

**Billing patterns:** Tier-based feature gating, Multi-tier pricing

## SECTION 7: CODE QUALITY & MATURITY SIGNALS

**Validation commands:**

- Test: [NOT FOUND IN CODEBASE]
- Lint: `next lint`
- Build: `next build`
- Typecheck: [NOT FOUND IN CODEBASE]



**Test files (2):** `scripts/test-inbox.js`, `src/app/api/automations/test/route.ts`

**Quality tooling:** ESLint, TypeScript

**Code patterns:** Structured error handling, Console logging, Zod validation, Error boundaries

## SECTION 8: ECOSYSTEM CONNECTIONS

- Primary repository: https://github.com/thepennylaneproject/founderos

## SECTION 9: WHAT'S MISSING (CRITICAL)

| Gap | Severity | Notes |
|---|---|---|
| Low test coverage | Medium | 2 test files for 259 total files |
| No error monitoring service | Medium | No Sentry, Bugsnag, or similar dependency found |

**Recommended next steps:**
1. Review and tighten the generated expectations document.
2. Confirm scan roots and commands before activating audits.
3. Run a scoped full audit after activation.
4. Address high-severity gaps before production deployment.
5. Capture operator decisions so Lyra can calibrate future audits.

## SECTION 10: EXECUTIVE SUMMARY

**Founder** is a **beta** Next.js application with 77 commits over ~12 weeks (~6 commits/week). It is built around multi-provider AI routing (OpenAI, Anthropic, DeepSeek, Google Gemini), visual workflow composition, RAG / retrieval augmentation, backed by Supabase (PostgreSQL + Auth + RLS) and deployed as a Netlify SPA with serverless functions.

2 test files are present. Quality tooling includes ESLint. The serverless layer handles auth callbacks, AI completions, billing webhooks, asset management, and credential storage — all functions are TypeScript with Supabase JWT verification.

Key gaps before production hardening: no error monitoring. Profile generated from static analysis — runtime behaviour, RLS policy correctness, and external service configuration require a scoped audit to verify.

```
---
AUDIT METADATA
Project: Founder
Date: 2026-03-29
Agent: lyra-onboarding-foundation
Codebase access: full repo
Confidence level: medium; deterministic repo inspection without runtime execution
Sections with gaps: sections depending on runtime, external services, and undocumented product intent
Total files analyzed: 259
---
```