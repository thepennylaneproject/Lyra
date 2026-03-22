# Setting Up CI/CD

This guide walks through enabling GitHub Actions CI/CD for Lyra.

## Quick Start

### 1. Verify Workflows Are Present

Your repository should have:
```
.github/workflows/
├── ci.yml        # Runs on push/PR
└── deploy.yml    # Runs on version tags
```

Workflows are automatically detected and enabled when pushed to your repository.

### 2. Trigger Your First CI Run

Push a commit to trigger the CI workflow:

```bash
git add .
git commit -m "feat: enable CI/CD pipeline"
git push origin main
```

Visit your GitHub repository → Actions tab to watch the workflow run.

### 3. Monitor First Run

Expected timeline:
- **Dashboard tests**: ~1-2 min (dependencies, lint, typecheck, test, build)
- **Worker build**: ~30-60 sec (dependencies, build, typecheck)
- **Docker build**: ~2-3 min (multi-stage builds with caching)

Total: ~4-6 minutes

If any step fails, click the job to view logs and diagnose.

## Configuring Branch Protection

To enforce CI passing before merge:

### GitHub Web UI

1. Go to **Settings** → **Branches**
2. Click **Add rule** under "Branch protection rules"
3. Set **Branch name pattern**: `main`
4. Enable:
   - ✓ Require a pull request before merging
   - ✓ Require status checks to pass before merging
5. Select required status checks:
   - ✓ test-dashboard
   - ✓ test-worker
   - ✓ build-images (optional - slow)
6. Click **Create**

### Via GitHub CLI

```bash
gh repo rule create \
  --allow-force-push false \
  --allow-deletions false \
  --require-signed-commits false \
  --required-approving-review-count 0
```

## Environment Setup

### Container Registry Access

CI pushes images to GitHub Container Registry automatically. No additional configuration needed!

To pull images locally, authenticate:

```bash
# Create personal access token with packages:read scope
# at github.com/settings/tokens/new

echo $YOUR_TOKEN | docker login ghcr.io -u YOUR_USERNAME --password-stdin
```

### API Keys for Tests

If your tests require API keys (OpenAI, Anthropic, etc.):

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add secrets:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - etc.

4. Reference in workflows:
   ```yaml
   env:
     OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
   ```

### Dashboard production (Netlify / hosting)

- **Required for public deploys:** Set **`DASHBOARD_API_SECRET`** or **`ORCHESTRATION_ENQUEUE_SECRET`** on the host. Without it, a production build responds with **503** on dashboard APIs (fail closed) except **`GET /api/health`**.
- **Staging / E2E only:** Set **`LYRA_ALLOW_OPEN_API=true`** if you intentionally need the legacy “open API without a secret” behavior under `NODE_ENV=production`.

## Workflow Triggers

### Continuous Integration (`.github/workflows/ci.yml`)

Automatically runs:
- On every push to `main`
- On every pull request to `main`

No configuration needed.

### Deployment (`.github/workflows/deploy.yml`)

Manually trigger by creating version tags:

```bash
# Create and push a tag
git tag v1.0.0
git push origin v1.0.0

# Or from GitHub UI:
# Releases → Draft a new release → Publish
```

This:
1. Builds Docker images
2. Pushes to registry with version tag
3. Creates GitHub release with instructions

## Monitoring and Debugging

### View Workflow Runs

```bash
# List recent runs
gh run list --repo thepennylaneproject/lyra

# View specific run
gh run view <RUN_ID>

# Watch logs
gh run watch <RUN_ID>
```

### Common Issues

**Workflow not showing up**
- Push to `main` or create a PR
- Check `.github/workflows/` directory exists
- Verify YAML syntax (use `yamllint` locally)

**Tests failing on CI but passing locally**
```bash
# Run exact CI environment locally
docker-compose up -d

# Then test
make test
```

**Docker builds timeout**
- Increase runner timeout (default 360 min)
- Or split jobs into separate workflows

**Out of disk space**
- GitHub provides 14GB per job
- Clean up large files or use Docker layer caching

## Best Practices

### Keep CI Fast

1. **Run tests in parallel** (already done):
   - Dashboard and worker tests run simultaneously
   - Saves ~1-2 minutes per run

2. **Cache dependencies**:
   ```yaml
   cache: npm
   cache-dependency-path: dashboard/package-lock.json
   ```

3. **Use Matrix for multiple versions** (Node 20.x only for now):
   ```yaml
   strategy:
     matrix:
       node-version: [20.x]  # Add 22.x if needed
   ```

### Commit Best Practices

1. **Write clear commit messages** - helps with debugging
2. **Test locally before pushing**:
   ```bash
   make lint
   make test
   ```
3. **Keep commits small** - easier to bisect if CI fails

### Workflow Maintenance

1. **Update actions regularly**:
   ```bash
   # Check for updates
   gh run list --repo thepennylaneproject/lyra
   ```

2. **Review workflow logs monthly** for deprecation warnings

3. **Monitor workflow minutes** (GitHub provides 2000/month free):
   ```bash
   gh api user/packages --jq '.[] | .storage_used_bytes'
   ```

## Advanced: Custom Workflows

### Run tests on schedule

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2am UTC
```

### Run tests only for specific paths

```yaml
on:
  push:
    paths:
      - 'dashboard/**'
      - '.github/workflows/ci.yml'
```

### Matrix testing (multiple Node versions)

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 22.x]
```

## Next Steps

- [Operations Guide](./OPERATIONS.md) - Running commands locally
- [Docker Deployment](./DOCKER_DEPLOYMENT.md) - Deploying containers
- [Monitoring Setup](./MONITORING.md) - Setting up alerts

## References

- [GitHub Actions Docs](https://docs.github.com/actions)
- [GitHub Status Checks](https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
