# Lyra CI/CD Pipeline

## Overview

Lyra uses GitHub Actions for continuous integration and deployment. The pipeline automates testing, linting, Docker image building, and release management.

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

Runs on every push to `main` and on all pull requests.

#### Jobs

**test-dashboard**
- Installs dependencies
- Runs database migrations against test PostgreSQL
- Lint check (ESLint)
- Type check (TypeScript)
- Unit tests (Vitest)
- Production build

Services:
- PostgreSQL 16 (database)
- Redis 7 (cache)

**test-worker**
- Installs dependencies
- TypeScript compilation
- Type check

Services:
- PostgreSQL 16 (for service tests if needed)
- Redis 7 (for job queue tests)

**build-images** (runs after tests pass)
- Builds Docker images for dashboard and worker
- Pushes to GitHub Container Registry (ghcr.io) on main branch
- Uses Docker Buildx for multi-platform support
- Tags with:
  - `main` (latest on main branch)
  - `sha-{commit}` (commit SHA)
  - Branch name (for feature branches)

#### Running Locally

To simulate CI locally:

```bash
# Dashboard tests
cd dashboard
npm ci
npm run migrate  # requires DATABASE_URL pointing to test DB
npm run lint
npm run typecheck
npm run test

# Worker tests
cd ../worker
npm ci
npm run build
npx tsc --noEmit
```

### 2. Deploy Workflow (`.github/workflows/deploy.yml`)

Runs when you push a git tag matching `v*` (e.g., `v1.0.0`).

#### Jobs

**build-and-push**
- Builds Docker images for both dashboard and worker
- Pushes to GitHub Container Registry with version tag
- Creates GitHub release with deployment notes

**notify-deployment**
- Logs successful deployment

#### Pushing a Release

```bash
# Create a version tag
git tag v1.0.0

# Push to trigger deployment
git push origin v1.0.0
```

This automatically:
1. Builds and pushes Docker images
2. Tags them with version number
3. Creates a GitHub release with instructions

#### Image Registry

Images are pushed to GitHub Container Registry:

```
ghcr.io/thepennylaneproject/lyra-dashboard:v1.0.0
ghcr.io/thepennylaneproject/lyra-worker:v1.0.0
```

Pull images with:

```bash
docker pull ghcr.io/thepennylaneproject/lyra-dashboard:v1.0.0
docker pull ghcr.io/thepennylaneproject/lyra-worker:v1.0.0
```

## Local Development

### Before Committing

Run the same checks as CI:

```bash
# 1. Dashboard
cd dashboard
npm run lint
npm run typecheck
npm run test

# 2. Worker
cd ../worker
npm run build
npx tsc --noEmit

# 3. Overall
make lint  # runs both dashboard lint + worker build
```

### Debugging CI Failures

Common issues:

**Tests failing locally but passing in CI**
- Ensure you're using Node 20.x
- Check DATABASE_URL points to running PostgreSQL
- Verify Redis is running for queue tests

**Docker build fails**
- Check Dockerfile syntax: `docker build .`
- Verify all required files exist
- Test with `make build` locally

**Registry push fails**
- Verify GitHub token permissions (needs `packages: write`)
- Check repository settings allow container registry

## Secrets and Configuration

### Required Secrets

None required for basic CI! GitHub provides:
- `GITHUB_TOKEN` - automatically available, scoped to repo
- `secrets.GITHUB_TOKEN` - for pushing to container registry

### Optional Configuration

To use external registries (Docker Hub, ECR, etc.):

1. Add secrets to GitHub:
   - `REGISTRY_USERNAME`
   - `REGISTRY_PASSWORD`

2. Update workflows:
   ```yaml
   - uses: docker/login-action@v3
     with:
       username: ${{ secrets.REGISTRY_USERNAME }}
       password: ${{ secrets.REGISTRY_PASSWORD }}
   ```

## Database Testing in CI

Migrations run against a test PostgreSQL instance:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: lyra
      POSTGRES_PASSWORD: lyra-test
      POSTGRES_DB: lyra_test
```

Environment:
- User: `lyra`
- Password: `lyra-test`
- Database: `lyra_test`
- Host: `localhost:5432`

## Caching

CI uses GitHub Actions cache for faster builds:

- Node modules are cached per branch
- Docker layers are cached using buildx
- Cache is cleared on dependency file changes

## Performance

### Typical CI Times

- Dashboard tests: ~1-2 minutes
- Worker build: ~30-60 seconds
- Docker build: ~2-3 minutes
- Total: ~4-6 minutes

### Optimization

To speed up CI:

1. **Parallel jobs**: Dashboard and worker tests run simultaneously
2. **Incremental builds**: TypeScript incremental mode, Docker layer caching
3. **Dependency caching**: npm ci uses package-lock.json

## Troubleshooting

### Workflow not triggering

```bash
# Ensure tag matches pattern
git tag v1.0.0  # ✓ Matches v*
git tag version-1.0.0  # ✗ Doesn't match
```

### Docker images not pushing

1. Check permissions:
   ```bash
   gh api user/repos -q '.[] | select(.name == "lyra") | .permissions'
   ```

2. Verify token has `packages: write` scope

3. Check workflow logs for auth errors

### Tests failing in CI but passing locally

1. Check Node version:
   ```bash
   node --version  # Should be 20.x
   ```

2. Verify database connection in tests
3. Check for timezone or time-dependent tests

### Out of disk space

Docker can consume disk space. To clean up:

```bash
docker system prune -a  # Remove unused images, containers, networks
docker buildx du  # Show buildx cache usage
```

## Next Steps

- [Add monitoring and alerting](./MONITORING.md)
- [Deploy to Kubernetes](./KUBERNETES.md)
- [Set up status checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)

## References

- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [Metadata Action](https://github.com/docker/metadata-action)
