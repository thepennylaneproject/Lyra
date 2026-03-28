# Lyra Operations Guide

## Overview

Lyra provides multiple ways to run commands and manage the system:

1. **Makefile** — High-level convenience commands for common tasks
2. **Docker Compose exec** — Direct command execution in containers
3. **npm scripts** — Direct scripts in dashboard/worker packages
4. **Admin CLI** — Worker management command-line interface

Choose the method based on your context (local dev, Docker, production).

## Makefile Commands

### Setup & Development

```bash
# First-time setup (install deps, migrate, build)
make setup

# Start development environment
make dev

# View logs
make dev-logs

# Clean build artifacts
make clean
```

### Database Operations

```bash
# Run pending migrations
make migrate

# Full dashboard setup (install deps + migrate)
make dashboard-setup
```

### Worker Administration

```bash
# Check system health
make health

# List recent jobs
make list-jobs
make list-repairs

# Queue audit job
make queue-job PROJECT=MyApp TYPE=weekly_audit

# Queue repair
make repair-job FINDING=F123 PROJECT=MyApp

# Clear queued jobs (destructive)
make clear-queue CONFIRM=yes
```

### Docker Operations

```bash
# Build images
make build

# Start containers
make up

# Stop containers
make down

# Stop and remove volumes
make down-hard

# Push to registry
make push TAG=v1.0.0

# Restart services
make restart
```

---

## Docker Compose exec Commands

For running commands in deployed/running containers:

### Dashboard

```bash
# Run migrations
docker-compose exec dashboard npm run migrate

# Run tests
docker-compose exec dashboard npm test

# Interactive shell
docker-compose exec dashboard sh

# Execute specific command
docker-compose exec dashboard npx tsc --noEmit
```

### Worker

```bash
# Check health
docker-compose exec worker npm run admin:health

# List jobs
docker-compose exec worker npm run admin:list-jobs

# Queue audit job
docker-compose exec worker npm run admin:queue -- --project MyApp --type weekly_audit

# Queue repair job
docker-compose exec worker npm run admin:repair -- --finding-id F123 --project MyApp

# Interactive shell
docker-compose exec worker sh
```

### Database

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U lyra -d lyra

# Run SQL
docker-compose exec -T postgres psql -U lyra -d lyra << EOF
SELECT * FROM lyra_audit_jobs LIMIT 5;
EOF

# Backup database
docker-compose exec -T postgres pg_dump -U lyra lyra > backup.sql

# Restore database
docker-compose exec -T postgres psql -U lyra lyra < backup.sql
```

### Redis

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Check memory usage
docker-compose exec redis redis-cli INFO memory

# Flush queue (destructive)
docker-compose exec redis redis-cli FLUSHDB
```

---

## npm Scripts

### Dashboard

```bash
cd dashboard

# Run migrations
npm run migrate

# Build
npm run build

# Tests
npm test
npm run test:watch
npm run test:coverage

# Linting
npm run lint
npm run typecheck
```

### Worker

```bash
cd worker

# Build
npm run build

# Admin CLI (see next section)
npm run admin
npm run admin:health
npm run admin:queue -- --project X --type Y
npm run admin:repair -- --finding-id X --project Y
npm run admin:list-jobs
npm run admin:list-repairs
```

---

## Worker Admin CLI

### Overview

```bash
npx tsx src/scripts/admin.ts [command] [options]
```

Or use npm shortcuts:

```bash
npm run admin [command] [options]
```

### Commands

#### Health Check

```bash
npm run admin:health

# Output:
# ✓ Database connected
#   Current time: 2026-03-20T12:00:00.000Z
# ✓ Audit jobs:
#   queued: 5
#   running: 1
#   completed: 42
# ✓ Repair jobs:
#   queued: 2
#   completed: 15
```

#### Queue Audit Job

```bash
npm run admin:queue -- --project MyApp --type weekly_audit

# Options:
#   --project <name>   Project name (required)
#   --type <type>      Job type: weekly_audit, visual_audit, etc. (required)

# Output:
# ✓ Job queued:
#   ID: 550e8400-e29b-41d4-a716-446655440000
#   Project: MyApp
#   Type: weekly_audit
#   Created: 2026-03-20T12:00:00.000Z
```

#### Queue Repair Job

```bash
npm run admin:repair -- --finding-id F123 --project MyApp

# Options:
#   --finding-id <id>   Finding ID (required)
#   --project <name>    Project name (required)

# Output:
# ✓ Repair job queued:
#   ID: 660e8400-e29b-41d4-a716-446655440001
#   Finding: F123
#   Project: MyApp
#   Created: 2026-03-20T12:00:00.000Z
```

#### List Jobs

```bash
npm run admin:list-jobs

# Output:
# ✓ Recent audit jobs:
#   [queued  ] MyApp:weekly_audit (550e8400-e29b-41d4-a716-446655440000)
#   [completed] MyApp:visual_audit (550e8400-e29b-41d4-a716-446655440001)
```

#### List Repairs

```bash
npm run admin:list-repairs

# Output:
# ✓ Recent repair jobs:
#   [queued  ] MyApp/F123 (660e8400-e29b-41d4-a716-446655440001)
#   [applied ] MyApp/F456 (660e8400-e29b-41d4-a716-446655440002)
```

#### Clear Queue

```bash
npm run admin -- clear-queue --force

# ⚠ This is destructive - deletes all queued audit jobs
# Output:
# ✓ Deleted 5 queued jobs
```

---

## Database Migrations

### Running Migrations

Migrations run automatically when:
- Docker container starts: `docker-compose up`
- Manual run: `npm run migrate` or `make migrate`

### Creating New Migrations

1. Create file in `supabase/migrations/` with timestamp:
   ```
   supabase/migrations/20260320190000_add_new_table.sql
   ```

2. Write SQL:
   ```sql
   CREATE TABLE IF NOT EXISTS public.new_table (
     id UUID PRIMARY KEY,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. Run migrations:
   ```bash
   npm run migrate
   # or
   make migrate
   ```

### Migration Safety

- Migrations are idempotent (safe to run multiple times)
- Each migration runs in a transaction
- Failed migrations rollback automatically
- Executed migrations are tracked in `_migrations` table

---

## Common Workflows

### Local Development

```bash
# 1. One-time setup
make setup

# 2. Start services
make dev

# 3. In another terminal, queue test job
make queue-job PROJECT=MyApp TYPE=weekly_audit

# 4. Watch logs
make dev-logs

# 5. Stop services
make down
```

### Deploy New Code

```bash
# 1. Update code locally
git commit -am "Add new feature"
git push

# 2. Build images
make build

# 3. Stop old containers
make down

# 4. Update image tags
docker tag lyra-dashboard:latest myregistry/lyra-dashboard:v1.1.0
docker tag lyra-worker:latest myregistry/lyra-worker:v1.1.0

# 5. Push to registry
make push TAG=v1.1.0

# 6. Start new containers (migrations run automatically)
make up

# 7. Verify health
make health
```

### Add Database Schema

```bash
# 1. Create migration file
cat > supabase/migrations/20260320200000_add_feature.sql << 'EOF'
CREATE TABLE IF NOT EXISTS public.feature_table (
  id UUID PRIMARY KEY,
  data JSONB
);
EOF

# 2. Run migrations
make migrate

# 3. Verify
docker-compose exec postgres psql -U lyra -d lyra -c "SELECT * FROM feature_table;"
```

### Queue Repair Job

```bash
# 1. Find finding ID from dashboard or API
FINDING=F123

# 2. Queue repair
make repair-job FINDING=$FINDING PROJECT=MyApp

# 3. Watch worker logs
make dev-logs

# 4. Verify dashboard shows "fixed_pending_verify"
```

### Scale Worker

```bash
# 1. Stop current services
make down

# 2. Start with scaled worker
docker-compose up -d --scale worker=5

# 3. Check health
make health

# 4. Verify multiple workers in logs
docker-compose logs worker
```

---

## Troubleshooting

### Migrations fail on startup

```bash
# Check migration logs
docker-compose logs dashboard | grep migrate

# Run migrations directly
docker-compose exec dashboard npm run migrate

# Check migration table
docker-compose exec postgres psql -U lyra -d lyra -c "SELECT * FROM _migrations;"
```

### Worker not processing jobs

```bash
# Check health
make health

# List jobs
make list-jobs

# Check worker logs
docker-compose logs worker

# Verify Redis connection
docker-compose exec redis redis-cli ping
```

### Database connection issues

```bash
# Test connection
docker-compose exec postgres pg_isready -U lyra

# Connect directly
docker-compose exec postgres psql -U lyra -d lyra -c "SELECT NOW();"

# Check connection pool
docker-compose exec postgres psql -U lyra -d lyra -c "SELECT datname, usename, count(*) FROM pg_stat_activity GROUP BY datname, usename;"
```

### Can't access dashboard

```bash
# Check if container running
docker ps | grep lyra-dashboard

# Check logs
docker-compose logs dashboard

# Try direct request
curl -v http://localhost:3000/api/health

# Check port binding
docker port lyra-dashboard
```

---

## Environment Variables

All operations respect these environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db

# Redis
REDIS_URL=redis://redis:6379

# LLM
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY

# Routing
LYRA_AUDIT_MODEL=openai:mini
LYRA_ROUTING_STRATEGY=balanced

# Worker
LYRA_JOB_POLL_MS=5000
LYRA_REPO_ROOT=/workspace

# Dashboard
LYRA_DASHBOARD_URL=http://localhost:3000
LYRA_DASHBOARD_API_KEY=secret
```

Set in `.env` file or export before running:

```bash
export OPENAI_API_KEY=YOUR_OPENAI_API_KEY
make dev
```

---

## CI/CD Pipeline

### GitHub Actions

Lyra includes automated testing and deployment via GitHub Actions:

#### Continuous Integration (`.github/workflows/ci.yml`)

Runs automatically on:
- Every push to `main`
- Every pull request to `main`

Steps:
1. **Dashboard Tests** - lint, typecheck, unit tests, build
2. **Worker Build** - compile TypeScript, type check
3. **Docker Images** - build and push to registry

View runs at: `https://github.com/thepennylaneproject/lyra/actions`

#### Deployment (`.github/workflows/deploy.yml`)

Runs when you push a version tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Automatically:
1. Builds Docker images
2. Pushes to GitHub Container Registry
3. Creates release notes
4. Tags with version number

#### Local CI Simulation

Run the same checks locally before pushing:

```bash
# Dashboard
cd dashboard && npm run lint && npm run typecheck && npm run test && npm run build

# Worker
cd ../worker && npm run build && npx tsc --noEmit

# Or use convenience target
make lint
```

For details, see [CI/CD Documentation](./CI_CD.md)

---

## Next Steps

- [Set up CI/CD](./CI_CD_SETUP.md) - Enable branch protection and automated checks
- Set up monitoring to track job processing
- Create backup scripts for daily backups
- Set up alerting for failed repairs
- Implement job retry logic
- Create dashboards for operational metrics
