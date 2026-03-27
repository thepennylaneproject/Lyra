# Codra — Investor-Grade Codebase Intelligence Audit

> All findings sourced directly from the codebase. Inferences are explicitly flagged.

---

## SECTION 1: PROJECT IDENTITY

### 1. Project Name

`codra` — as declared in `package.json` `"name": "codra"`.

### 2. Repository URL

`https://github.com/thepennylaneproject/codra.git` (verified via `git remote -v`).

### 3. Description

**Exact quote from `package.json`:** `"AI workflow tool with multi-provider integration"`

**Cleaner version:** Codra is a browser-based AI workspace that lets knowledge workers run structured content and campaign workflows across multiple AI providers (OpenAI, Gemini, DeepSeek, Mistral, Cohere, and more), manage project assets, and receive AI-assisted next-step guidance through an embedded assistant called Lyra.

### 4. Project Status

**`Alpha`** — Core features (project management, AI routing, Stripe billing, asset pipeline, workspace UI) are functionally implemented end-to-end. Significant rough edges exist: a key Lyra backend API endpoint is stubbed with a TODO comment, some legacy schema fallback paths remain in the project creation function, and the admin metrics route has minimal authorization enforcement. Not yet confirmed to be handling real production users at scale; no user count metrics or live monitoring signals were found.

### 5. First & Most Recent Commit Dates

|                    | Date           |
| ------------------ | -------------- |
| First commit       | **2025-12-14** |
| Most recent commit | **2026-03-06** |

Repository age at time of audit: ~12 weeks.

### 6. Total Commits

**100 commits** (verified via `git log --oneline | wc -l`).

### 7. Deployment Status

**Deployed to Netlify.** Evidence:

- `netlify.toml` present and fully configured with build command, publish directory (`dist`), function directory (`netlify/functions`), SPA catch-all redirect, and security headers.
- `.netlify/` directory present (local Netlify CLI state).
- Functions are configured with per-function timeouts and Node bundler set to `esbuild`.
- Production, deploy-preview, and branch-deploy contexts defined.
- Scheduled function (`analyze-new-assets`) configured with 26-second max timeout.

### 8. Live URL(s)

⚠️ **Not directly discoverable in the codebase.** `process.env.URL` is referenced in CORS headers (Netlify auto-populates this with the deployment URL), but no hardcoded production URL was found in config files. _[Gap — inferred: deployed on Netlify, URL unknown from codebase alone.]_

---

## SECTION 2: TECHNICAL ARCHITECTURE

### 1. Primary Language & Frameworks

| Layer           | Technology                             | Version                         |
| --------------- | -------------------------------------- | ------------------------------- |
| Language        | TypeScript                             | `^5.9.3`                        |
| UI Framework    | React                                  | `^18.3.1`                       |
| Build Tool      | Vite                                   | `^5.4.0`                        |
| Styling         | Tailwind CSS                           | `^3.4.10`                       |
| Backend         | Netlify Functions (Node 20)            | `@netlify/functions ^2.8.0`     |
| Database        | Supabase (PostgreSQL + Auth + Storage) | `@supabase/supabase-js ^2.86.2` |
| Package version | `0.2.0`                                | —                               |

### 2. Full Dependency List

**Core Framework**
| Package | Version | Purpose |
|---|---|---|
| `react` / `react-dom` | `^18.3.1` | UI runtime |
| `react-router-dom` | `^6.30.2` | Client-side routing |
| `vite` / `@vitejs/plugin-react` | `^5.4.0` / `^4.3.1` | Dev server & bundler |
| `typescript` | `^5.9.3` | Static typing |

**UI / Styling**
| Package | Version | Purpose |
|---|---|---|
| `tailwindcss` | `^3.4.10` | Utility CSS |
| `tailwind-merge` | `^3.4.0` | Class deduplication |
| `clsx` | `^2.1.1` | Conditional classnames |
| `framer-motion` | `^12.23.26` | Animation |
| `lucide-react` | `^0.556.0` | Icon system |
| `recharts` | `^3.5.1` | Data visualization |
| `canvas-confetti` | `^1.9.4` | Celebration UX |
| `@radix-ui/react-tooltip` | `^1.2.8` | Accessible tooltips |
| `@monaco-editor/react` / `monaco-editor` | `^4.7.0` / `^0.55.1` | In-browser code editor |
| `shepherd.js` | `^14.5.1` | Product tours |

**State Management**
| Package | Version | Purpose |
|---|---|---|
| `zustand` | `^5.0.9` | Global client state |
| `@tanstack/react-query` | `^5.90.12` | Server state / caching |
| `immer` | `^11.0.1` | Immutable state mutations |

**AI / ML Integrations**
| Package | Version | Purpose |
|---|---|---|
| `@xyflow/react` | `^12.10.0` | Visual workflow canvas (node graph) |
| `react-speech-recognition` | `^4.0.1` | Voice input |
| `jsonpath-plus` | `^10.3.0` | JSON data extraction in workflows |
| `ajv` / `ajv-formats` | `^8.18.0` / `^3.0.1` | JSON Schema validation for AI outputs |

**API / Data Layer**
| Package | Version | Purpose |
|---|---|---|
| `@supabase/supabase-js` | `^2.86.2` | Database, auth, storage |
| `zod` | `^4.1.13` | Runtime validation |
| `lodash.isequal` | `^4.5.0` | Deep equality checks |
| `date-fns` | `^4.1.0` | Date utilities |
| `uuid` | `^13.0.0` | ID generation |
| `p-limit` | `^7.2.0` | Concurrency control |

**Auth / Security**
| Package | Version | Purpose |
|---|---|---|
| `crypto-js` | `^4.2.0` | Client-side AES encryption for credentials |
| `crypto` | `^1.0.1` | Node crypto shim |

**Payments**
| Package | Version | Purpose |
|---|---|---|
| `stripe` | `^20.0.0` | Stripe SDK (server-side, in Netlify functions) |

**Assets / Media**
| Package | Version | Purpose |
|---|---|---|
| `cloudinary` | `^2.8.0` | Cloud image storage & transformation |
| `sharp` | `^0.34.5` | Server-side image processing |
| `html2canvas` | `^1.4.1` | Canvas screenshot export |
| `jspdf` | `^3.0.4` | PDF export |

**External Data / Search**
| Package | Version | Purpose |
|---|---|---|
| `octokit` | `^5.0.5` | GitHub API (code context) |
| `ts-jobspy` | `^2.0.3` | Job listing data (inferred: for content context) |
| `posthog-js` | `^1.309.1` | Product analytics |

**Build / Dev Tooling**
| Package | Version | Purpose |
|---|---|---|
| `vitest` / `@vitest/coverage-v8` | `^4.0.16` | Unit testing |
| `playwright` | `^1.57.0` | E2E testing |
| `storybook` | `^10.1.11` | Component development |
| `eslint` + custom plugin | `^8.57.0` | Linting (including custom `eslint-plugin-codra`) |
| `stylelint` | `^16.7.0` | CSS linting |
| `tsx` | `^4.19.2` | TS script runner |
| `glob` | `^11.0.0` | File globbing for scripts |

### 3. Project Structure (2-Level Directory Tree)

```
codra/
├── src/                    # All client-side application code (580 TS/TSX/CSS files)
│   ├── App.tsx             # Root router, provider tree
│   ├── lib/                # Core business logic, AI providers, DB clients, utilities
│   ├── new/                # Active "v2" pipeline (components + routes)
│   │   ├── components/     # 25+ components + 13 subdirectories (workspace, lyra, desks, etc.)
│   │   └── routes/         # Page-level route components
│   ├── components/         # Legacy/shared components (auth forms, etc.)
│   ├── domain/             # Domain objects, audit templates, business rules
│   ├── features/           # Feature modules (settings, etc.)
│   ├── hooks/              # Shared React hooks
│   ├── pages/              # Top-level page shells (admin, auth)
│   ├── pipeline/           # Asset ingestion pipeline (client side)
│   ├── styles/             # Design tokens CSS + component-level CSS files
│   ├── types/              # Shared TypeScript type definitions
│   └── assets/             # Static assets
├── netlify/
│   ├── functions/          # 33 serverless API functions
│   ├── edge-functions/     # (present, 1 child — not explored)
│   └── plugins/            # Custom Netlify build plugins (metrics-audit)
├── supabase/
│   └── migrations/         # 30 SQL migration files
├── scripts/                # 30 build/pipeline/audit scripts (run via tsx)
├── docs/                   # 44 documentation files
├── audits/                 # 49 audit report files (living audit history)
├── reports/                # 39 generated reports
├── public/                 # Static public files
├── dist/                   # Built output
├── eslint-plugin-codra/    # Custom ESLint plugin with Codra-specific rules
├── .storybook/             # Storybook config
├── .github/                # GitHub workflows (3 children)
├── tailwind.config.js      # Tailwind config (uses generated tokens)
├── vite.config.ts          # Vite config
├── netlify.toml            # Netlify deployment config
└── package.json            # v0.2.0
```

### 4. Architecture Pattern

**JAMstack SPA + Serverless Functions, single-tenant per-user data model.**

Data flow:

1. User authenticates via Supabase Auth (email/password or OAuth). JWT stored in browser.
2. React SPA (served from Netlify CDN) renders the workspace UI.
3. On user action (e.g., run AI task), the client calls `/api/ai/complete` → Netlify Function.
4. The Netlify Function verifies the JWT against Supabase, loads platform API keys from env vars, routes the request through `AIRouter` to the best available AI provider, logs telemetry to Supabase, and returns the result.
5. Client renders the result; state is managed via Zustand + React Query.
6. Assets are uploaded via presigned URLs (`assets_upload_url.ts`) to Cloudinary, metadata written to Supabase.
7. Stripe webhooks land at `billing-webhook.ts`, idempotently update the `subscriptions` table, which gates feature access at both API and DB trigger level.

### 5. Database / Storage Layer

**Primary database:** Supabase (PostgreSQL). **Storage:** Supabase Storage + Cloudinary.

| Table                    | Key Columns                                                                                                                       | Purpose                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `profiles`               | `id`, `email`, `full_name`, `avatar_url`, `company`, `plan`, `preferences (jsonb)`, `onboarding_completed`                        | User profile extending `auth.users`     |
| `api_credentials`        | `user_id`, `provider (enum)`, `environment (enum)`, `encrypted_key`, `key_hint`, `status`, `monthly_limit`, `current_month_usage` | Per-user encrypted API keys             |
| `usage_logs`             | `user_id`, `provider`, `model`, `request_type`, `prompt_tokens`, `completion_tokens`, `cost_cents`, `latency_ms`, `success`       | Immutable AI usage audit trail          |
| `usage_daily_aggregates` | `user_id`, `date`, `provider`, `total_requests`, `total_tokens`, `total_cost_cents`                                               | Pre-computed dashboard summaries        |
| `projects`               | `user_id`, `name`, `slug`, `status (enum)`, `settings (jsonb)`, `local_path`, `total_cost_cents`                                  | User workspaces                         |
| `project_assets`         | `project_id`, `type (enum)`, `storage_path`, `generated`, `generation_params (jsonb)`, `provider`, `version`                      | Files & generated content               |
| `assets`                 | `workspace_id`, `user_id`, `type`, `storage_path`, `public_url`, `mime_type`, `size_bytes`, `hash_sha256`                         | Asset library with dedup                |
| `asset_tags`             | `asset_id`, `tag`                                                                                                                 | Many-to-many asset tagging              |
| `asset_versions`         | `asset_id`, `version`, `storage_path`, `public_url`                                                                               | Version history                         |
| `subscriptions`          | `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `status`, `plan_id`, `current_period_end`, `cancel_at_period_end`      | Stripe subscription state               |
| `tier_limits`            | `tier`, `project_limit`, `max_tokens_per_request`                                                                                 | Authoritative plan limits (DB-enforced) |
| `webhook_events`         | `id (event_id)`, `event_type`, `payload`, `needs_review`                                                                          | Stripe webhook idempotency + audit      |
| `specifications`         | _(renamed from `spreads` in migration `20260120...`)_                                                                             | AI-generated project specifications     |
| `briefing_state`         | _(from `20251212_briefing_state.sql`)_                                                                                            | Persisted briefing wizard state         |
| `admin_settings`         | _(from `20251214_admin_settings.sql`)_                                                                                            | Platform-wide config                    |
| `model_registry`         | _(from `20260108_model_registry.sql`)_                                                                                            | Registered AI models with pricing       |
| `image_policy`           | _(from `20260109_image_policy.sql`)_                                                                                              | Image generation quality/style rules    |
| `behavior_tracking`      | _(from `20260102_behavior_tracking.sql`)_                                                                                         | User behavior events                    |
| `feature_usage`          | _(from `20260111_feature_usage_tracking.sql`)_                                                                                    | Per-feature monthly usage counters      |

RLS is enabled on all tables with policies scoped to `auth.uid()`.

### 6. API Layer (Netlify Functions)

All functions served under `/api/*` via `netlify.toml` redirects.

| Function                  | Method    | Path                           | Purpose                                    | Auth Required           |
| ------------------------- | --------- | ------------------------------ | ------------------------------------------ | ----------------------- |
| `ai-complete`             | POST      | `/api/ai/complete`             | Multi-provider AI completion               | Yes                     |
| `ai-stream`               | POST      | `/api/ai/stream`               | Streaming AI completion                    | Yes                     |
| `auth-callback`           | GET       | `/api/auth-callback`           | Supabase OAuth callback handler            | No                      |
| `github-auth-start`       | GET       | `/api/github-auth-start`       | Initiate GitHub OAuth                      | No                      |
| `github-auth-callback`    | GET       | `/api/github-auth-callback`    | GitHub OAuth callback                      | No                      |
| `user-profile`            | GET/PATCH | `/api/user-profile`            | Read/update user profile                   | Yes                     |
| `user-tier`               | GET       | `/api/user-tier`               | Return tier, limits, usage                 | Yes                     |
| `projects-create`         | POST      | `/api/projects-create`         | Create project with tier enforcement       | Yes                     |
| `projects-list`           | GET       | `/api/projects-list`           | List user projects                         | Yes                     |
| `credentials-create`      | POST      | `/api/credentials-create`      | Store encrypted API credential             | Yes                     |
| `credentials-rotate`      | POST      | `/api/credentials-rotate`      | Rotate/update credential                   | Yes                     |
| `credentials-test`        | POST      | `/api/credentials-test`        | Validate credential against provider       | Yes                     |
| `billing-checkout`        | POST      | `/api/billing-checkout`        | Create Stripe Checkout session             | Yes                     |
| `billing-portal`          | POST      | `/api/billing-portal`          | Create Stripe Customer Portal session      | Yes                     |
| `billing-webhook`         | POST      | `/api/billing-webhook`         | Handle Stripe webhook events               | No (signature-verified) |
| `assets_upload_url`       | POST      | `/api/assets_upload_url`       | Generate presigned upload URL (Cloudinary) | Yes                     |
| `assets_list`             | GET       | `/api/assets_list`             | List workspace assets                      | Yes                     |
| `assets_finalize`         | POST      | `/api/assets_finalize`         | Confirm upload, write metadata             | Yes                     |
| `assets_delete`           | DELETE    | `/api/assets_delete`           | Soft-delete asset                          | Yes                     |
| `asset_manifest_get`      | GET       | `/api/asset_manifest_get`      | Retrieve asset manifest                    | Yes                     |
| `asset_manifest_save`     | POST      | `/api/asset_manifest_save`     | Save/update asset manifest                 | Yes                     |
| `asset_manifest_validate` | POST      | `/api/asset_manifest_validate` | Validate manifest schema                   | Yes                     |
| `image-generate`          | POST      | `/api/image-generate`          | AI image generation                        | Yes                     |
| `image-list`              | GET       | `/api/image-list`              | List generated images                      | Yes                     |
| `image-status`            | GET       | `/api/image-status`            | Poll image generation status               | Yes                     |
| `image-webhook`           | POST      | `/api/image-webhook`           | Receive async image generation callbacks   | No                      |
| `image_convert`           | POST      | `/api/image_convert`           | Convert/transform image via Cloudinary     | Yes                     |
| `analyze-new-assets`      | POST      | `/api/analyze-new-assets`      | Scheduled: AI-analyze new assets           | No (scheduled)          |
| `retrieval_search`        | POST      | `/api/retrieval_search`        | Semantic search over project context       | Yes                     |
| `specification-save`      | POST      | `/api/specification-save`      | Persist AI-generated specification         | Yes                     |
| `task-cancel`             | POST      | `/api/task-cancel`             | Cancel in-flight AI task                   | Yes                     |
| `providers`               | GET       | `/api/providers`               | List available AI providers                | Yes                     |

### 7. External Service Integrations

| Service           | Purpose                                                   | Key in Code                                                                |
| ----------------- | --------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Supabase**      | PostgreSQL DB, Auth (email + OAuth), Storage              | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Stripe**        | Subscription billing, checkout, customer portal, webhooks | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`                               |
| **Cloudinary**    | Asset storage, transformation, CDN delivery               | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`     |
| **PostHog**       | Product analytics / event tracking                        | `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`                                    |
| **OpenAI**        | AI completions (provider option)                          | `OPENAI_API_KEY`                                                           |
| **AimlAPI**       | Primary AI aggregator (default provider)                  | `AIMLAPI_API_KEY`                                                          |
| **Google Gemini** | AI completions (provider option)                          | `GEMINI_API_KEY`                                                           |
| **DeepSeek**      | AI completions (provider option)                          | `DEEPSEEK_API_KEY`                                                         |
| **Anthropic**     | AI completions (provider option)                          | `ANTHROPIC_API_KEY`                                                        |
| **Mistral**       | AI completions (provider option)                          | `MISTRAL_API_KEY`                                                          |
| **Cohere**        | AI completions (provider option)                          | `COHERE_API_KEY_PROD`                                                      |
| **HuggingFace**   | AI completions (provider option)                          | `HUGGINGFACE_API_KEY`                                                      |
| **DeepAI**        | Image generation                                          | `DEEPAI_API_KEY`                                                           |
| **GitHub**        | OAuth login + code context retrieval                      | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`                                 |
| **Tavily**        | Web search / retrieval augmentation                       | `TAVILY_API_KEY`                                                           |
| **Brave Search**  | Alternate search for retrieval                            | `BRAVE_SEARCH_API_KEY`                                                     |

### 8. AI / ML Components

**Provider Architecture:** A platform-key model — all users share Codra-owned API keys. Usage is tracked per-user for billing. Provider selection is handled by `AIRouter` with a primary provider + fallback chain (`aimlapi → openai → deepseek → gemini`).

**Providers implemented** (each in `src/lib/ai/providers/`):
`aimlapi`, `deepseek`, `gemini`, `openai`, `mistral`, `cohere`, `huggingface`, `aimlapi-image`, `deepai-image`

**AI subsystems:**

- `router.ts` — `AIRouter` class, registers providers, routes completions with fallback
- `model-router.ts` — Smart model-to-provider routing
- `model-categorizer.ts` — Categorizes models by capability (reasoning, vision, etc.)
- `registry/` — `model_registry` DB table backed model catalog with pricing
- `inline-completion-provider.ts` — Monaco editor-level inline AI suggestions
- `agent-catalog.ts` / `agent-presets.ts` — Named agent configurations (persona + instruction sets)
- `benchmark-executor.ts` — Multi-model benchmarking and evaluation runner
- `context.ts` — Context window management
- `cost.ts` — Per-request cost estimation
- `retrieval_search.ts` (function) — RAG: semantic search using Brave/Tavily + embedding
- `image-generate.ts` (function) — Multi-provider image generation with webhook support

**Lyra AI Assistant:** Embedded sidebar assistant. Client-side hook (`useLyraSuggestion`) currently uses local context data with a stubbed backend call (TODO comment for `/api/lyra/suggest`). Produces suggestion/clarification/idle states.

**Coherence Scan:** A dedicated feature (`CoherenceScanPage`, `CoherenceLoopView.tsx`) that runs consistency analysis across a project's content. Gated at 0 scans/month on free tier, 5 on pro.

### 9. Authentication & Authorization

**Method:** Supabase Auth (JWT-based).

- **Email/password** signup and login
- **GitHub OAuth** (dedicated start/callback functions)
- **Password reset** flow (forgot-password → email link → reset-password page)
- JWT verified server-side in every Netlify function via `supabase.auth.getUser(token)`

**Authorization model:**
| Level | Mechanism |
|---|---|
| Route access | `ProtectedRoute` / `GuestRoute` React components |
| API access | JWT Bearer token verified in each function |
| Data access | Supabase RLS policies (all tables) |
| Feature access | `user-tier` function + DB trigger (`check_project_limit`) |
| Admin access | `/admin/metrics` route — `process.env.ADMIN_EMAILS` referenced but no middleware guard visible at route level ⚠️ |

**Permission tiers:** `free`, `pro`, `team` (no explicit role-based admin system beyond env var whitelist).

### 10. Environment Variables

**Client-side (Vite `import.meta.env.*`)**
| Var | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key (RLS-enforced) |
| `VITE_POSTHOG_KEY` | PostHog analytics key |
| `VITE_POSTHOG_HOST` | PostHog self-hosted URL (if applicable) |
| `VITE_ANALYTICS_DEBUG` | Enable analytics debug logging |

**Server-side (Netlify Functions `process.env.*`)**
| Var | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL (server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS) |
| `SUPABASE_SERVICE_KEY` | Alias for above |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature secret |
| `OPENAI_API_KEY` | OpenAI platform key |
| `AIMLAPI_API_KEY` | AimlAPI platform key |
| `GEMINI_API_KEY` | Google Gemini platform key |
| `DEEPSEEK_API_KEY` | DeepSeek platform key |
| `ANTHROPIC_API_KEY` | Anthropic platform key |
| `MISTRAL_API_KEY` | Mistral platform key |
| `COHERE_API_KEY_PROD` | Cohere platform key |
| `HUGGINGFACE_API_KEY` | HuggingFace platform key |
| `DEEPAI_API_KEY` | DeepAI platform key |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud ID |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `CLOUDINARY_URL` | Alternate Cloudinary connection URL |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret |
| `TAVILY_API_KEY` | Tavily search API key |
| `BRAVE_SEARCH_API_KEY` | Brave search API key |
| `CODRA_APP_SECRET` / `ENCRYPTION_APP_SECRET` | Credential encryption key |
| `ADMIN_EMAILS` | CSV of admin email addresses |
| `URL` | Netlify deploy URL (auto-populated) |
| `NODE_ENV` | Runtime environment |

---

## SECTION 3: FEATURE INVENTORY

| Feature                       | Description                                                                                                   | Completeness | Key Files                                                                                                                               | Dependencies                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **Authentication**            | Email/password + GitHub OAuth signup/login, password reset, JWT session                                       | `Polished`   | `src/components/auth/`, `netlify/functions/auth-callback.ts`, `src/lib/auth/AuthProvider.tsx`                                           | Supabase Auth                    |
| **Project Management**        | Create, list, archive projects with tier-enforced limits (1/10/unlimited)                                     | `Functional` | `netlify/functions/projects-create.ts`, `netlify/functions/projects-list.ts`, `src/new/routes/ProjectsPage.tsx`                         | Subscriptions, profiles          |
| **AI Workspace**              | Visual workspace with desks (Write, Design, Code, Analyze), node canvas, Monaco editor, inline AI completions | `Functional` | `src/new/routes/WorkspacePage.tsx`, `src/new/components/workspace/`, `src/new/components/desks/`                                        | AI Router, projects              |
| **Multi-Provider AI Router**  | Routes AI completions to 7+ providers with fallback chains; platform-key model                                | `Polished`   | `src/lib/ai/router.ts`, `src/lib/ai/providers/`, `netlify/functions/ai-complete.ts`                                                     | All AI provider env vars         |
| **AI Streaming**              | Server-sent events streaming for long-form completions                                                        | `Functional` | `netlify/functions/ai-stream.ts`                                                                                                        | AI Router                        |
| **Lyra AI Assistant**         | Contextual sidebar assistant with suggestions, clarifications, and next-step guidance                         | `Partial`    | `src/new/components/lyra/`, `src/new/components/lyra/hooks/useLyraSuggestion.ts`                                                        | Project state, assistant context |
| **Onboarding Flow**           | Multi-step onboarding wizard for new users/projects                                                           | `Functional` | `src/new/routes/onboarding/OnboardingEntry.tsx`                                                                                         | Project creation API             |
| **API Credential Manager**    | Per-user encrypted API key storage across providers and environments (dev/staging/prod)                       | `Functional` | `netlify/functions/credentials-*.ts`, `supabase/migrations/001_initial_schema.sql`                                                      | Encryption secret                |
| **Coherence Scan**            | Cross-project consistency and quality analysis (AI-powered, usage-gated)                                      | `Partial`    | `src/new/routes/CoherenceScanPage.tsx`, `src/new/components/CoherenceLoopView.tsx`                                                      | AI completions, feature_usage    |
| **Asset Library**             | Upload, version, tag, and soft-delete assets (images, video, audio, docs) via Cloudinary                      | `Functional` | `netlify/functions/assets_*.ts`, `supabase/migrations/20251214_asset_library.sql`                                                       | Cloudinary, Supabase Storage     |
| **Image Generation**          | Multi-provider image generation (AimlAPI, DeepAI) with async webhook support + policy enforcement             | `Functional` | `netlify/functions/image-generate.ts`, `src/lib/ai/providers/aimlapi-image.ts`, `supabase/migrations/20260109_image_policy.sql`         | AI providers, Cloudinary         |
| **Specification Generator**   | AI-assisted product/content specification generation, saved to DB                                             | `Functional` | `src/new/components/SpecificationSection.tsx`, `netlify/functions/specification-save.ts`, `supabase/migrations/20260120...rename...sql` | AI completions, projects         |
| **Retrieval / RAG**           | Web search + semantic retrieval for grounded AI responses                                                     | `Partial`    | `netlify/functions/retrieval_search.ts`, `src/lib/ai/types-retrieval.ts`                                                                | Tavily, Brave Search             |
| **Stripe Billing**            | Full subscription lifecycle: checkout, webhook handling, customer portal, plan enforcement                    | `Polished`   | `netlify/functions/billing-*.ts`, `supabase/migrations/20260121_webhook_idempotency.sql`                                                | Stripe, subscriptions table      |
| **Usage Dashboard / Metrics** | Token usage, cost tracking, daily aggregates, Recharts visualization                                          | `Partial`    | `src/pages/Admin/MetricsDashboard.tsx`, `supabase/migrations/001_initial_schema.sql`                                                    | usage_daily_aggregates           |
| **Idea Clusterer**            | AI-powered clustering of ideas into themes                                                                    | `Functional` | `src/new/components/IdeaClusterer.tsx`                                                                                                  | AI completions                   |
| **Model Selector**            | User-facing model picker with capability categorization and pricing display                                   | `Polished`   | `src/new/components/ModelSelector.tsx`, `src/lib/ai/model-categorizer.ts`                                                               | model_registry                   |
| **Export**                    | Export workspace output as PDF or image                                                                       | `Functional` | `src/new/components/ExportModal.tsx`                                                                                                    | jspdf, html2canvas               |
| **Blueprint Gallery**         | Gallery of project templates/blueprints                                                                       | `Scaffolded` | `src/new/routes/BlueprintGalleryPage.tsx`                                                                                               | None found                       |
| **Pricing Page**              | Public-facing pricing/tier information                                                                        | `Functional` | `src/new/routes/PricingPage.tsx`                                                                                                        | billing-checkout                 |
| **Settings**                  | User profile, preferences, theme settings                                                                     | `Functional` | `src/features/settings/SettingsPage.tsx`                                                                                                | user-profile function            |
| **GitHub Integration**        | OAuth login + code context retrieval via Octokit (for workspace context)                                      | `Partial`    | `netlify/functions/github-auth-*.ts`, `octokit`                                                                                         | GitHub OAuth                     |
| **AI Benchmarking**           | Multi-model benchmark runner with evaluation metrics                                                          | `Functional` | `src/lib/ai/benchmark-executor.ts`, `src/lib/ai/types-benchmark.ts`                                                                     | AI providers, model_registry     |
| **Asset Pipeline (Server)**   | Nightly scheduled analysis of new assets; enrichment scripts                                                  | `Functional` | `netlify/functions/analyze-new-assets.ts`, `scripts/pipeline/`                                                                          | Cloudinary, AI providers         |
| **Upgrade Modal**             | Upsell flow with tier comparison and Stripe checkout trigger                                                  | `Polished`   | `src/new/components/UpgradeModal.tsx`                                                                                                   | billing-checkout, user-tier      |
| **Product Tour**              | In-app guided tour via Shepherd.js                                                                            | `Partial`    | `shepherd.js` dependency (integration files not explored)                                                                               | —                                |

---

## SECTION 4: DESIGN SYSTEM & BRAND

### 1. Color Palette

All colors defined in `src/styles/generated-tokens.css` (auto-generated from `src/lib/design-tokens.ts`).

**Brand primitives:**
| Token | Hex | Role |
|---|---|---|
| `--brand-ink` | `#1A1A1A` | Primary text, main dark |
| `--brand-ivory` | `#FFFAF0` | Primary background (warm white) |
| `--brand-coral` | `#FF6B6B` | Accent / alert |
| `--brand-gold` | `#C7A76A` | Primary CTA / accent (dominant brand color) |
| `--brand-teal` | `#2A9D8F` | Design desk tint |
| `--brand-violet` | `#7A77FF` | Highlight / decorative |
| `--brand-magenta` | `#D81159` | Write desk tint / energy |
| `--brand-cream` | `#F5F0E6` | Secondary background |

**Semantic / surface:**
| Token | Value | Role |
|---|---|---|
| `--void` / `--void-soft` / `--void-elevated` | `#1A1A1A` / `#262626` / `#333333` | Dark shell surfaces |
| `--glass-bg` | `rgba(26,26,26,0.92)` | Panel glassmorphism |
| `--shell-text-primary` | `#FFFAF0` | Text on dark surfaces |
| `--state-success` | `#10B981` | Success states |
| `--state-warning` | `#F59E0B` | Warning states |
| `--state-error` | `#EF4444` | Error states |

**Desk tints** (workspace mode colors):

- Write: `#D81159` (magenta)
- Design: `#2A9D8F` (teal)
- Code: `#C7A76A` (gold)
- Analyze: `#3B8EA5` (cyan)

### 2. Typography

| Property       | Value                                                                              |
| -------------- | ---------------------------------------------------------------------------------- |
| Primary font   | `Inter` (via CSS var `--font-family-base`)                                         |
| Fallback chain | `ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial` |
| Scale          | `12px / 14px / 16px / 20px / 24px / 32px / 40px / 48px`                            |
| Weights        | `400 (regular)`, `500 (medium)`, `600 (semibold/bold)`                             |
| Line heights   | `1.2 (tight)`, `1.5 (normal)`, `1.75 (relaxed)`                                    |

_Note: Inter is referenced via CSS var only — not confirmed loaded via `<link>` or font import in explored files. [Gap]_

### 3. Component Library

A shared component system exists in `src/new/components/` (not a published npm package — internal only).

| Component                  | Description                                                             |
| -------------------------- | ----------------------------------------------------------------------- |
| `ModelSelector`            | AI model picker with capability tagging and cost display                |
| `UpgradeModal`             | Tier upsell modal with plan comparison and Stripe trigger               |
| `CoherenceLoopView`        | Multi-round consistency scan progress and results view                  |
| `IdeaClusterer`            | AI idea grouping into themed clusters                                   |
| `SpecificationSection`     | AI spec generation with section-by-section streaming display            |
| `TOCSidebar`               | Table of contents sidebar for long-form content                         |
| `ExportModal`              | PDF/image export modal                                                  |
| `ArtifactFeedbackBar`      | Thumbs up/down feedback on AI outputs                                   |
| `BudgetMeter`              | Visual usage budget dial/gauge                                          |
| `ProgressDot`              | Step-progress indicator                                                 |
| `TaskCostBadge`            | Inline token/cost estimate badge                                        |
| `Toast` / `ToastContainer` | Notification toasts                                                     |
| `ErrorBoundary`            | React error boundary with fallback UI                                   |
| `EmptyState`               | Zero-data empty state with call-to-action                               |
| `UploadZone`               | Drag-and-drop file upload area                                          |
| `FirstRunModal`            | First-time user welcome/setup modal                                     |
| `CodraEscalation`          | Escalation / human handoff prompt component                             |
| `Input`                    | Styled text input                                                       |
| `Typography`               | Type scale component                                                    |
| `TabIndicator`             | Animated tab underline indicator                                        |
| `CodraSignature`           | Brand signature mark                                                    |
| Storybook stories          | `src/stories/` — Storybook configured via `.storybook/` with a11y addon |

### 4. Design Language

**Dark-first editorial glassmorphism** with warm paper tones for the workspace surface.

The shell/chrome uses deep void blacks (`#1A1A1A`–`#333333`) with frosted glass panels (`rgba(26,26,26, 0.92)` + `blur(12px)`), while the writing surface ("desk") is warm ivory (`#FFFAF0`). The gold accent (`#C7A76A`) gives a premium editorial feel. Glow effects in indigo, teal, and magenta add energy. Desk modes each have a distinct tint color to signal context. Overall feel: **premium, editorial, dark-mode-native** — closer to a Figma or Linear aesthetic than a typical SaaS marketing tool.

### 5. Responsive Strategy

⚠️ **Not verified in explored files.** Tailwind breakpoints are inherited from default (sm/md/lg/xl). The workspace shell has fixed pixel sidebar widths (`--shell-sidebar-left: 240px`, `--shell-sidebar-right: 320px`) which _infers_ a desktop-first design. No explicit mobile breakpoint logic was observed in the workspace components. _[Gap — likely desktop-only for the workspace, potentially mobile-responsive for marketing/auth pages.]_

### 6. Dark Mode

**Supported.** Tailwind configured with `darkMode: 'class'`. A `ThemeProvider` context is present in the provider tree (`src/lib/design/ThemeContext.tsx`). The default theme in `preferences` JSONB is `"dark"`. The design token system is built around dark surfaces as primary.

### 7. Brand Assets

- `Codra Language Charter` — Brand voice/writing guidelines document in root (3.9KB)
- `Codra ImagePolicy Specification v1.md` — Image generation aesthetic guidelines (6.3KB)
- `CodraSignature.tsx` — SVG brand mark component
- Asset pipeline generates enriched image indexes for creative asset management
- _No `public/` assets explored — logos/illustrations may exist there._

---

## SECTION 5: DATA & SCALE SIGNALS

### 1. User Model

Fields stored per user (from `profiles` table):
`email`, `full_name`, `display_name`, `avatar_url`, `company`, `job_title`, `timezone`, `preferences (jsonb: theme, defaultEnvironment, notifications, editor settings)`, `plan`, `plan_started_at`, `plan_expires_at`, `onboarding_completed`, `last_active_at`.

**User journey:** Signup → profile auto-created via DB trigger → onboarding wizard (`/new`) → project created (tier-checked) → workspace (`/p/:projectId/workspace`) → AI tasks run → usage tracked → upgrade prompt if limits hit.

### 2. Content / Data Volume

- No seed files found in explored paths.
- Schema is designed for multi-project, multi-asset workloads: daily aggregate tables, SHA-256 asset deduplication, soft deletes, version history.
- `tier_limits` sets `max_tokens_per_request` at 2000/8000/32000 by tier.
- The asset index files in the root (`assets-index-enriched.json` at 2MB, `assets-analysis-results-v1.json` at 930KB) suggest a real asset corpus has been indexed — likely the builder's own content used for testing the pipeline.
- _[Inferred: designed to handle tens of thousands of assets and thousands of users without structural changes.]_

### 3. Performance Considerations

| Pattern                    | Implementation                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| Code splitting             | Lazy-loaded heavy chunks (WorkspacePage, CoherenceScanPage, MetricsDashboard) via `React.lazy()` |
| Bundle optimization        | `NODE_OPTIONS=--max-old-space-size=8192` for build; custom bundle analyzer script                |
| Query caching              | React Query with default stale-time                                                              |
| Pre-computation            | `usage_daily_aggregates` table for dashboard queries                                             |
| Asset deduplication        | SHA-256 hash on assets table                                                                     |
| Concurrency control        | `p-limit` for parallel asset processing                                                          |
| API rate limiting          | Per-credential `daily_limit` / `monthly_limit` fields; `p-limit` in pipeline                     |
| Netlify function timeouts  | Configured per-function (10s auth, 26s asset analysis)                                           |
| Token generation pre-build | CSS tokens generated pre-dev and pre-build                                                       |

### 4. Analytics / Tracking

**PostHog** integrated via `posthog-js ^1.309.1`. Referenced env vars: `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`, `VITE_ANALYTICS_DEBUG`.

Additional DB-level tracking:

- `usage_logs` — every AI request (provider, model, tokens, cost, latency, success)
- `behavior_tracking` table — user behavior events
- `feature_usage` table — per-feature monthly counters (e.g., `coherence_scan`)
- `admin_settings` + `MetricsDashboard` admin page for internal visibility

_[Gap: specific PostHog event names not verified — integration file not explored.]_

### 5. Error Handling

| Layer             | Pattern                                                                        |
| ----------------- | ------------------------------------------------------------------------------ |
| React             | `ErrorBoundary` component wrapping workspace routes                            |
| Netlify Functions | Consistent try/catch → structured JSON error response with `statusCode`        |
| AI Router         | Provider registration errors caught per-provider; total failure returns 503    |
| Supabase          | Error codes checked by type before defaulting (e.g., PGRST116 vs other errors) |
| Stripe webhook    | Failed events flagged `needs_review: true` in `webhook_events` table           |
| Form validation   | `zod` + `ajv` for schema validation                                            |
| Connection status | `ConnectionIndicator` component fixed at `top-4 right-4` z-index 9998          |

### 6. Testing

| Test File                                                     | What It Covers              |
| ------------------------------------------------------------- | --------------------------- |
| `src/lib/ai/__tests__/retrieval-logic.test.ts`                | RAG retrieval logic         |
| `src/lib/flow/__tests__/executor.test.ts`                     | Flow/task execution         |
| `src/lib/templates/__tests__/runner.test.ts`                  | Template runner             |
| `src/lib/project-state/__tests__/ProjectStateManager.test.ts` | Project state management    |
| `src/lib/models/__tests__/registry-service.test.ts`           | Model registry service      |
| `src/lib/models/__tests__/policy-router.test.ts`              | Model routing policies      |
| `src/lib/models/__tests__/adapters.test.ts`                   | Model adapters              |
| `src/lib/models/__tests__/eval-runner.test.ts`                | Evaluation runner           |
| `src/lib/image-policy/__tests__/errors.test.ts`               | Image policy error cases    |
| `src/lib/image-policy/__tests__/policy-executor.test.ts`      | Image policy execution      |
| `src/lib/image-policy/__tests__/resolver.test.ts`             | Image policy resolver       |
| `src/lib/thinking/debate/__tests__/cost-preflight.test.ts`    | Cost preflight checks       |
| `src/domain/__tests__/audit-templates.test.ts`                | Audit template domain logic |
| `netlify/functions/utils/__tests__/telemetry-helpers.test.ts` | Telemetry helper functions  |

**Test runner:** Vitest `^4.0.16`. Coverage via `@vitest/coverage-v8`. Playwright for E2E. Storybook with Vitest addon and a11y addon.

14 test files found. **No React component tests or integration tests observed** — coverage appears focused on business logic and utility layers. _[Gap: no UI interaction tests confirmed.]_

---

## SECTION 6: MONETIZATION & BUSINESS LOGIC

### 1. Pricing / Tier Structure

Three tiers, enforced at API layer **and** DB trigger level (double enforcement):

| Tier   | Projects  | Coherence Scans/mo | Task Execution | Token Limit/Request |
| ------ | --------- | ------------------ | -------------- | ------------------- |
| `free` | 1         | 0                  | ❌             | 2,000               |
| `pro`  | 10        | 5                  | ✅             | 8,000               |
| `team` | Unlimited | Unlimited          | ✅             | 32,000              |

Plan aliases mapped: `starter → pro`, `enterprise/agency → team`.

### 2. Payment Integration

**Stripe** v20.0.0. Implementation:

- **Checkout:** `billing-checkout.ts` creates a Stripe Checkout session (subscription mode, card only) with `client_reference_id` set to `user.id`.
- **Webhook:** `billing-webhook.ts` handles `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.payment_failed`. Price ID → plan mapping via Stripe product metadata.
- **Portal:** `billing-portal.ts` creates a Customer Portal session for self-service plan management.
- **Idempotency:** `webhook_events` table with `is_webhook_processed` / `mark_webhook_processed` RPC functions prevents duplicate processing.

### 3. Subscription / Billing Logic

- **Recurring payments:** Yes (Stripe `mode: 'subscription'`).
- **Trial periods:** `trialing` subscription status handled in tier normalization — treated as active.
- **Past-due enforcement:** `past_due`, `canceled`, `unpaid`, `incomplete_expired` statuses all downgrade the user to `free` tier.
- **Period tracking:** `current_period_start`, `current_period_end`, `cancel_at_period_end` persisted in `subscriptions` table.
- **Monthly usage reset:** SQL function + scheduled migration (`20260121_schedule_usage_reset.sql`) to reset `feature_usage` counters monthly.

### 4. Feature Gates

| Gate           | Free | Pro  | Team |
| -------------- | ---- | ---- | ---- |
| Project count  | 1    | 10   | ∞    |
| Coherence Scan | ❌   | 5/mo | ∞    |
| Task execution | ❌   | ✅   | ✅   |
| Token limit    | 2K   | 8K   | 32K  |

The `UpgradeModal` component surfaces tier-appropriate messaging and triggers `billing-checkout` directly from the UI.

### 5. Usage Limits

- Per-AI-credential `monthly_limit` and `daily_limit` fields with `alert_threshold_warning` (80%) and `alert_threshold_critical` (95%).
- `feature_usage` table tracks monthly usage per feature per user, queried via `get_feature_usage` RPC.
- Usage resets scheduled monthly via DB cron function.

---

## SECTION 7: CODE QUALITY & MATURITY SIGNALS

### 1. Code Organization

Strong separation of concerns:

- `src/lib/` — all business logic (AI, auth, DB clients, design, placement, templates)
- `src/new/components/` — pure UI components
- `src/new/routes/` — page-level route compositions
- `netlify/functions/` — isolated serverless endpoints, each self-contained
- `supabase/migrations/` — versioned DB schema changes

Custom `eslint-plugin-codra` with Codra-specific lint rules shows investment in enforcing internal conventions.

### 2. Patterns & Conventions

| Pattern                     | Evidence                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------- |
| Provider/Context            | AuthProvider, ThemeProvider, AtmosphereProvider, MotionProvider, PlacementProvider      |
| Repository-like abstraction | DB access wrapped in Netlify functions (not direct from client)                         |
| Strategy pattern            | AI Router with pluggable provider strategies                                            |
| Facade                      | `user-tier.ts` aggregates subscription + profile + usage into a single API response     |
| Double enforcement          | Project limits checked at both API layer and DB trigger level                           |
| Consistent naming           | Functions follow `noun-verb.ts` convention (e.g., `projects-create`, `billing-webhook`) |
| Semantic commit messages    | Evidence of structured prefixes (`feat:`, `docs:`, `Merge pull request`)                |

### 3. Documentation

- `docs/` directory with 44 files — substantial internal docs
- `Codra Language Charter` (brand voice guide) and `Codra ImagePolicy Specification v1.md` in root
- `NAMING_MIGRATION_DELIVERABLES.md` — tracks naming convention migration
- Inline JSDoc comments present in functions (e.g., `billing-webhook.ts` comments reference arch fix IDs like `ARCH-001`)
- `audits/` has 49 audit reports from prior AI-assisted audit sessions
- README not explored — assumed to exist but content not verified. _[Gap]_

### 4. TypeScript Usage

- TypeScript `^5.9.3` with strict compilation (`tsc && vite build`)
- Custom types for AI requests/responses, telemetry, benchmark, image generation
- Zod for runtime validation
- Some `as any` casts visible in `billing-webhook.ts` (Stripe event payload) — acceptable for SDK interop
- Interfaces well-defined for most function params and API contracts
- `tsconfig.json` and `tsconfig.node.json` separate client/node configs

### 5. Error Handling Patterns

- Consistent `try/catch → JSON response with statusCode` pattern in all Netlify functions
- Supabase error codes handled by specific type (PGRST116 = not found vs other errors)
- Webhook events flagged `needs_review: true` for unmapped price IDs or orphaned subscriptions
- `ErrorBoundary` at React level
- `ConnectionIndicator` for client-side network status

### 6. Git Hygiene

- 100 commits over ~12 weeks (avg ~8/week)
- Mix of AI-assisted PR merges (`Merge pull request #26 from .../copilot/...`) and direct commits
- Conventional commit prefixes used inconsistently (`feat:`, `docs:` vs freeform messages)
- Branch naming shows AI-generated branch names (`claude/asset-ingestion-pipeline-6q43a`)

### 7. Technical Debt

- `useLyraSuggestion.ts` — hardcoded `TODO: Replace with actual API call` comment; stub options (`Option 1`, `Option 2`)
- `projects-create.ts` — dual schema (architect/legacy) with fallback insert; indicates schema migration in progress
- `billing-checkout.ts` — commented-out Stripe customer pre-creation block (incomplete)
- Several debug scripts in root (`debug-assets.ts`, `debug-cloudinary.ts`, etc.) — dev artifacts not gitignored
- `archive_closet/` directory suggests orphaned code
- `WorkspaceShellDemo` route — demo/testing route accessible in production
- `ai-complete.ts` — `workspaceId: null` with TODO comment for header extraction
- CORS set to `'*'` in `ai-complete.ts` — overly permissive ⚠️

### 8. Security Posture

| Area                      | Status                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| JWT verification          | ✅ All protected functions verify JWT via Supabase                                                                 |
| RLS                       | ✅ Enabled on all tables                                                                                           |
| Credential encryption     | ✅ AES encryption (crypto-js) for stored API keys                                                                  |
| Stripe webhook signatures | ✅ `constructEvent` with webhook secret                                                                            |
| Webhook idempotency       | ✅ DB-level deduplication                                                                                          |
| Security headers          | ✅ X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy                               |
| Input validation          | ✅ Zod + AJV + explicit field checks in functions                                                                  |
| CORS                      | ⚠️ `Access-Control-Allow-Origin: '*'` in `ai-complete.ts` — should be origin-specific                              |
| Admin route protection    | ⚠️ `/admin/metrics` accessible to any authenticated user (ADMIN_EMAILS referenced but not enforced at route level) |
| Secrets management        | ✅ No secrets in codebase; `.env` in `.gitignore`                                                                  |
| Service role key exposure | ✅ Only used server-side in Netlify functions                                                                      |

---

## SECTION 8: ECOSYSTEM CONNECTIONS

### 1. Shared Code / Patterns with Portfolio Projects

The repository lives under `thepennylaneproject` GitHub organization, alongside Relevnt, Ready, Mythos, embr, passagr, and advocera. From the codebase alone:

- The naming conventions (`thepennylaneproject/codra`), brand voice document ("The Penny Lane Project"), and GitHub org all confirm portfolio membership.
- Pattern of AI-assisted audit cycles with structured commit conventions appears shared across the portfolio (based on conversation history referencing similar audit workflows).

### 2. Shared Dependencies / Infrastructure

⚠️ **Cannot confirm from codebase alone.** No explicit references to other project URLs, shared Supabase project IDs, or shared Netlify team configs were found in explored files. _[Gap — would require inspection of Netlify/Supabase dashboards.]_

### 3. Data Connections

No cross-project data reads/writes found in the codebase. Codra appears to be a standalone data silo. _[Gap — not confirmed from external config.]_

### 4. Cross-References

No imports of or links to sister projects found in the source code.

---

## SECTION 9: WHAT'S MISSING

### 1. Gaps for Production-Readiness

| Gap                                                    | Severity | Notes                                                                                       |
| ------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------- |
| Lyra backend API (`/api/lyra/suggest`) not implemented | High     | The assistant's suggest endpoint is stubbed with a TODO — core differentiator is incomplete |
| CORS wildcard on AI endpoint                           | High     | `ai-complete.ts` sets `Access-Control-Allow-Origin: '*'`                                    |
| Admin route authorization                              | High     | `/admin/metrics` is protected by `ProtectedRoute` (any user) but not by admin email check   |
| No health check / uptime monitoring                    | Medium   | No monitoring endpoint or external uptime service configured                                |
| No rate limiting on AI endpoint                        | Medium   | Platform-key model with no per-user request throttle beyond monthly DB counters             |
| Mobile responsiveness unverified                       | Medium   | Workspace shell appears desktop-only (fixed sidebar widths)                                 |
| No error reporting service                             | Medium   | No Sentry or equivalent; errors logged to console only                                      |
| Inter font loading not confirmed                       | Low      | CSS var references Inter but `<link>` tag not verified                                      |
| Debug scripts in root not gitignored                   | Low      | `debug-*.ts` files should be removed or moved                                               |
| `WorkspaceShellDemo` accessible in production          | Low      | Demo route should be gated behind admin flag                                                |

### 2. Gaps for Investor Readiness

- **No user metrics visible:** No DAU/MAU, conversion rate, or revenue figures in the codebase.
- **No public README content verified:** Key investor artifact (what is this, why does it matter) not confirmed.
- **No changelog or roadmap linked from code:** `docs/` has 44 files — contents not fully explored.
- **No SLA or uptime commitment visible.**
- **Test coverage not measured:** 14 test files for 580 source files is a low ratio; no coverage report artifact.

### 3. Gaps in the Codebase Itself

- **Dual project schema:** `projects-create.ts` has a primary (architect) schema and a legacy fallback — signals an incomplete migration.
- **`archive_closet/`** — contains 6 children; likely dead code.
- **`spec` → `spread` → `specification` naming chain:** Multiple renaming migrations suggest churn in core domain model naming.
- **`ai-complete.ts` `workspaceId: null` TODO** — telemetry runs without workspace context.
- **Lyra stub options** (`Option 1`, `Option 2`) — placeholder copy shipped.
- **`SECRETS_SCAN_ENABLED = "false"`** in `netlify.toml` — secrets scanning disabled, potentially for expediency.

### 4. Recommended Next Steps (Priority Order)

1. **Implement the Lyra `/api/lyra/suggest` backend** — This is the core differentiator (contextual AI guidance). The frontend is ready; the server endpoint doesn't exist. Highest leverage item.
2. **Fix CORS and admin auth** — Tighten `Access-Control-Allow-Origin` to the Netlify deploy URL; add admin email enforcement to the `/admin/metrics` route.
3. **Complete the schema migration** — Collapse architect/legacy dual-schema to a single path in `projects-create.ts`; archive the legacy branch.
4. **Add error reporting** — Integrate Sentry (or equivalent) in both the React app and Netlify functions to gain production visibility.
5. **Instrument conversion funnel metrics in PostHog** — Track signup → onboarding → first project → first AI run → upgrade to establish baseline metrics for investor conversations.

---

## SECTION 10: EXECUTIVE SUMMARY

**Codra is a browser-based AI workflow platform targeting knowledge workers — content creators, marketers, and product teams — who need to run structured creative and analytical tasks across multiple AI providers** without managing API keys or switching between tools. The product's core bet is that productivity workflows benefit from an opinionated, project-centric workspace with contextual AI guidance (the "Lyra" assistant), a visual node canvas for multi-step tasks, and a unified asset library — all against a platform-key model where Codra absorbs API costs and bills users on a SaaS subscription.

**The technical execution is credible and well above prototype quality.** In roughly 12 weeks and 100 commits, the builder has shipped: a full Supabase schema with 18+ tables and RLS on all of them; 33 serverless API endpoints covering AI routing (7+ providers with fallback chains), full Stripe billing lifecycle (checkout, webhooks, portal, idempotency), an encrypted API credential vault, a multi-format asset pipeline connected to Cloudinary, and a React SPA with a custom design system, Zustand + React Query state management, lazy-loaded heavy chunks, and Storybook component documentation. The billing system in particular shows production-grade thinking: double enforcement of tier limits at both API and database trigger level, idempotent webhook processing, and graceful status normalization for past-due subscriptions. The custom ESLint plugin and structured token generation pipeline show unusual engineering rigor for a solo or very small team project.

**Codra is best classified as a late Alpha.** The end-to-end path (signup → project → workspace → AI completion → billing upgrade) is functional and the infrastructure is production-deployable. However, the most distinctive feature — Lyra's contextual AI suggestions — is currently a frontend stub awaiting a backend implementation. The admin metrics route lacks authorization, CORS policy is overly permissive on the AI endpoint, there is no external error monitoring, and mobile responsiveness is unverified. The schema shows signs of active evolution (a rename migration for the core `spreads → specifications` concept, a dual-insert fallback in project creation). For a first investor conversation, the story is strong on architecture and speed of execution; it needs a working Lyra demo, measured conversion funnel data, and closed-loop error observability before it would be ready for a serious technical due diligence process.

---

```
---
AUDIT METADATA
Project: codra
Date: 2026-03-07
Agent: Antigravity (Google DeepMind)
Codebase access: Full local read-only (repo at /Users/sarahsahl/Desktop/codra)
Confidence level: HIGH for Sections 1–3, 6–7, 9–10 (direct codebase evidence);
                  MEDIUM for Sections 4–5, 8 (some gaps in explored files noted);
                  LOW for live URL, Inter font loading, mobile responsiveness (not verified)
Sections with gaps: 1 (live URL), 4 (responsive/font), 5 (PostHog event names), 8 (shared infra)
Total files analyzed: ~60 files read directly; 580 total TS/TSX/CSS source files in repo
---
```
