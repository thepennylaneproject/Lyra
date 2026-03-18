# LYRA Dashboard

Local-first project and findings management for the LYRA audit suite. Run locally with optional production deploy.

When `LYRA_GITHUB_OWNER`, `LYRA_GITHUB_REPO`, and `LYRA_GITHUB_TOKEN` are set, the dashboard stores project findings as GitHub issues and reads them back from GitHub instead of local JSON.
When `LYRA_SUPABASE_URL` and `LYRA_SUPABASE_SERVICE_ROLE_KEY` are set, it also records orchestration events and project snapshots to Supabase for durable history.

## Run locally

```bash
cd dashboard
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Data is stored under `./data` (or `LYRA_DASHBOARD_DATA_DIR`) as JSON.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LYRA_DASHBOARD_DATA_DIR` | No | Directory for `projects.json` and `linear_sync.json`. Default: `./data` (under app directory). |
| `LYRA_ROUTING_CONFIG` | No | Optional JSON routing override file. Default: `audits/routing_config.json`. |
| `LYRA_ROUTING_STRATEGY` | No | Routing mode: `aggressive`, `balanced`, or `precision`. Default: `balanced`. |
| `LYRA_ROUTING_MAX_COST_PER_TASK` | No | Override for the max spend per task. |
| `LYRA_ROUTING_CONFIDENCE_THRESHOLD` | No | Override for the confidence threshold used before escalating. |
| `LYRA_ROUTING_AUTO_ESCALATE` | No | Enable or disable automatic escalation. |
| `LYRA_ROUTING_MAX_RETRIES` | No | Override for retry count before escalation. |
| `LYRA_AIMLAPI_NANO_MODEL` | No | AIMLAPI nano model. Default: `meta-llama/3.1-8b-instruct`. |
| `LYRA_AIMLAPI_CHEAP_MODEL` | No | AIMLAPI cheap model. Default: `mistralai/mistral-7b-instruct`. |
| `LYRA_AIMLAPI_MID_MODEL` | No | AIMLAPI mid-tier model. Default: `mistralai/mixtral-8x7b-instruct`. |
| `LYRA_AIMLAPI_EXPENSIVE_MODEL` | No | AIMLAPI expensive model. Default: `meta-llama/3.1-70b-instruct`. |
| `LYRA_HF_NANO_MODEL` | No | HuggingFace nano model. Default: `HuggingFaceH4/zephyr-7b-beta`. |
| `LYRA_OPENAI_MINI_MODEL` | No | OpenAI mini model. Default: `gpt-4o-mini`. |
| `LYRA_OPENAI_BALANCED_MODEL` | No | OpenAI balanced model. Default: `gpt-4o`. |
| `LYRA_ANTHROPIC_HAIKU_MODEL` | No | Anthropic Haiku model. Default: `claude-3-haiku`. |
| `LYRA_ANTHROPIC_SONNET_MODEL` | No | Anthropic Sonnet model. Default: `claude-3.5-sonnet`. |
| `LYRA_ANTHROPIC_OPUS_MODEL` | No | Anthropic Opus model. Default: `claude-3-opus`. |
| `LYRA_GEMINI_FLASH_MODEL` | No | Gemini Flash model. Default: `gemini-1.5-flash`. |
| `LYRA_GEMINI_PRO_MODEL` | No | Gemini Pro model. Default: `gemini-1.5-pro`. |
| `LYRA_GITHUB_OWNER` | For GitHub-backed projects | GitHub owner or org used as the issue repository source of truth. |
| `LYRA_GITHUB_REPO` | For GitHub-backed projects | GitHub repository that stores canonical open findings issues. |
| `LYRA_GITHUB_TOKEN` | For GitHub-backed projects | Token with issue read/write access. |
| `LYRA_GITHUB_WORKFLOW` | No | Workflow file used by the dashboard control plane. Default: `scheduled-audit.yml`. |
| `LINEAR_API_KEY` | For Linear sync | Linear API key (Settings → API → Personal API Keys). |
| `LINEAR_TEAM_ID` | For Linear sync | Team ID from your Linear URL. |
| `LINEAR_LABEL_ID` | No | Optional label UUID for synced issues. |
| `LINEAR_PROJECT_ID` | No | Optional Linear project UUID to group issues. |
| `LYRA_SUPABASE_URL` | For durable state | Supabase project URL used for orchestration history and snapshots. |
| `LYRA_SUPABASE_SERVICE_ROLE_KEY` | For durable state | Service role key for server-side writes to durable state tables. |
| `LYRA_SUPABASE_SCHEMA` | No | Supabase schema for durable state tables. Default: `public`. |
| `LYRA_SUPABASE_EVENTS_TABLE` | No | Durable state events table. Default: `lyra_orchestration_events`. |
| `LYRA_SUPABASE_SNAPSHOTS_TABLE` | No | Durable state snapshots table. Default: `lyra_project_snapshots`. |

Copy `.env.example` to `.env.local` and fill in any values you need.

## Features

- **Projects**: Import `open_findings.json` (or paste JSON), create/remove projects, export per project. When GitHub is configured, projects are stored as GitHub issues.
- **Onboarding**: Create a project from a repo URL or empty shell; when GitHub is configured, that project automatically dispatches the initial `onboard_project` audit workflow.
- **Routing**: The engine view shows the effective routing strategy, provider model catalog, and escalation rules derived from `LYRA_ROUTING_*` plus any `audits/routing_config.json` overrides.
- **Findings**: View by status (active / pending / resolved), search, update status (Start fix, Defer, Mark done, Verify fix).
- **Linear sync** (optional): Push findings to Linear as issues, pull status changes back. Enable via env vars; use Push/Pull in a project view.
- **Durable state** (optional): Mirror orchestration events and project snapshots into Supabase so audit history survives beyond GitHub issue metadata.

## Production deploy

The app is a standard Next.js app and can be deployed to Vercel, Netlify, or any Node host.

### Deploy (e.g. Vercel)

1. From repo root or `dashboard/`: connect the repo to Vercel and set root to `dashboard` (or run build from `dashboard/`).
2. Set environment variables in the host (at least none required for read-only; for persistence and Linear, set the same vars as above).
3. **Storage**: The default file-based store writes to the server filesystem. On serverless (Vercel, Netlify Functions), the filesystem is read-only or ephemeral. For production you should:
   - Use a **hosted database** (Postgres, SQLite on a volume, etc.) and implement the `ProjectsRepository` interface in `lib/repository.ts`, then wire it in `lib/repository-instance.ts`, or
   - Use **GitHub issues** by setting `LYRA_GITHUB_OWNER`, `LYRA_GITHUB_REPO`, and `LYRA_GITHUB_TOKEN`; the dashboard will store one canonical issue per project and embed the project JSON in the issue body, or
   - Use **Supabase** with `LYRA_SUPABASE_URL` and `LYRA_SUPABASE_SERVICE_ROLE_KEY` to persist orchestration events and project snapshots, or
   - Use **Vercel KV / Upstash Redis** or similar to persist projects and sync state, with a small adapter that implements `ProjectsRepository` and stores sync state in the same store.

### Migration from local JSON to hosted DB

1. Implement `ProjectsRepository` (see `lib/repository.ts`) against your DB.
2. In `lib/repository-instance.ts`, replace `createJsonRepository()` with your implementation (e.g. from env `LYRA_DASHBOARD_STORE=postgres`), or set the GitHub env vars listed above to use issue-backed storage.
3. If you want durable history, set the Supabase env vars listed above and create the `lyra_orchestration_events` and `lyra_project_snapshots` tables.
4. Migrate existing data: read `data/projects.json` and `data/linear_sync.json` and insert into your DB (one-time script or admin endpoint), or import the existing projects into GitHub issues via the dashboard sync flow.

## Scripts

- `npm run dev` — Start dev server (Turbopack).
- `npm run build` — Production build.
- `npm run start` — Run production server.
- `npm run lint` — Run ESLint.
