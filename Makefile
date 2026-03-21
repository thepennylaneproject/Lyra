.PHONY: help setup dev up down migrate logs health queue-job repair-job clear-queue list-jobs list-repairs worker-admin dashboard-setup

# Default target
help:
	@echo "Lyra Development & Operations Makefile"
	@echo ""
	@echo "Development:"
	@echo "  make setup              Setup local environment (install deps, migrate)"
	@echo "  make dev                Start all services with docker-compose"
	@echo "  make dev-logs           View logs from all services"
	@echo ""
	@echo "Database Operations:"
	@echo "  make migrate            Run pending database migrations"
	@echo "  make dashboard-setup    Install deps and run migrations for dashboard"
	@echo ""
	@echo "Worker Admin Commands:"
	@echo "  make health             Check worker and database health"
	@echo "  make queue-job          Queue an audit job (pass PROJECT=X TYPE=Y)"
	@echo "  make repair-job         Queue a repair job (pass FINDING=X PROJECT=Y)"
	@echo "  make list-jobs          List recent audit jobs"
	@echo "  make list-repairs       List recent repair jobs"
	@echo "  make clear-queue        Clear all queued audit jobs (CONFIRM=yes)"
	@echo ""
	@echo "Docker:"
	@echo "  make build              Build all Docker images"
	@echo "  make push               Push images to registry (TAG=v1.0.0)"
	@echo "  make up                 Start containers"
	@echo "  make down               Stop containers"
	@echo "  make down-hard          Stop and remove all volumes"
	@echo ""
	@echo "Examples:"
	@echo "  make setup              # First time setup"
	@echo "  make dev                # Start local development"
	@echo "  make queue-job PROJECT=MyApp TYPE=weekly_audit"
	@echo "  make repair-job FINDING=F123 PROJECT=MyApp"
	@echo "  make push TAG=v1.0.0    # Push to registry"

# === Development ===

setup:
	@echo "Setting up Lyra development environment..."
	@echo "Step 1: Installing dependencies..."
	cd dashboard && npm ci
	cd ../worker && npm ci
	@echo "Step 2: Building applications..."
	cd ../dashboard && npm run build
	cd ../worker && npm run build
	@echo "Step 3: Running migrations..."
	cd ../dashboard && npm run migrate
	@echo "✓ Setup complete!"
	@echo ""
	@echo "Next: run 'make dev' to start services"

dev:
	@echo "Starting Lyra development stack..."
	docker-compose up

dev-logs:
	@echo "Following logs from all services (Ctrl+C to stop)..."
	docker-compose logs -f

# === Database Operations ===

migrate:
	@echo "Running database migrations..."
	cd dashboard && npm run migrate

dashboard-setup: migrate
	@echo "Dashboard setup complete (migrations ran)"

# === Worker Admin Commands ===

health:
	@echo "Checking system health..."
	cd worker && npm run admin:health

queue-job:
	@if [ -z "$(PROJECT)" ] || [ -z "$(TYPE)" ]; then \
		echo "Usage: make queue-job PROJECT=<name> TYPE=<type>"; \
		echo ""; \
		echo "Examples:"; \
		echo "  make queue-job PROJECT=MyApp TYPE=weekly_audit"; \
		echo "  make queue-job PROJECT=MyApp TYPE=visual_audit"; \
		exit 1; \
	fi
	@echo "Queueing audit job for $(PROJECT) (type: $(TYPE))..."
	cd worker && npm run admin:queue -- --project $(PROJECT) --type $(TYPE)

repair-job:
	@if [ -z "$(FINDING)" ] || [ -z "$(PROJECT)" ]; then \
		echo "Usage: make repair-job FINDING=<id> PROJECT=<name>"; \
		echo ""; \
		echo "Example:"; \
		echo "  make repair-job FINDING=F123 PROJECT=MyApp"; \
		exit 1; \
	fi
	@echo "Queueing repair job for $(PROJECT)/$(FINDING)..."
	cd worker && npm run admin:repair -- --finding-id $(FINDING) --project $(PROJECT)

list-jobs:
	@echo "Listing recent audit jobs..."
	cd worker && npm run admin:list-jobs

list-repairs:
	@echo "Listing recent repair jobs..."
	cd worker && npm run admin:list-repairs

clear-queue:
	@if [ "$(CONFIRM)" != "yes" ]; then \
		echo "⚠ This will delete all queued audit jobs."; \
		echo "Usage: make clear-queue CONFIRM=yes"; \
		exit 1; \
	fi
	@echo "Clearing all queued audit jobs..."
	cd worker && npm run admin -- clear-queue --force

# === Docker Operations ===

build:
	@echo "Building Docker images..."
	docker-compose build

push:
	@if [ -z "$(TAG)" ]; then \
		echo "Usage: make push TAG=v1.0.0"; \
		exit 1; \
	fi
	@echo "Tagging images as $(TAG)..."
	docker tag lyra-dashboard:latest myregistry/lyra-dashboard:$(TAG)
	docker tag lyra-worker:latest myregistry/lyra-worker:$(TAG)
	@echo "Pushing to registry..."
	docker push myregistry/lyra-dashboard:$(TAG)
	docker push myregistry/lyra-worker:$(TAG)
	@echo "✓ Pushed $(TAG)"

up:
	@echo "Starting containers..."
	docker-compose up -d
	@echo "✓ Services started"
	@echo ""
	@echo "Access dashboard: http://localhost:3000"
	@echo "API health: curl http://localhost:3000/api/health"

down:
	@echo "Stopping containers..."
	docker-compose down

down-hard:
	@echo "⚠ Stopping containers and removing all volumes..."
	docker-compose down -v
	@echo "✓ Cleaned up"

# === Convenience Targets ===

.PHONY: install
install: setup

.PHONY: start
start: dev

.PHONY: stop
stop: down

.PHONY: restart
restart: down up

.PHONY: test
test:
	cd dashboard && npm test

.PHONY: lint
lint:
	cd dashboard && npm run lint
	cd ../worker && npm run build

.PHONY: clean
clean:
	rm -rf dashboard/dist dashboard/.next
	rm -rf worker/dist
	rm -rf node_modules dashboard/node_modules worker/node_modules
	@echo "✓ Cleaned build artifacts"
