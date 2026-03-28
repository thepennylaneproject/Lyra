# [App Name] — Expectations & Boundaries Document

**Version:** 1.0
**Last Updated:** [YYYY-MM-DD]
**Project:** [App Name]
**Owner:** [Team/Person responsible]

---

## 1. Purpose & Scope

### What This App Does

[1-2 paragraph description of the app's core responsibilities and what problem it solves for users]

**Example:**
> Lyra is an AI-powered code audit system that analyzes codebases from the Penny Lane portfolio (10+ applications) and generates structured findings about runtime bugs, data integrity issues, UX/copy consistency, performance bottlenecks, security vulnerabilities, and deployment/observability gaps.
>
> The system orchestrates six specialized LLM agents, processes findings through a repair engine, syncs findings to Linear for team management, and exposes a dashboard for browsing and updating finding status.

### Out of Scope

[What this app is NOT responsible for — what other systems handle]

**Example:**
- Automatic code fixes (repair engine only suggests patches)
- Deployment automation (dashboard shows status; doesn't trigger deploys)
- User authentication (delegates to Supabase Auth)
- Hosting individual project codebases (imports snapshots only)
- Long-term finding storage beyond the current audit cycle
- Integration with systems outside the Penny Lane portfolio

---

## 2. API / Interface Contracts

### Required Endpoints & Invariants

[Every documented endpoint must exist and behave as specified. If these change, existing consumers must be notified.]

| Endpoint | Method | Purpose | Contract |
|----------|--------|---------|----------|
| `/api/projects` | GET | List all projects | Always returns array of projects; never null |
| `/api/projects/:name` | GET | Get project details | Must include `findings`, `runs`, `jobs` keys |
| `/api/orchestration/runs?project=X` | GET | Get audit runs for project | Limited to 30 recent runs; sorted by created_at DESC |
| `/api/orchestration/queue/clear` | POST | Clear all pending jobs | Requires auth; returns `{ ok: true, count: N }` on success |
| `/api/health` | GET | Health check | Always returns `{ status: "ok" }` with 200; no auth required |

### Input Validation Rules

[Every API endpoint must validate inputs according to these rules. Invalid input → return 400 with error message.]

**General Rules:**
1. All query parameters must be URL-decoded before use
2. All JSON body payloads must conform to a schema (see schema files)
3. Project names must match `^[a-zA-Z0-9_-]+$` (alphanumeric, underscore, hyphen)
4. Finding IDs must be UUIDs or follow project-specific format
5. Status enums must be one of: `queued`, `running`, `completed`, `failed`

**Example Validation (TypeScript):**
```typescript
const projectName = searchParams.get("project")?.trim() ?? "";
if (!projectName || !projectName.match(/^[a-zA-Z0-9_-]+$/)) {
  return NextResponse.json(
    { error: "Invalid project name" },
    { status: 400 }
  );
}
```

### Response Format Standards

**Success Response (2xx):**
```json
{
  "ok": true,
  "data": { ... } or [...]
}
```

**Error Response (4xx/5xx):**
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE" (optional)
}
```

**Pagination (if applicable):**
```json
{
  "ok": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 30,
    "total": 150,
    "has_next": true
  }
}
```

**Standards:**
- All JSON responses include `ok` boolean (true for 2xx, false for 4xx/5xx)
- Error messages are user-friendly (not stack traces)
- Timestamps in ISO 8601 format (`YYYY-MM-DDTHH:MM:SSZ`)
- Nullable fields explicitly marked as `null` (not omitted)
- No extraneous fields; API contract is minimal

---

## 3. Security Boundaries

### Forbidden Patterns

**These must NEVER happen:**

1. **No hardcoded secrets or credentials**
   - ❌ `const API_KEY = "YOUR_API_KEY_HERE"` in code
   - ✅ `const API_KEY = process.env.OPENAI_API_KEY`
   - Consequence: Secrets rotation impossible; keys exposed if repo is leaked

2. **No direct database queries from frontend code**
   - ❌ Frontend sends `SELECT * FROM findings WHERE project = $1`
   - ✅ Frontend calls `/api/projects/:name/findings`, backend queries DB
   - Consequence: Clients can bypass RLS; data leakage

3. **No authentication bypass for internal routes**
   - ❌ `/api/admin/...` endpoints exist but aren't protected by middleware
   - ✅ All protected endpoints verified via central auth middleware
   - Consequence: Unauthorized users access sensitive operations

4. **No SQL injection vulnerabilities**
   - ❌ `SELECT * FROM projects WHERE name = '${projectName}'`
   - ✅ Use parameterized queries: `client.query("SELECT * FROM projects WHERE name = $1", [projectName])`
   - Consequence: Database compromise; data theft

5. **No XSS vulnerabilities in user-generated content**
   - ❌ Display user comment without escaping: `<div>{userComment}</div>` when comment may contain `<script>`
   - ✅ React auto-escapes JSX; sanitize HTML if necessary with DOMPurify
   - Consequence: Client-side code execution; session hijacking

6. **No secrets in error messages**
   - ❌ Error response: `{ error: "Connection failed: host=secret.db, port=5432" }`
   - ✅ Error response: `{ error: "Database connection failed. Try again." }`
   - Consequence: Attacker learns internal topology

7. **No logging sensitive data**
   - ❌ `console.log("User API key:", apiKey)`
   - ✅ `console.log("User authentication succeeded")` (no key)
   - Consequence: Logs expose secrets to anyone with log access

### Required Security Features

**Authentication:**
- All non-public endpoints require authentication (Bearer token or session cookie)
- Tokens expire after [X] hours; refresh tokens valid for [Y] days
- Failed login attempts logged; [N] failures = account lockout for [Z] minutes

**Authorization:**
- Users can only access projects they have permission for (via RLS or app logic)
- Admin operations (queue clear, config update) require explicit role

**Rate Limiting:**
- API: 100 requests per minute per IP (burst up to 150)
- Job Enqueue: 10 jobs per hour per project
- Failed auth attempts: 5 attempts per 15 minutes per IP

**Data Protection:**
- All PII encrypted at rest (if applicable)
- Database connections use SSL/TLS
- Backups encrypted with key stored separately
- No database backups copied to unencrypted cloud storage

**Monitoring:**
- All auth failures logged to security log (separate from app logs)
- Unusual patterns flagged (e.g., bulk finding status changes, unusual project imports)
- Admin access logged with full context (who, what, when, from where)

---

## 4. Code Standards

### Language/Framework Rules

**TypeScript (Frontend & Backend):**
- Strict mode enabled: `"strict": true` in `tsconfig.json`
- No `any` types (use `unknown` + type guard if necessary)
- All functions have explicit return types
- All props are typed (no `React.FC` without generics)

**React Component Rules:**
- Function components only (no class components)
- Custom hooks start with `use` prefix (`useProjects()`)
- Props interface defined above component: `interface ComponentProps { ... }`
- No component instantiation logic in props (compute before passing)

**Naming Conventions:**
- Components: PascalCase (`ProjectView.tsx`)
- Utilities: camelCase (`formatFinding.ts`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- Database tables: snake_case (`lyra_audit_jobs`)
- Database columns: snake_case (`created_at`)
- Type interfaces: PascalCase (`LyraAuditRunRow`)

### File Structure Rules

**Directory Organization:**
```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   └── api/                # API routes (no business logic here)
│       ├── projects/
│       └── orchestration/
├── components/             # React UI components
│   ├── Shell.tsx          # Top-level shell
│   ├── ProjectView.tsx    # Feature component
│   └── ...
├── lib/                    # Utilities & business logic
│   ├── orchestration-jobs.ts  # DB queries
│   ├── api-fetch.ts           # HTTP client
│   └── types.ts               # Shared types
└── types.ts               # Global types (if needed)
```

**Rules:**
- Each API route is a single file: `api/[resource]/route.ts`
- Components in `/components` are UI-only; no API calls
- All API calls from components go through `/lib/api-fetch.ts`
- All database queries in `/lib` (never directly in components or routes)
- Tests colocated: `ComponentName.test.tsx` next to `ComponentName.tsx`

### Testing Requirements

**File Naming:**
- Test files: `*.test.ts` or `*.spec.ts`
- Location: Same directory as source file

**Structure:**
```typescript
describe("ProjectView", () => {
  it("renders project name", () => {
    // Test code
  });

  it("shows loading state while fetching", () => {
    // Test code
  });
});
```

**Coverage:**
- Minimum 50% line coverage for new code
- 100% coverage for critical paths (auth, API routes, data validation)
- No tests required for simple pass-through components (e.g., `<Card>` wrapper)

---

## 5. Testing Requirements

**Test Types Required:**
- Unit tests — Isolated functions and pure components
- Integration tests — API routes with mocked database
- E2E tests — Full user workflows (optional; not required for all features)

**Testing Tools:**
- Jest (test runner)
- React Testing Library (component testing)
- Supertest (API testing)

**Before Merge:**
- All tests must pass: `npm run test`
- No console errors/warnings in test output
- Test coverage reports generated (optional but recommended)

**Test Execution:**
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

---

## 6. Performance Boundaries

### Response Time SLAs

| Endpoint | Max Time | Target Time |
|----------|----------|------------|
| GET /api/projects | 2000ms | 500ms |
| GET /api/projects/:name | 3000ms | 1000ms |
| POST /api/orchestration/jobs | 1000ms | 500ms |
| GET /api/health | 500ms | 100ms |

### Prohibited Patterns

1. **N+1 Queries**
   - ❌ Loop through projects, query each project's findings individually
   - ✅ Batch load: `SELECT * FROM findings WHERE project IN (...)`

2. **Blocking Operations**
   - ❌ Synchronous file system reads in API route
   - ✅ Async I/O with `await`

3. **Unoptimized Loops**
   - ❌ Calling expensive function in loop: `array.map(() => expensiveCalc())`
   - ✅ Memoize or compute outside loop

4. **Missing Pagination**
   - ❌ Loading all 100k findings at once
   - ✅ Limit to 30 per request; paginate

5. **Inefficient DOM Operations**
   - ❌ Updating DOM in a loop (causes reflow/repaint per iteration)
   - ✅ Batch updates or use virtual scrolling

### Database Performance

- All frequently-run queries must have indices
- Query response time < 200ms for 99th percentile
- Connection pool size tuned (default: 10; adjust for concurrency)

### Client-Side Performance

- Total bundle size < 500KB (main app code)
- First Contentful Paint < 2s
- Largest Contentful Paint < 3s
- Interaction to Next Paint < 100ms

---

## 7. Dependencies & Integrations

### Approved Dependencies

**Frontend:**
- ✅ React 19
- ✅ Next.js 16+
- ✅ TypeScript 5+
- ✅ Tailwind CSS 4
- ✅ SWR (data fetching)
- ✅ date-fns (date formatting)

**Backend:**
- ✅ Node.js 20+
- ✅ PostgreSQL 14+
- ✅ BullMQ (job queue)
- ✅ @openai/sdk, @anthropic-ai/sdk (LLM clients)

**Testing:**
- ✅ Jest 29+
- ✅ React Testing Library
- ✅ Supertest (API testing)

### Forbidden Dependencies

- ❌ jQuery (use native DOM or React)
- ❌ MobX (use Context/Zustand instead)
- ❌ Lodash (use native JS or date-fns)
- ❌ Older versions of Next.js < 14 (outdated, security issues)
- ❌ Custom auth libraries (use Supabase Auth)

### Before Adding New Dependencies

1. Check if functionality exists in approved libraries
2. Verify the package is actively maintained (recent commits)
3. Check for known vulnerabilities: `npm audit`
4. Ensure TypeScript types available (`@types/...` or built-in)
5. Get approval from team lead before merging

---

## 8. Compliance Checklist

Use this checklist to verify that code meets expectations before merge:

- [ ] **All API endpoints documented** (method, path, purpose, auth requirement)
- [ ] **No hardcoded secrets** (API keys, connection strings in code)
- [ ] **All inputs validated** (query params, body payloads, file uploads)
- [ ] **No direct DB queries from frontend** (all via API routes)
- [ ] **Error handling present** on all async operations (try/catch, .catch())
- [ ] **Logging implemented** per org standards (structured logs, no sensitive data)
- [ ] **Tests written** for new features (unit + integration)
- [ ] **Tests passing** (`npm run test`)
- [ ] **TypeScript strict mode** (`strict: true` in tsconfig)
- [ ] **No unused imports or dead code**
- [ ] **Database migrations created** (if schema changed)
- [ ] **Environment variables documented** (in `.env.example`)
- [ ] **Security review passed** (if touching auth, payments, PII)
- [ ] **Performance benchmarked** (if new query, slow endpoint, large computation)
- [ ] **PR description explains changes** (what, why, testing)

**Before Deployment:**
- [ ] All tests pass in CI
- [ ] No console errors in production build
- [ ] Database backups taken (if production)
- [ ] Deployment plan documented (rollback procedure)
- [ ] Monitoring/alerts in place (Sentry, logs, metrics)

---

## Usage & Maintenance

### How to Use This Document

1. **For Code Reviews:** Check "Compliance Checklist" section before approving PRs
2. **For Onboarding:** Have new developers read Sections 1-5
3. **For Planning:** Reference "Forbidden Patterns" and "Performance Boundaries" when designing features
4. **For Monitoring:** Use "Compliance Checklist" for continuous verification

### Updating This Document

- Update when new standards are adopted (discuss as team first)
- Version bump on changes (major.minor format)
- PR required for changes (not local decisions)
- Announce changes to team (async notification + sync discussion)

### Questions or Conflicts?

If code doesn't fit these boundaries, raise it in a PR comment or team discussion. These are living guidelines, not dogma. If something is genuinely blocking progress, it can be revisited and updated with team consensus.

---

## Template Usage Notes

1. **Customize Sections 1-3** — These are project-specific
2. **Keep Sections 4-8** mostly as-is — These are standards that apply to all apps in the portfolio
3. **Fill in specific values** — Replace `[X]` placeholders with actual numbers/names
4. **Link to actual files** — Reference real file paths, not generic descriptions
5. **Be specific about forbidden things** — Show examples of ❌ and ✅
6. **Make it actionable** — Someone should be able to use this to review code without asking questions

This document is meant to be shared with the team and reference repeatedly. Print it, post it, bookmark it.
