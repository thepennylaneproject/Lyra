# LYRA Dashboard

Local-first project and findings management for the LYRA audit suite. Run locally with optional production deploy.

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
| `LINEAR_API_KEY` | For Linear sync | Linear API key (Settings → API → Personal API Keys). |
| `LINEAR_TEAM_ID` | For Linear sync | Team ID from your Linear URL. |
| `LINEAR_LABEL_ID` | No | Optional label UUID for synced issues. |
| `LINEAR_PROJECT_ID` | No | Optional Linear project UUID to group issues. |

Copy `.env.example` to `.env.local` and fill in any values you need.

## Features

- **Projects**: Import `open_findings.json` (or paste JSON), create/remove projects, export per project.
- **Findings**: View by status (active / pending / resolved), search, update status (Start fix, Defer, Mark done, Verify fix).
- **Linear sync** (optional): Push findings to Linear as issues, pull status changes back. Enable via env vars; use Push/Pull in a project view.

## Production deploy

The app is a standard Next.js app and can be deployed to Vercel, Netlify, or any Node host.

### Deploy (e.g. Vercel)

1. From repo root or `dashboard/`: connect the repo to Vercel and set root to `dashboard` (or run build from `dashboard/`).
2. Set environment variables in the host (at least none required for read-only; for persistence and Linear, set the same vars as above).
3. **Storage**: The default file-based store writes to the server filesystem. On serverless (Vercel, Netlify Functions), the filesystem is read-only or ephemeral. For production you should:
   - Use a **hosted database** (Postgres, SQLite on a volume, etc.) and implement the `ProjectsRepository` interface in `lib/repository.ts`, then wire it in `lib/repository-instance.ts`, or
   - Use **Vercel KV / Upstash Redis** or similar to persist projects and sync state, with a small adapter that implements `ProjectsRepository` and stores sync state in the same store.

### Migration from local JSON to hosted DB

1. Implement `ProjectsRepository` (see `lib/repository.ts`) against your DB.
2. In `lib/repository-instance.ts`, replace `createJsonRepository()` with your implementation (e.g. from env `LYRA_DASHBOARD_STORE=postgres`).
3. Migrate existing data: read `data/projects.json` and `data/linear_sync.json` and insert into your DB (one-time script or admin endpoint).

## Scripts

- `npm run dev` — Start dev server (Turbopack).
- `npm run build` — Production build.
- `npm run start` — Run production server.
- `npm run lint` — Run ESLint.
