# [App Name] — Intelligence Extraction Audit

**Audit Date:** [YYYY-MM-DD]
**Auditor:** Lyra Intelligence System
**Project URL:** [repository URL or N/A]
**Status:** [Concept / Prototype / Alpha / Beta / Production]

---

## SECTION 1: PROJECT IDENTITY

**Project Name:** [Legal project name as found in package.json, config files, README]

**Repository URL:** [Git URL or deployment URL if available]

**One-Line Description:**
> [Exact quote from README, package.json description, or meta tags]

**Cleaner Description:**
[Reworded for clarity if needed]

**Project Status:** [Classification]
- Concept — mostly scaffolding/boilerplate, idea-stage
- Prototype — core features partially implemented, experimental
- Alpha — core features working, rough edges remain
- Beta — feature-complete for v1, needs polish/optimization
- Production — deployed, handling real users

**First Commit:** [Date]
**Most Recent Commit:** [Date]
**Total Commits:** [Number]

**Deployment Status:**
- Deployed: [Yes/No]
- Host/Environment: [Netlify, Vercel, self-hosted, AWS, etc.]
- Live URL(s): [Link to production if applicable]

---

## SECTION 2: TECHNICAL ARCHITECTURE

### Primary Languages & Frameworks
| Component | Language | Framework | Version |
|-----------|----------|-----------|---------|
| Frontend | TypeScript | React / Vue / Next.js | [version] |
| Backend | Node.js / Python / Go | Express / FastAPI / Fiber | [version] |
| Database | SQL / NoSQL | PostgreSQL / MongoDB | [version] |

### Complete Dependency List

**Core Framework Dependencies:**
- [Framework name + version] — [brief purpose]
- [Example: Next.js 16.1.7 — React meta-framework with App Router]

**UI/Styling Libraries:**
- [UI library + version]
- [Example: Tailwind CSS 4.0 — utility-first CSS framework]

**State Management:**
- [Redux / Zustand / Context API / none]
- [Details about state handling]

**API/Data Layer:**
- [REST client / GraphQL / API mocking / etc.]
- [Example: SWR — React hook for data fetching]

**AI/ML Integrations:**
- [Model provider + endpoint]
- [Example: OpenAI gpt-4o via @openai/sdk]

**Authentication/Authorization:**
- [Auth library / service]
- [Example: Supabase Auth (JWT-based)]

**Testing:**
- [Test framework + version]
- [Example: Jest 29 + React Testing Library]

**Build Tooling:**
- [Build tool + version]
- [Example: Turbopack, Webpack, Vite]

**Other Notable Dependencies:**
- [Database ORM] — [version and purpose]
- [Logging] — [version and purpose]
- [Monitoring] — [version and purpose]

### Project Structure

```
[ProjectRoot]/
├── src/                          # Source code
│   ├── components/               # Reusable UI components
│   ├── pages/ or app/            # Page routes or app router
│   ├── lib/ or utils/            # Utility functions
│   ├── styles/                   # Global styles or theme
│   └── types/                    # TypeScript type definitions
├── tests/ or __tests__/          # Test suites
├── public/                       # Static assets
├── docs/                         # Documentation
├── package.json                  # Dependencies + build scripts
├── tsconfig.json                 # TypeScript configuration
├── .env.example                  # Environment template
└── README.md                     # Project overview
```

**Directory Purpose Summary:**
- **src/components** — Reusable React/Vue components (buttons, cards, modals, etc.)
- **src/pages** — Route-based pages; each file = one route
- **src/lib** — Shared utilities: API clients, formatters, validators, custom hooks
- **src/types** — Centralized TypeScript interfaces and type definitions
- **tests** — Unit, integration, and E2E tests
- **public** — Images, fonts, favicons, etc. (served as-is)

### Architecture Pattern

**Pattern:** [Monolith / Microservices / Serverless / JAMstack / MVC / Component-Based]

**Data Flow:**
[Describe the flow from user interaction → frontend → API → backend → database → response]

Example:
> User submits form → React component validates input → SWR hook calls GET /api/projects → API route queries Postgres → JSON response → state update → UI re-renders

### Database/Storage Layer

**Primary Database:** [PostgreSQL / MongoDB / SQLite / Firebase / etc.]

**ORM/Query Layer:** [Prisma / Sequelize / SQLAlchemy / none]

**Tables/Collections & Schema:**

| Table Name | Purpose | Key Columns |
|-----------|---------|------------|
| `users` | User accounts | `id`, `email`, `created_at` |
| `projects` | Portfolio projects | `name`, `status`, `metadata_json` |
| `audit_runs` | Audit history | `id`, `project_name`, `status`, `created_at` |

[Add more rows as applicable]

**Notable Schema Features:**
- [Soft deletes / RLS policies / Constraints / Computed columns / etc.]

### API Layer

**API Type:** [REST / GraphQL / RPC / Hybrid]

**Authentication:** [Bearer tokens / API keys / Session cookies / None]

**Base URL (Production):** [https://api.example.com or /api (relative)]

**Documented Endpoints:**

| Route | Method | Purpose | Auth Required |
|-------|--------|---------|---------------|
| `/api/projects` | GET | List all projects | Yes |
| `/api/projects` | POST | Create new project | Yes |
| `/api/projects/:name` | GET | Get project details | Yes |
| `/api/projects/:name` | PATCH | Update project | Yes |
| `/api/health` | GET | Health check | No |

[Add all major endpoints; group by domain]

**Response Format (Example):**
```json
{
  "ok": true,
  "data": { ... },
  "error": null
}
```

### External Service Integrations

| Service | Purpose | Auth Method | Rate Limits |
|---------|---------|------------|------------|
| OpenAI | Code analysis via GPT-4 | API key (env var) | 500 req/min |
| Linear | Issue tracking sync | OAuth 2.0 | [Check docs] |
| Supabase | Database + Auth | Service key | [Database quotas] |

### AI/ML Components

**Models Used:**
- [Model name + provider] — [version/size]
- [Example: Claude 3.5 Sonnet via Anthropic API]

**Prompts & Chains:**
- [Brief description of prompts, not full text]
- Example: "Agent A reviews code for runtime bugs using system prompt X and context sampling from files Y"

**Output Processing:**
- How is AI output parsed, validated, stored?
- [Example: JSON parsing → validation against schema → store in DB]

### Authentication & Authorization Model

**User Authentication:**
- [Method: OAuth / JWT / Session / None]
- [Provider: Google / GitHub / custom / etc.]

**Permission Levels:**
- Admin — Full access to all projects and admin panel
- Editor — Can view and edit projects; cannot delete
- Viewer — Read-only access

**Session Management:**
- [Cookie-based / JWT tokens / API keys]
- [TTL / refresh logic]

### Environment Variables

**Required Variables:**
```
DATABASE_URL         # PostgreSQL connection string
REDIS_URL           # Redis connection (optional)
OPENAI_API_KEY      # OpenAI API key
LINEAR_API_TOKEN    # Linear sync authentication
NEXT_PUBLIC_APP_URL # Frontend URL (public)
```

**Optional Variables:**
```
DEBUG               # Enable verbose logging
SENTRY_DSN         # Error monitoring
FEATURE_FLAGS      # JSON of feature toggles
```

---

## SECTION 3: FEATURE INVENTORY

### Feature 1: [Feature Name]

**User-Facing Description:**
What does this feature let a user do? [1-2 sentences]

**Implementation Status:** [Scaffolded / Partial / Functional / Polished]

**Key Files:**
- `/src/components/FeatureWidget.tsx` — Main UI component
- `/src/lib/featureLogic.ts` — Core business logic
- `/api/feature/route.ts` — API endpoint

**Dependencies:**
- Requires Feature 2 (status) to function
- Requires database migration M-001 to be applied

---

### Feature 2: [Feature Name]

[Repeat structure above for each distinct feature]

---

## SECTION 4: DESIGN SYSTEM & BRAND

### Color Palette

| Color Name | Hex | RGB | Usage | Source |
|-----------|-----|-----|-------|--------|
| Primary | #3B82F6 | rgb(59, 130, 246) | Buttons, links | tailwind.config.js |
| Danger | #EF4444 | rgb(239, 68, 68) | Destructive actions | tailwind.config.js |
| Success | #10B981 | rgb(16, 185, 129) | Success states | tailwind.config.js |

### Typography

**Fonts Loaded:**
- Inter (weights: 400, 500, 600, 700) — Primary font
- Mono (weights: 400) — Code blocks

**Type Scale:**
```
h1: 2.25rem (36px) / font-bold
h2: 1.875rem (30px) / font-bold
h3: 1.5rem (24px) / font-semibold
body: 1rem (16px) / font-normal
small: 0.875rem (14px) / font-normal
```

### Component Library

**Reusable Components:**

| Component | Purpose | File |
|-----------|---------|------|
| `<Button>` | Interactive button with variants | `/components/Button.tsx` |
| `<Modal>` | Dialog overlay with content | `/components/Modal.tsx` |
| `<Card>` | Container with shadow and padding | `/components/Card.tsx` |
| `<Spinner>` | Loading indicator | `/components/Spinner.tsx` |

### Design Language

**Visual Style:** [Minimal / Playful / Corporate / Editorial / Custom]

**Examples:**
- Rounded corners (8px default)
- Subtle shadows for depth
- Spacious padding (consistent grid)
- Accessible color contrast (WCAG AA)

### Responsive Strategy

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Responsive Patterns:**
- Sidebar collapses to hamburger menu on mobile
- Grid layouts stack vertically on mobile
- Font sizes scale proportionally

### Dark Mode

**Supported:** [Yes / No]

**Implementation:** [CSS custom properties / Tailwind dark: variant / Context API + CSS-in-JS]

**Toggle Location:** Settings panel / User menu / System preference

### Brand Assets

- Logo: `/public/logo.svg` (light + dark variants)
- Favicon: `/public/favicon.ico`
- Illustrations: None or [describe]

---

## SECTION 5: DATA & SCALE SIGNALS

### User Model

**Data Stored Per User:**
```typescript
interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: "admin" | "editor" | "viewer";
  created_at: string;
  updated_at: string;
  settings: {
    theme: "light" | "dark" | "system";
    notifications_enabled: boolean;
  };
}
```

**User Journey:**
1. User signs up via OAuth or email
2. System creates user record + default project
3. User imports codebase or starts manually
4. System queues audit job
5. User reviews findings and manages repairs

### Content/Data Volume

**Designed Capacity:**
- Support [X] projects
- Support [X] users
- Support [X] findings per project
- Support [X] audit runs per project

**Seed/Fixture Data:**
- [If available: `/fixtures/seed.sql` or `/data/sample-projects.json`]

### Performance Considerations

**Optimization Patterns:**
- [Pagination: 30 items per page]
- [Caching: 5-minute TTL on project data]
- [Lazy Loading: Components load on scroll]
- [Code Splitting: Route-based splitting with Turbopack]

**Rate Limiting:**
- API: 100 requests/minute per user
- Job Enqueue: 1 audit job per project per day (unless manual override)

### Analytics/Tracking

**Events Tracked:**
- `project_created` — New project onboarded
- `audit_started` — Audit job enqueued
- `finding_status_changed` — Finding status updated
- `repair_queued` — Repair job created

**Analytics Service:** [Google Analytics / Sentry / Custom / None]

### Error Handling

**Error Logging:**
- All errors logged to [Sentry / console / custom logger]
- User-facing errors in modal/toast notifications
- Technical errors sent to monitoring service

**Retry Logic:**
- Failed API calls: 3 retries with exponential backoff
- Failed jobs: Marked as failed after 3 attempts

---

## SECTION 6: MONETIZATION & BUSINESS LOGIC

### Pricing/Tier Structure

[If applicable, describe plans]

**Plans:**
- Free: [Features] — [Cost]
- Pro: [Features] — [Cost]
- Enterprise: [Features] — [Cost]

**Feature Gating:**
- Repair engine access — Pro+ only
- Bulk operations — Enterprise only

### Payment Integration

**Processor:** [Stripe / PayPal / None]

**Billing Cycle:** [Monthly / Annual / One-time]

### Subscription/Billing Logic

[If applicable, describe recurring billing, trials, etc.]

### Usage Limits

**Rate Limits:**
- [X] audits per month (Free) / unlimited (Pro+)
- [X] repair operations per project

**Storage:**
- [X] GB per project

---

## SECTION 7: CODE QUALITY & MATURITY SIGNALS

### Code Organization

**Separation of Concerns:**
- ✅ UI logic isolated in React components
- ✅ API logic in `/api` routes
- ✅ Business logic in `/lib` utilities
- ⚠️ Some [describe issue] mixed in components

**Module Structure:** Clear module boundaries; circular dependencies checked

### Patterns & Conventions

**Design Patterns Used:**
- **Repository Pattern** — `/lib/orchestration-jobs.ts` encapsulates DB queries
- **Facade Pattern** — `/lib/api-fetch.ts` wraps fetch with auth handling
- **Hook Pattern** — Custom React hooks for state and side effects

**Naming Conventions:**
- Components: PascalCase (`ProjectView.tsx`)
- Functions: camelCase (`fetchProjects()`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- Types: PascalCase (`LyraAuditRunRow`)

### Documentation Quality

**README:** ✅ Comprehensive, explains deployment + architecture
**Inline Comments:** ⚠️ Sparse; present only for complex logic
**Architecture Docs:** ✅ `LYRA-AUDIT-SUITE.md` explains system design
**JSDoc/Docstrings:** ⚠️ Partial; API routes documented, utilities partially

### TypeScript Usage

**Strictness:** `strict: true` in tsconfig.json

**Type Coverage:** [High / Medium / Low]
- Well-typed API responses
- Generic types for database rows
- Some `any` types in legacy code [if applicable]

### Error Handling Patterns

**Pattern 1: API Routes**
```typescript
try {
  // logic
} catch (e) {
  return NextResponse.json(
    { error: apiErrorMessage(e) },
    { status: 500 }
  );
}
```

**Pattern 2: React Components**
```typescript
try {
  const res = await apiFetch(...);
  if (!res.ok) throw new Error(message);
} catch (e) {
  setError(e.message);
}
```

### Git Hygiene

**Commit Message Format:** `[type]: [subject]` (e.g., `fix: handle null project name`)

**Branching Strategy:** Feature branches from `main`; merge via PR with review

**PR History:** Clean, focused PRs; good descriptions of changes

### Technical Debt Flags

**TODOs/FIXMEs Found:**
- `TODO: Implement optimistic concurrency control` — In `/lib/projects.ts:45`
- `FIXME: Handle Redis connection errors` — In `/worker/src/redis.ts:120`

**Deprecated Code:**
- None found

**Obvious Workarounds:**
- [Describe any temporary fixes or hacks]

### Security Posture

**Input Validation:**
- ✅ All API route query params validated with `searchParams.get()`
- ✅ JSON body validated with `request.json().catch()`
- ⚠️ SQL query parameters passed to Postgres pool (parameterized, safe)

**XSS Prevention:**
- ✅ React auto-escapes JSX content
- ✅ User-generated content sanitized before display

**CORS:**
- Frontend: Same origin (Netlify host)
- API: No CORS headers (same-origin only)

**Secrets Management:**
- ✅ All secrets in environment variables (no hardcoded keys)
- ✅ `.env.example` shows required vars without values

---

## SECTION 8: ECOSYSTEM CONNECTIONS

### Shared Code with Other Projects

**Sister Projects in Penny Lane Portfolio:**
- **Codra** — Imports shared component library from embr
- **Relevnt** — Uses same Linear sync mechanism as Lyra
- **FounderOS** — Shares Supabase instance with Lyra for unified user DB

### Shared Dependencies/Infrastructure

**Supabase Instance:** `pg_[ACCOUNT_ID]` — Shared by 5 projects
- Shared user table
- Project-specific RLS policies (isolated)

**Netlify Account:** ThePennyLaneProject — Hosts 8 projects

### Data Connections

**Imports From:**
- None (Lyra sources data from sister projects)

**Exports To:**
- **Linear** — Syncs findings as GitHub issues via Linear API
- **Slack** (optional) — Status updates via webhooks

### Cross-References

**Code Imports:**
- Lyra imports `the_penny_lane_project/*/package.json` for project metadata

**Documentation Links:**
- README mentions Codra for code generation examples

---

## SECTION 9: WHAT'S MISSING (CRITICAL)

### Gaps for Production Readiness

1. **Observability** — Sentry integration missing; no performance monitoring
   - Impact: Can't track errors in production; slow queries go unnoticed
   - Fix: Integrate Sentry + add APM instrumentation

2. **Rate Limiting** — No per-user rate limits on job enqueueing
   - Impact: Single user can flood queue with thousands of jobs
   - Fix: Add rate limit middleware to `/api/orchestration/jobs`

3. **Backup/Recovery** — No documented backup strategy for Supabase data
   - Impact: Data loss on outage unmitigated
   - Fix: Enable Supabase automated backups + document recovery process

4. **Load Testing** — No benchmark tests for concurrent users
   - Impact: Unknown scaling limits; may fail under load
   - Fix: Add k6 or Artillery load tests

5. **Documentation** — No user-facing guide for end users
   - Impact: Users don't know how to interpret findings or manage repairs
   - Fix: Create video walkthrough + written guides

### Gaps for Investor Readiness

1. **Usage Metrics** — No built-in metrics on audits completed, findings resolved, etc.
   - Impact: Can't demonstrate impact or growth
   - Fix: Add metrics dashboard showing key KPIs

2. **SLA Documentation** — No uptime guarantees or SLA
   - Impact: Enterprise customers won't sign contracts
   - Fix: Define and publish SLA; monitor uptime

3. **Security Audit Report** — No third-party security assessment
   - Impact: Enterprise buyers require penetration test
   - Fix: Engage security firm for external audit

4. **Architecture Diagram** — No visual diagram of system architecture
   - Impact: Hard for investors to understand tech stack at a glance
   - Fix: Create Miro/Lucidchart diagram

### Gaps in Codebase

1. **Dead Code** — `/components/LegacyFinding.tsx` unused; can be removed

2. **Incomplete Tests** — `/tests/api.test.ts` has all skipped tests
   - Status: Scaffolded but no actual test logic

3. **Orphaned Files** — `/lib/old-orchestration.ts` marked as deprecated but still imported somewhere

### Top 5 Recommended Next Steps (Prioritized)

1. **[HIGH]** Add Sentry integration for production error tracking
   - Why: Necessary for production stability; can't debug production issues without it
   - Effort: 2 hours

2. **[HIGH]** Implement per-user rate limiting on job enqueue
   - Why: Prevents queue floods; required for fair resource sharing with 12+ projects
   - Effort: 3 hours

3. **[MEDIUM]** Create observability dashboard (Grafana or Datadog)
   - Why: Investors want to see system health metrics in real-time
   - Effort: 1 day

4. **[MEDIUM]** Write user guide + video walkthrough
   - Why: Reduces support burden; improves user satisfaction
   - Effort: 1 day

5. **[MEDIUM]** Set up automated Supabase backups with recovery testing
   - Why: Protects against data loss; builds confidence in reliability
   - Effort: 2 hours

---

## SECTION 10: EXECUTIVE SUMMARY

### Paragraph 1: What This Is & Problem Solved

[ProjectName] is a [type of system] built for [target users] to solve [problem]. It provides [core capability] that allows users to [benefit]. The system is designed to handle [scale] and is currently at [maturity level].

**Example:**
> Lyra is an AI-powered code audit platform built for engineering teams to maintain quality across a portfolio of 10+ applications. It provides automated code analysis via multi-agent LLM system that identifies runtime bugs, data integrity issues, performance bottlenecks, and security vulnerabilities. The system is designed to handle thousands of findings per week and is currently in Beta (feature-complete, performance optimization phase).

### Paragraph 2: Technical Credibility

Describe the technology choices, architecture, and what they signal about the builder's capabilities.

**Example:**
> The technical stack demonstrates modern, production-grade engineering: Next.js 16 for the dashboard (App Router, TypeScript), Node.js/BullMQ for reliable job processing, Supabase for managed Postgres, and multi-provider LLM routing (Claude, GPT-4, Gemini) for cost optimization. The codebase shows disciplined patterns — repository layer for data access, error handling with retry logic, RLS policies for data isolation, and durable event logging for auditability. Git history shows 100+ focused commits with clear PR discipline.

### Paragraph 3: Current State & Next Milestone

Honest assessment of maturity, known limitations, and what's required to reach the next milestone.

**Example:**
> The system is production-ready for internal use but needs three things before external launch: (1) observability (Sentry + metrics dashboard), (2) per-user rate limiting for fair resource sharing, and (3) SLA documentation for enterprise customers. Current limitations: single-region deployment; no multi-tenancy isolation. With these additions, the system can scale from internal portfolio tool to a B2B SaaS offering within 2-3 months.

---

## AUDIT METADATA

```
Project: [PROJECT_NAME]
Date: [YYYY-MM-DD]
Agent: Lyra Intelligence System
Codebase Access: [Full repo / Partial / Read-only]
Confidence Level: [High / Medium / Low]
  - Source: [Verified from code / Inferred from patterns / Documentation]
Sections with Gaps: [List section numbers, e.g. "6 (Monetization), 8 (Ecosystem)"]
Total Files Analyzed: [Count]
```

---

## Template Usage Notes

1. **Fill in all bracketed sections** — Replace `[like this]` with actual values
2. **Be precise** — Quote exact file names, version numbers, and URLs
3. **Flag inferences** — Mark guesses as `[INFERRED]` vs verified facts as `[VERIFIED]`
4. **Use code examples** — Show actual code snippets where helpful
5. **Cross-reference** — Link section numbers when dependencies exist
6. **Honest assessment** — Flag what's missing, rough, or incomplete
7. **Executive summary** — Write for someone unfamiliar with the code

See `/docs/EXPECTATIONS_TEMPLATE.md` for the governance companion document.
