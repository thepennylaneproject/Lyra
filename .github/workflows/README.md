# GitHub Actions Workflows

This directory contains Lyra's automated CI/CD pipelines.

## Files

### `ci.yml` - Continuous Integration
- **Trigger**: Push to `main`, all pull requests to `main`
- **Jobs**:
  - `test-dashboard` - Lint, type check, test, build dashboard
  - `test-worker` - Build worker, type check
  - `build-images` - Build and push Docker images (requires tests to pass)
- **Duration**: ~4-6 minutes
- **Services**: PostgreSQL 16, Redis 7 (test databases)

### `deploy.yml` - Release Deployment
- **Trigger**: Version tags (`v*`, e.g. `v1.0.0`)
- **Jobs**:
  - `build-and-push` - Build images, push to ghcr.io, create release
  - `notify-deployment` - Log deployment completion
- **Duration**: ~3-5 minutes

## Quick Reference

### View Workflow Runs

```bash
# List recent runs
gh run list --repo thepennylaneproject/lyra

# Watch specific run
gh run watch <RUN_ID>
```

### Trigger Workflows

**CI** - Automatic on push/PR, no action needed

**Deploy** - Manual trigger via tag:
```bash
git tag v1.0.0
git push origin v1.0.0
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Push to main / Pull Request                                 │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
    ┌──────────────────┐
    │  test-dashboard  │
    │ (lint, test,     │
    │  typecheck,      │  ~1-2 min
    │  build)          │
    └──────────────────┘
          │
          ├─────────────────────┐
          │                     │
          ▼                     ▼
    ┌───────────────┐    ┌────────────────┐
    │ test-worker   │    │ (parallel)     │
    │ (build,       │    │                │
    │  typecheck)   │    │                │
    └───────────────┘    └────────────────┘
          │
          ├─────────────────┐
          │                 │
          ▼                 ▼
     (after tests pass)
    ┌─────────────────────────────────────┐
    │      build-images                   │
    │  (Docker build & push)              │
    │  (~2-3 min)                         │
    └─────────────────────────────────────┘
```

## Secrets and Configuration

### Automatically Provided

- `GITHUB_TOKEN` - Scoped to repository, used for:
  - Pushing to GitHub Container Registry
  - Creating releases
  - No additional setup needed

### Optional

For external registries:
- `REGISTRY_USERNAME` - Docker Hub or other registry username
- `REGISTRY_PASSWORD` - Docker Hub or other registry password

For LLM API testing:
- `OPENAI_API_KEY` - Used in tests if present
- `ANTHROPIC_API_KEY` - Used in tests if present

## Debugging Failed Workflows

### View Logs

```bash
# Interactive log viewer
gh run view <RUN_ID> --log

# Or navigate to Actions tab in GitHub UI
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Tests fail on CI but pass locally | Check Node 20.x, ensure test DB is running |
| Docker build times out | Increase timeout or optimize Dockerfile |
| Package cache misses | Commit package-lock.json to git |
| Registry auth fails | Verify GITHUB_TOKEN has `packages: write` scope |

### Run Locally

```bash
# Simulate CI environment
docker-compose up -d

# Run tests
make test

# Build Docker images
make build
```

## Performance

### Current Metrics

- Dashboard tests: ~1-2 min
- Worker build: ~30-60 sec
- Docker build: ~2-3 min (first run), ~1 min (cached)
- Total: ~4-6 min

### Optimization Tips

1. **Cache Docker layers** - Already enabled via buildx cache-from/cache-to
2. **Parallel jobs** - Dashboard and worker tests run simultaneously
3. **Dependency caching** - npm cache via `actions/setup-node`

## Best Practices

1. **Commit frequently** - Smaller commits are easier to debug
2. **Run checks locally before push** - `make lint && make test`
3. **Write descriptive commit messages** - Helps with bisecting failures
4. **Keep workflows DRY** - Use shared steps/actions where possible
5. **Monitor workflow minutes** - GitHub includes 2000 free per month

## Maintenance

### Monthly Review

- Check for action deprecation warnings in workflow logs
- Review failed runs for patterns
- Update Node version if needed (currently 20.x)
- Monitor storage usage (docker images)

### Updates

```bash
# Update action versions
# Check: https://github.com/actions/setup-node/releases
# Update workflow YAML with newer versions

# Example:
# - uses: actions/setup-node@v4  # v4.1.0 is latest
#   with:
#     node-version: 20.x
```

## References

- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Workflow Syntax](https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions)
- [Environment Variables](https://docs.github.com/actions/learn-github-actions/environment-variables)
- [Contexts](https://docs.github.com/actions/learn-github-actions/contexts)
