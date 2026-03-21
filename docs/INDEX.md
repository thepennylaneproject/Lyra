# Lyra Documentation Index

Complete documentation for setting up, running, developing, and deploying Lyra.

## Getting Started

- **[OPERATIONS.md](./OPERATIONS.md)** - Running commands, managing the system
  - Makefile commands
  - Docker Compose operations
  - Admin CLI reference
  - Common workflows

- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - How to contribute
  - Development workflow
  - Running checks locally
  - Submitting PRs
  - Code standards

## Architecture & Features

- **[REPAIR_ENGINE_INTEGRATION.md](./REPAIR_ENGINE_INTEGRATION.md)** - Repair workflow
  - Dashboard-to-engine communication
  - Job completion callbacks
  - Finding status transitions

- **[WORKER_LLM_ROUTING.md](./WORKER_LLM_ROUTING.md)** - Multi-provider LLM support
  - Provider configuration
  - Routing strategies
  - Cost estimation
  - Fallback logic

- **[DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)** - Container setup
  - Image building
  - Docker Compose configuration
  - Production deployment
  - Scaling

- **[TESTING.md](./TESTING.md)** - Testing infrastructure
  - Test runner (Vitest)
  - Test examples
  - Coverage
  - Mocking strategies

## CI/CD Pipeline

- **[CI_CD.md](./CI_CD.md)** - CI/CD pipeline overview
  - Workflow architecture
  - Jobs and triggers
  - Local simulation
  - Performance metrics

- **[CI_CD_SETUP.md](./CI_CD_SETUP.md)** - Setting up CI/CD
  - Quick start
  - Branch protection
  - Secrets configuration
  - Debugging workflows

- **[CI_CD_IMPLEMENTATION.md](./CI_CD_IMPLEMENTATION.md)** - Implementation details
  - What was built
  - Usage examples
  - Best practices
  - Troubleshooting

- **[.github/workflows/README.md](../.github/workflows/README.md)** - Workflow details
  - Workflow architecture
  - Quick reference
  - Performance metrics
  - Maintenance checklist

## Deployment & Operations

- **[OPERATIONS.md](./OPERATIONS.md)** - Operational management
  - Running migrations
  - Health checks
  - Job queueing
  - Troubleshooting

- **[DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)** - Container deployment
  - Building images
  - Running containers
  - Production setup
  - Scaling workers

## Development

- **[TESTING.md](./TESTING.md)** - Writing and running tests
  - Test setup
  - Examples for each module
  - Coverage reporting
  - Debugging tests

- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Contributing guidelines
  - Development workflow
  - Code standards
  - Commit conventions
  - PR process

## Quick Links

### Useful Commands

```bash
# Setup
make setup               # First-time setup
make dev               # Start local dev

# Testing
make lint              # Lint check
make test              # Run tests (cd dashboard first)

# Operations
make migrate           # Run migrations
make health            # Check system health
make queue-job PROJECT=X TYPE=weekly_audit

# Docker
make build             # Build images
make up                # Start containers
make down              # Stop containers
```

### Common Workflows

1. **Local Development**
   - Read: [CONTRIBUTING.md](../CONTRIBUTING.md) - "Quick Start"
   - Command: `make dev`

2. **Running Tests**
   - Read: [TESTING.md](./TESTING.md)
   - Command: `make lint && cd dashboard && npm test`

3. **Deploying**
   - Read: [CI_CD_SETUP.md](./CI_CD_SETUP.md) - "Trigger your first CI run"
   - Command: `git tag v1.0.0 && git push origin v1.0.0`

4. **Troubleshooting**
   - Check: [OPERATIONS.md](./OPERATIONS.md#troubleshooting)
   - Or: [CI_CD_SETUP.md](./CI_CD_SETUP.md#monitoring-and-debugging)

## File Structure

```
lyra/
├── docs/
│   ├── INDEX.md (this file)
│   ├── OPERATIONS.md
│   ├── TESTING.md
│   ├── REPAIR_ENGINE_INTEGRATION.md
│   ├── WORKER_LLM_ROUTING.md
│   ├── DOCKER_DEPLOYMENT.md
│   ├── CI_CD.md
│   ├── CI_CD_SETUP.md
│   └── CI_CD_IMPLEMENTATION.md
├── .github/workflows/
│   ├── ci.yml
│   ├── deploy.yml
│   └── README.md
├── dashboard/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── scripts/migrate.ts
├── worker/
│   ├── src/
│   ├── src/providers/
│   └── src/scripts/admin.ts
├── repair_engine/
├── supabase/migrations/
├── docker-compose.yml
├── Makefile
└── CONTRIBUTING.md
```

## Document Purpose Reference

| Document | Purpose | Audience |
|----------|---------|----------|
| INDEX.md | Navigation hub | Everyone |
| OPERATIONS.md | Running commands | Operators, Devs |
| CONTRIBUTING.md | Contributing guide | Contributors |
| TESTING.md | Test infrastructure | Developers |
| REPAIR_ENGINE_INTEGRATION.md | Repair workflow | Developers |
| WORKER_LLM_ROUTING.md | LLM setup | Operators, Devs |
| DOCKER_DEPLOYMENT.md | Container setup | Devops, Operators |
| CI_CD.md | Pipeline overview | Everyone |
| CI_CD_SETUP.md | CI/CD configuration | Operators |
| CI_CD_IMPLEMENTATION.md | Implementation details | Maintainers |

## Getting Help

1. Check the relevant documentation
2. Search documentation for keywords
3. Check troubleshooting sections
4. Review GitHub Issues
5. Ask in GitHub Discussions

## Contributing to Docs

When adding new documentation:
1. Add it to this INDEX
2. Update the file structure if adding a new section
3. Include quick reference commands
4. Add troubleshooting section
5. Link to related docs

## Version

Last updated: 2026-03-20
