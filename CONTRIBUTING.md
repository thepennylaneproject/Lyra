# Contributing to Lyra

Thank you for your interest in contributing to Lyra! This guide will help you get started.

## Quick Start

### 1. Setup Local Development

```bash
# Install dependencies and run migrations
make setup

# Start development environment
make dev

# In another terminal, watch logs
make dev-logs
```

### 2. Make Your Changes

```bash
cd dashboard  # or worker/
# Make changes to code
```

### 3. Run Checks Locally

Before pushing, run the same checks as CI:

```bash
# Dashboard
cd dashboard
npm run lint        # ESLint
npm run typecheck   # TypeScript compiler
npm run test        # Vitest

# Worker
cd ../worker
npm run build       # TypeScript build
npx tsc --noEmit    # Type check

# Or use Makefile shortcut
make lint
```

### 4. Commit and Push

```bash
git add .
git commit -m "feat: describe your change"
git push origin your-branch
```

Your PR will automatically run CI checks. All checks must pass before merging.

## Development Workflow

### Local Commands

```bash
# Start everything
make dev

# Run migrations
make migrate

# Test admin commands
make health
make queue-job PROJECT=MyApp TYPE=weekly_audit

# Build Docker images
make build

# View help
make help
```

### Project Structure

```
lyra/
├── dashboard/          # Next.js web interface
│   ├── app/           # API routes and pages
│   ├── components/    # React components
│   ├── lib/           # Utilities and business logic
│   └── scripts/       # One-off scripts (migrations)
├── worker/            # Job processor
│   ├── src/           # TypeScript source
│   ├── src/providers/ # LLM provider implementations
│   └── src/scripts/   # Admin CLI
├── repair_engine/     # Python repair orchestrator
├── docker-compose.yml # Local dev environment
└── Makefile           # Convenience commands
```

## Code Standards

### TypeScript

- Use `npm run typecheck` to check types
- Enable strict mode in `tsconfig.json`
- Write tests for new functionality

### Testing

- Dashboard uses Vitest
- Run tests: `npm test` or `npm run test:watch`
- Aim for reasonable coverage (no strict requirement)

### Formatting

- Run `npm run lint` to check ESLint rules
- Fix issues: `npm run lint -- --fix`

### Commits

- Use conventional commits: `feat:`, `fix:`, `docs:`, etc.
- Reference issues: `fixes #123`
- Keep commits atomic (one change per commit)

## Before Opening a PR

1. **Sync with main**:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run full test suite**:
   ```bash
   make lint
   npm test (in dashboard/)
   make build (in worker/)
   ```

3. **Test in Docker**:
   ```bash
   make down
   make build
   make up
   # Test manually or run integration tests
   ```

4. **Check git diff**:
   ```bash
   git diff origin/main
   ```

## CI/CD Process

When you push, GitHub Actions automatically:

1. Tests dashboard (lint, type check, unit tests)
2. Builds worker (compile, type check)
3. Builds Docker images
4. Uploads to registry

All checks must pass. View status at:
- GitHub UI: **Actions** tab
- Command line: `gh run list`

## Releases

To create a release:

1. Verify all tests pass
2. Create a version tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. GitHub Actions will:
   - Build Docker images
   - Push to container registry
   - Create release notes
   - Tag images with version

Pull the images:
```bash
docker pull ghcr.io/thepennylaneproject/lyra-dashboard:v1.0.0
docker pull ghcr.io/thepennylaneproject/lyra-worker:v1.0.0
```

## Common Tasks

### Add a Database Migration

1. Create file in `supabase/migrations/`:
   ```bash
   touch supabase/migrations/20260320120000_add_feature.sql
   ```

2. Write SQL:
   ```sql
   CREATE TABLE IF NOT EXISTS feature (
     id UUID PRIMARY KEY,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. Run migrations:
   ```bash
   make migrate
   ```

### Add Tests

**Dashboard tests** (`dashboard/lib/__tests__/`):
```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "../my-module";

describe("myFunction", () => {
  it("should do something", () => {
    expect(myFunction(1)).toBe(2);
  });
});
```

Run with:
```bash
npm test
npm run test:watch  # Watch mode
npm run test:coverage  # Coverage report
```

### Debug Failing Tests

```bash
# Watch mode for faster feedback
npm run test:watch

# Coverage report
npm run test:coverage

# Debug specific test
npm test -- --reporter=verbose my-test-name
```

### Update Dependencies

```bash
cd dashboard
npm update  # Updates package.json
npm ci      # Install locked versions

# Check for outdated packages
npm outdated
```

## Troubleshooting

### Port Already in Use

```bash
# Find process on port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port
PORT=3001 make dev
```

### Database Connection Error

```bash
# Check Docker services
docker ps

# Verify database
docker-compose exec postgres pg_isready -U lyra

# Reset database
make down-hard
make dev
```

### Tests Failing Locally

```bash
# Ensure test database is running
docker-compose up -d postgres

# Check migration ran
docker-compose exec postgres psql -U lyra -d lyra_test -c "\dt"

# Run migrations
make migrate
```

### Docker Build Fails

```bash
# Check for syntax errors
docker build ./dashboard

# View detailed logs
docker-compose build --no-cache

# Check dockerfile
cat dashboard/Dockerfile
```

## Getting Help

- **Documentation**: Read `docs/` directory
- **GitHub Issues**: Check existing issues or create new one
- **Discussions**: Use GitHub Discussions for questions

## Code of Conduct

Be respectful and constructive. We welcome all skill levels!

## Resources

- [Operations Guide](./docs/OPERATIONS.md) - Running commands
- [CI/CD Documentation](./docs/CI_CD.md) - How pipelines work
- [Docker Deployment](./docs/DOCKER_DEPLOYMENT.md) - Container setup
- [Testing Guide](./docs/TESTING.md) - Test infrastructure
