# Dev Team Six — Portfolio Intelligence & Audit Infrastructure

> Part of [The Penny Lane Project](https://thepennylaneproject.org) — technology that serves the individual.

## What This Is

This repository is the central intelligence and quality-assurance hub for The Penny Lane Project — a portfolio of 11 actively developed applications built by Sarah Sahl. It houses deep codebase analysis reports, structured expectations documents, and the LYRA multi-agent audit system that continuously validates each application against its architectural constraints.

## Current Status

**Active** — Codebase intelligence reports and expectations documents are in place for all 11 applications. The LYRA audit system is operational and ready to run against any application in the portfolio.

## The 11 Applications

| Application | Domain | Stack |
|:---|:---|:---|
| **Advocera** | Legal-tech | Python / SQLite |
| **Codra** | AI-powered development platform | TypeScript / React / Netlify Functions |
| **FounderOS** | Founder productivity suite | Next.js 14 App Router |
| **Mythos** | AI marketing operations | TypeScript monorepo |
| **Passagr** | Travel visa research | TypeScript / React |
| **Relevnt** | Job market intelligence | TypeScript / React |
| **embr** | Creator monetization | NestJS / Next.js / React Native (Turborepo) |
| **ready** | Career readiness | TypeScript / React / Vite |
| **Dashboard** | Personal medical data | Python / Streamlit |
| **Restoration Project** | Blog & briefing site | Next.js |
| **sarahsahl.pro** | Portfolio site | Static HTML / CSS / JS |

## Repository Structure

```
the_penny_lane_project/   # Codebase intelligence reports (one per app)
expectations/             # Architectural expectations documents (one per app)
audits/                   # LYRA audit system — multi-agent quality assurance
  session.py              # Session runner (low-cognitive-load workflow)
  open_findings.json      # Canonical current state of open audit findings
  index.json              # Append-only audit run history
  prompts/                # Agent prompts (Logic, Data, UX, Performance, Security, Deploy)
  schema/                 # JSON Schema for audit output contract
  findings/               # Individual finding case files
  runs/                   # Immutable run outputs
```

## Audit System (LYRA)

LYRA is a multi-agent audit system with six specialized agents:

- **Agent A** — Runtime & Logic Bug Hunter
- **Agent B** — Data Integrity / Schema / RLS Auditor
- **Agent C** — UX Flow & Copy Consistency Auditor
- **Agent D** — Performance & Cost Auditor
- **Agent E** — Security & Privacy Auditor
- **Agent F** — Build/Deploy & Observability Auditor

To run an audit session:

```bash
python3 audits/session.py        # What should I do next?
python3 audits/session.py triage # Show prioritized fix list
python3 audits/session.py status # Full dashboard
```

See [`audits/README.md`](audits/README.md) for full documentation.

## Dashboard

The dashboard is the primary way to review audit output, queue repairs, and manage projects without running everything manually.

```bash
cd dashboard
npm install
npm run dev
```

Useful checks:

```bash
npm run lint
npm run build
```

From the dashboard UI, use **Import project** to load `open_findings.json`, then use **sync now** and the project-level repair controls to keep manual work inside the app.

## GitHub Control Plane

Lyra is moving toward GitHub as the event source for audit orchestration. The scheduled audit workflow in `.github/workflows/scheduled-audit.yml` now accepts manual dispatch inputs and repository dispatch events for onboarding, re-audits, and synthesis triggers.

That means GitHub can initiate the audit cycle, while the dashboard watches the resulting state and recommends the next step.

If you want the dashboard to talk to GitHub directly, set:

```bash
export LYRA_GITHUB_OWNER="your-org-or-user"
export LYRA_GITHUB_REPO="your-repo"
export LYRA_GITHUB_TOKEN="github_pat_or_fine_grained_token"
export LYRA_GITHUB_WORKFLOW="scheduled-audit.yml"
```

When configured, the dashboard shows the latest audit issues, workflow runs, and artifacts, and it can dispatch onboarding/re-audit/synthesis events back to GitHub.

The canonical project findings can also live in GitHub issue bodies when the dashboard GitHub store is enabled, so `open_findings` stops depending on your local machine.

If you also configure Supabase, Lyra records orchestration events and project snapshots there for durable history and future learning.

New GitHub-backed projects automatically dispatch the initial `onboard_project` workflow so you do not need to manually kick off the first audit.
The dashboard also accepts repository URLs when onboarding a project, which makes repo-first setup the default when you do not already have `open_findings`.

Routing is env-driven as well: `LYRA_ROUTING_CONFIG`, `LYRA_ROUTING_STRATEGY`, and the `LYRA_*_MODEL` overrides control the effective model catalog and escalation behavior shown in the dashboard engine view and repair engine.

## License

All rights reserved. © Sarah Sahl / The Penny Lane Project.
