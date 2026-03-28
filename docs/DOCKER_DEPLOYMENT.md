# Docker Deployment Guide

## Overview

Lyra consists of multiple components, each containerized:

- **Dashboard** (Next.js) — Web UI and API
- **Worker** (Node.js) — Audit job processor
- **PostgreSQL** — Primary database (Supabase)
- **Redis** — Job queue and caching

This guide covers local development and production deployment.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+ (for local dev)
- 4GB RAM minimum (8GB recommended)

## Quick Start (Local Development)

### 1. Clone and Setup

```bash
git clone https://github.com/thepennylaneproject/Lyra.git
cd Lyra
```

### 2. Set Environment Variables

```bash
# Create .env file
cat > .env << 'EOF'
# LLM API Keys
OPENAI_API_KEY=YOUR_OPENAI_API_KEY           # Optional: for OpenAI models
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY    # Optional: for Anthropic models

# Worker Configuration
LYRA_AUDIT_MODEL=openai:mini    # Or: anthropic:haiku
LYRA_ROUTING_STRATEGY=balanced  # Or: aggressive, precision
EOF
```

### 3. Start All Services

```bash
# Build and start all services
docker-compose up

# Or run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### 4. Access Services

- **Dashboard**: http://localhost:3000
  - Login: Enter the secret key (default: `dev-secret-key-change-in-production`)
- **API**: http://localhost:3000/api/health
- **Database**: `postgresql://lyra:lyra-dev-password@localhost:5432/lyra`
- **Redis**: `redis://localhost:6379`

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer (optional)              │
└───────────────────────────┬─────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
    ┌───▼────┐          ┌───▼────┐         ┌───▼────┐
    │Dashboard│          │Dashboard│         │Dashboard│
    │ (N=3)  │          │ (N=3)  │         │ (N=3)  │
    └────┬────┘          └────┬────┘         └────┬────┘
         │                    │                   │
         └────────────────────┼───────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
          ┌───▼─────┐  ┌──────▼──────┐  ┌────▼─────┐
          │PostgreSQL│  │    Redis    │  │  Worker  │
          │          │  │   (queue)   │  │  (N=5)   │
          └──────────┘  └─────────────┘  └──────────┘
```

## Building Images

### Build Locally

```bash
# Build dashboard image
docker build -t lyra-dashboard:latest ./dashboard

# Build worker image
docker build -t lyra-worker:latest ./worker

# Or build both with compose
docker-compose build
```

### Build for Registry

```bash
# Tag for Docker Hub
docker tag lyra-dashboard:latest myregistry/lyra-dashboard:v1.0.0
docker tag lyra-worker:latest myregistry/lyra-worker:v1.0.0

# Push to registry
docker push myregistry/lyra-dashboard:v1.0.0
docker push myregistry/lyra-worker:v1.0.0
```

## Production Deployment

### On Kubernetes

Create `k8s/values.yaml`:

```yaml
dashboard:
  replicas: 3
  image: myregistry/lyra-dashboard:v1.0.0
  resources:
    requests:
      memory: 512Mi
      cpu: 250m
    limits:
      memory: 1Gi
      cpu: 500m

worker:
  replicas: 5
  image: myregistry/lyra-worker:v1.0.0
  resources:
    requests:
      memory: 256Mi
      cpu: 100m
    limits:
      memory: 512Mi
      cpu: 250m

database:
  host: postgres.default.svc.cluster.local
  port: 5432

redis:
  host: redis.default.svc.cluster.local
  port: 6379
```

Deploy with Helm:

```bash
helm install lyra ./helm-chart -f k8s/values.yaml
```

### On Docker Swarm

```bash
# Initialize swarm (if needed)
docker swarm init

# Create stack
docker stack deploy -c docker-compose.yml lyra

# Scale worker
docker service scale lyra_worker=5

# View status
docker service ls
docker service ps lyra_worker
```

### On Cloud VMs (EC2, GCP, etc)

```bash
# SSH into server
ssh ubuntu@instance-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Clone repository
git clone https://github.com/thepennylaneproject/Lyra.git
cd Lyra

# Set environment
export OPENAI_API_KEY=YOUR_OPENAI_API_KEY
export DASHBOARD_API_SECRET=your-secret-key
export DATABASE_URL=postgresql://user:pass@postgres.example.com/lyra
export REDIS_URL=redis://redis.example.com:6379

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f
```

## Environment Configuration

### Dashboard (.env)

```bash
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/lyra

# Redis (optional, falls back to DB)
REDIS_URL=redis://redis:6379

# Authentication
DASHBOARD_API_SECRET=your-secret-key-min-32-chars

# LLM Providers
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY

# Routing
LYRA_ROUTING_STRATEGY=balanced
LYRA_AUDIT_MODEL=openai:mini

# Sentry (error tracking)
SENTRY_DSN=https://...

# Deployment
NEXT_PUBLIC_DEPLOY_URL=https://lyra.example.com
```

### Worker (.env)

```bash
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/lyra

# Redis
REDIS_URL=redis://redis:6379

# Repository
LYRA_REPO_ROOT=/workspace

# Job Processing
LYRA_JOB_POLL_MS=5000
LYRA_MAX_FILES_PER_PASS=8

# LLM Providers
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY
LYRA_AUDIT_MODEL=openai:mini
LYRA_ROUTING_STRATEGY=balanced

# Dashboard Integration
LYRA_DASHBOARD_URL=http://dashboard:3000
LYRA_DASHBOARD_API_KEY=dev-secret-key

# Logging
DEBUG=lyra:*
```

## Scaling

### Scale Dashboard (Web servers)

```bash
# Docker Compose
docker-compose up -d --scale dashboard=3

# Docker Swarm
docker service scale lyra_dashboard=3

# Kubernetes
kubectl scale deployment lyra-dashboard --replicas=5
```

### Scale Worker (Job processors)

```bash
# Docker Compose
docker-compose up -d --scale worker=5

# Docker Swarm
docker service scale lyra_worker=5

# Kubernetes
kubectl scale deployment lyra-worker --replicas=10
```

## Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f worker
docker-compose logs -f dashboard

# Filter by time
docker-compose logs --since 10m
```

### Health Checks

```bash
# Dashboard health
curl http://localhost:3000/api/health

# Database connection
docker-compose exec postgres pg_isready -U lyra

# Redis connection
docker-compose exec redis redis-cli ping
```

### Resource Usage

```bash
# Docker stats
docker stats

# Compose specific services
docker-compose stats
```

## Troubleshooting

### Worker not processing jobs

```bash
# Check worker logs
docker-compose logs worker

# Verify Redis connection
docker-compose exec redis redis-cli ping

# Verify Database connection
docker-compose exec postgres psql -U lyra -d lyra -c "SELECT 1"
```

### Dashboard not accessible

```bash
# Check if container is running
docker ps | grep lyra-dashboard

# View startup logs
docker-compose logs dashboard

# Verify port mapping
docker port lyra-dashboard
```

### Out of memory

```bash
# Check memory usage
docker stats

# Update docker-compose limits
# Edit docker-compose.yml and add:
# deploy:
#   resources:
#     limits:
#       memory: 2G
```

### Database schema missing

```bash
# Run migrations manually
docker-compose exec dashboard npm run migrate

# Or check if migrations ran on startup
docker-compose logs dashboard | grep "migration"
```

## Performance Tuning

### Database Connection Pool

```bash
# Edit worker environment
PG_POOL_MAX=20  # Increase if many workers
```

### Redis Memory

```bash
# Adjust in docker-compose.yml
redis:
  command: redis-server --maxmemory 2gb --maxmemory-policy allkeys-lru
```

### Worker Concurrency

```bash
# Control job processing
LYRA_JOB_POLL_MS=2000        # Poll more frequently
LYRA_MAX_FILES_PER_PASS=16   # Process more files per run
```

## Backup & Recovery

### Backup Database

```bash
# Create backup
docker-compose exec postgres pg_dump -U lyra lyra > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U lyra lyra < backup.sql
```

### Backup Redis

```bash
# Copy Redis dump
docker cp lyra-redis:/data/dump.rdb ./redis-backup.rdb

# Restore Redis
docker cp ./redis-backup.rdb lyra-redis:/data/dump.rdb
```

## Security

### Production Security Checklist

- [ ] Change default passwords
- [ ] Use strong API secrets (min 32 chars)
- [ ] Enable HTTPS/TLS
- [ ] Use secrets manager for API keys
- [ ] Restrict database network access
- [ ] Enable PostgreSQL SSL
- [ ] Run containers as non-root
- [ ] Use read-only filesystems where possible
- [ ] Enable Docker content trust
- [ ] Regular security scanning

### Network Security

```bash
# Use internal network only (no external Redis)
networks:
  lyra-network:
    internal: true  # Prevent external access
```

## Cleanup

```bash
# Stop all services
docker-compose down

# Remove volumes (careful - deletes data!)
docker-compose down -v

# Remove images
docker rmi lyra-dashboard lyra-worker

# Prune unused resources
docker system prune -a
```

## Next Steps

1. Set up CI/CD pipeline to build/push images on commit
2. Add monitoring (Prometheus, Grafana)
3. Set up alerting (PagerDuty, OpsGenie)
4. Configure log aggregation (ELK, Datadog)
5. Implement database backups
6. Set up disaster recovery
