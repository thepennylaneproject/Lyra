# Codra — Expectations Document

> Source: `the_penny_lane_project/Codra/codra_report.md`
> Last reviewed: 2026-03-08

---

## 1. Language and Runtime Constraints

### 1.1 TypeScript strict mode
All TypeScript code must compile with strict mode enabled. If `"strict": true` is removed from any `tsconfig.json`, file `critical`.

### 1.2 React 18+
The frontend must use React 18 or higher. Downgrading React requires explicit approval. File `critical` if React is downgraded below 18.

### 1.3 Vite build
The frontend build system is Vite. Do not replace or wrap Vite with another bundler (Webpack, Parcel, etc.) without explicit approval. File `warning` for any build tooling changes.

### 1.4 Node 20 for Netlify Functions
All Netlify Functions must target Node 20 as the runtime. If a function's configuration specifies a different Node version, file `warning`.

---

## 2. Backend Architecture

### 2.1 Serverless backend in `netlify/functions/`
All backend logic must live in `netlify/functions/`. There must be no standalone Express/Fastify/Node server running alongside the Netlify deployment. File `critical` if a server-side runtime is introduced outside of Netlify Functions.

### 2.2 AI provider calls through `AIRouter`
All calls to AI provider APIs (OpenAI, Anthropic, etc.) must go through the `AIRouter` abstraction. Calls to provider APIs made directly from frontend components are prohibited. File `critical` for any direct AI provider call found in frontend code.

### 2.3 Stripe billing in Netlify Functions only
Stripe API calls (charge creation, subscription management, webhook handling) must only be made from Netlify Functions. Stripe operations initiated client-side are prohibited. File `critical` for any Stripe call found in frontend code.

### 2.4 JWT verification before authenticated requests
All Netlify Functions that handle authenticated user requests must verify the Supabase JWT before processing. Any function that processes user data without verifying the JWT must be filed `critical`.

---

## 3. Database Constraints

### 3.1 Supabase (PostgreSQL) as primary database
The primary database is Supabase/PostgreSQL. Introduction of a secondary database engine requires explicit approval. File `warning` for any new database technology introduced without approval.

### 3.2 RLS must be enabled on all tables
Row-Level Security (RLS) must be enabled on all Supabase tables. Any new table created without RLS policies enabled must be filed `critical`.

---

## 4. Security Constraints

### 4.1 API credentials stored encrypted
API credentials and integration secrets must be stored encrypted. Credentials stored in plaintext in the database or emitted in logs must be filed `critical`.

### 4.2 Security headers must not be weakened
Netlify security headers defined in `netlify.toml` (Content-Security-Policy, X-Frame-Options, HSTS, etc.) must not be removed or weakened. File `critical` for any header removal or policy relaxation.

### 4.3 No hardcoded secrets
No API keys, tokens, or passwords may be hardcoded in source files. Use environment variables. File `critical` for any hardcoded secret.

---

## 5. Analytics

### 5.1 `posthog-js` is the approved analytics provider
`posthog-js` is the only approved analytics provider. Addition of other analytics SDKs (Mixpanel, Amplitude, Segment, GA4, etc.) requires explicit approval. File `warning` for any unapproved analytics dependency.

---

## 6. Code Quality

### 6.1 Custom ESLint rules must not be disabled
Rules from the custom `eslint-plugin-codra` ESLint plugin must not be disabled via `// eslint-disable` comments or config overrides without documented justification. File `warning` for any suppressed `eslint-plugin-codra` rule.

### 6.2 Storybook coverage for new UI components
New UI components must have a Storybook story. File `suggestion` for any new UI component added without a corresponding `.stories.tsx` file.

---

## 7. Out-of-Scope Constraints

- Do not switch from Netlify to Vercel or another hosting platform without explicit approval
- Do not replace Supabase with another auth/database provider without explicit approval
