# AGENTS.md — The Pennylane Project Audit Agent System

## Copilot specific instructions

### Overview

This repository contains the Copilot audit agent system for **The Pennylane Project**, a portfolio of 11 applications built by Sarah Sahl. The audit agent (`audit-agent`) automatically reviews each app against a curated expectations document, files GitHub Issues for every violation, and posts a summary report when the audit is complete.

---

### The 11 Applications

| App | Directory | Expectations Document |
|---|---|---|
| **Advocera** | `the_penny_lane_project/Advocera/` | `expectations/advocera-expectations.md` |
| **Codra** | `the_penny_lane_project/Codra/` | `expectations/codra-expectations.md` |
| **FounderOS** | `the_penny_lane_project/FounderOS/` | `expectations/founderos-expectations.md` |
| **Mythos** | `the_penny_lane_project/Mythos/` | `expectations/mythos-expectations.md` |
| **Passagr** | `the_penny_lane_project/Passagr/` | `expectations/passagr-expectations.md` |
| **Relevnt** | `the_penny_lane_project/Relevnt/` | `expectations/relevnt-expectations.md` |
| **embr** | `the_penny_lane_project/embr/` | `expectations/embr-expectations.md` |
| **ready** | `the_penny_lane_project/ready/` | `expectations/ready-expectations.md` |
| **Dashboard** | `the_penny_lane_project/dashboard/` | `expectations/dashboard-expectations.md` |
| **Restoration Project** | `the_penny_lane_project/restoration-project/` | `expectations/restoration-project-expectations.md` |
| **sarahsahl.pro** | `the_penny_lane_project/sarahsahl_pro/` | `expectations/sarahsahl-pro-expectations.md` |

---

### How the Audit System Works

#### Automated Weekly Audits

A GitHub Actions workflow (`.github/workflows/scheduled-audit.yml`) runs every **Monday at 9:00 AM UTC** and:

1. Creates a GitHub Issue with title `[Scheduled Audit] Weekly compliance check - <YYYY-MM-DD>`
2. Assigns the issue to `@copilot` with label `audit`
3. Instructs the `audit-agent` to read all 11 expectations documents and audit each app

#### Manual Trigger

Navigate to **Actions → Scheduled Audit** and click **Run workflow** to trigger an audit at any time.

#### What the Agent Does

1. Reads every file in `/expectations/` before beginning
2. Audits each app directory against its corresponding expectations document
3. Files a separate GitHub Issue for each violation found, labeled with severity (`critical`, `warning`, or `suggestion`)
4. Posts a final summary report as a comment on the triggering issue
5. Flags any app that is missing an expectations document

---

### Audit Agent Profile

The full agent profile is at `.github/agents/audit-agent.md`. Global Copilot instructions governing all behavior are at `.github/copilot-instructions.md`.

---

### Expectations Documents

All expectations documents live in `/expectations/`. They are derived from the codebase intelligence reports in `the_penny_lane_project/*/` and reflect the **real architecture, stack, and constraints** of each app. Do not use these documents as generic templates — every rule is sourced from the actual codebase.

#### Adding a New App

1. Add an intelligence report to `the_penny_lane_project/<app-name>/`
2. Create `expectations/<app-name>-expectations.md` following the structure of existing documents
3. Reference the new app in this `AGENTS.md` table
4. The next scheduled audit will automatically include the new app

---

### Output Location

Audit summaries and run artifacts are stored in the `audits/` directory at the repo root.

---

### Important Constraints

- The `audit-agent` **never** modifies expectations documents without explicit human approval
- The `audit-agent` **never** auto-merges or auto-commits code changes
- All issues filed by the agent must be reviewed by Sarah Sahl before any remediation work begins
