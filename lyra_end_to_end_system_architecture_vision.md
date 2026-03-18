# Lyra: End-to-End System Architecture & Vision
## Single Source of Truth

---

## 1. Foundational Principle (Non-Negotiable)

Lyra is not a collection of tools.
Lyra is a **cohesive, prompt-driven intelligence system**.

At the center of everything:

> ONE CORE PROMPT defines how Lyra thinks, evaluates, and acts.

All agents, routing, audits, and patches must inherit from or reference this prompt.

If this is broken, Lyra becomes inconsistent, expensive, and unreliable.

---

## 2. What Lyra Is (Deployed Reality)

Lyra is a **continuous audit + patch system** that:

- Connects to your codebase (GitHub)
- Connects to your task system (Linear)
- Runs audits on demand or automatically
- Surfaces issues in a dashboard
- Batches and applies fixes intelligently
- Learns from past decisions

It operates as:

> A semi-autonomous engineering layer that reduces manual work without removing human control.

---

## 3. Core Stack (Supabase + Netlify)

### Frontend (Netlify)
- React + Tailwind
- Hosted on Netlify
- Handles:
  - dashboard
  - onboarding
  - audit triggers
  - patch approvals

---

### Backend (Supabase)

#### Supabase Provides:
- Postgres database (primary memory)
- Auth (user management)
- Edge Functions (light backend logic)
- Storage (logs, artifacts)

---

### Queue System (Required)

- Redis + BullMQ (external or hosted)

Handles:
- audit jobs
- batch processing
- retries
- scheduling

---

### Routing Layer (Custom Service)

This is critical.

Responsibilities:
- model selection
- cost tracking
- fallback handling
- batching
- confidence scoring

All agents MUST go through this layer.

---

## 4. Integrations

### GitHub
- Repo access
- PR creation
- Diff analysis

### Linear
- Issue creation
- Issue updates
- Status syncing

---

### Optional Integrations
- Slack (alerts + approvals)
- Sentry (error correlation)
- CI/CD hooks

---

## 5. System Flow (End-to-End)

### 1. Trigger
- Manual (dashboard)
- Git push
- Scheduled audit

### 2. Ingestion
- Pull files or diffs from GitHub
- Store snapshot in Supabase

### 3. Audit Phase
Agents analyze:
- logic
- UX
- performance
- security

Output:
- structured findings

---

### 4. Findings Storage
Stored in Postgres:
- issue type
- severity
- file
- confidence

---

### 5. Dashboard Display
User sees:
- open issues
- grouped findings
- severity filters

---

### 6. Batch Fix Phase
User selects:
- specific issues OR
- full batch

System:
- groups similar fixes
- routes through cheapest viable model

---

### 7. Patch Generation
- diff created
- explanation generated
- confidence score assigned

---

### 8. Validation
- basic checks
- optional tests

---

### 9. Output
- PR created in GitHub OR
- queued for approval

---

## 6. Dashboard Capabilities

### Onboarding
- connect GitHub
- connect Linear
- configure routing strategy

---

### Audit Control
- run audit
- schedule audits

---

### Findings View
- filter by severity/type
- inspect issue details

---

### Batch Fix Center
- select issues
- preview diffs
- approve/reject

---

### System Insights
- cost tracking
- model usage
- success rates

---

## 7. Cost Optimization (Built-In)

### Mechanisms
- batching
- routing tiers
- caching

---

### Expected Behavior

System naturally trends toward:
- majority cheap model usage
- selective escalation

---

## 8. Automations (Realistic Today)

### Safe Automations
- auto-fix low-risk issues
- auto-create Linear tickets
- scheduled audits

---

### Semi-Automated
- PR generation with approval
- batch fixes

---

### Not Safe Yet (Human Required)
- large refactors
- architecture changes

---

## 9. Memory System

Stored in Supabase:
- past issues
- fixes
- outcomes

Used for:
- pattern recognition
- routing improvement

---

## 10. What Is Possible Right Now

- multi-agent audits
- batch fixing
- cost-aware routing
- GitHub integration
- dashboard control

---

## 11. What Comes Next (Near-Term Evolution)

- adaptive routing (learns best models)
- confidence-based automation
- smarter batching

---

## 12. Long-Term Vision (Realistic)

Lyra becomes:

- self-improving
- pattern-aware
- partially autonomous

But still:
- human-guided for high-risk decisions

---

## 13. Guardrails

- never bypass routing layer
- never lose core prompt
- always log decisions
- always track cost

---

## 14. Final Definition

Lyra is:

> A prompt-centered, cost-aware, multi-agent system that continuously audits and improves software while maintaining human control.

---

## 15. The Line You Do Not Cross

Do not fragment the system.

One prompt.
One routing layer.
One source of truth.

Everything else is implementation detail.

