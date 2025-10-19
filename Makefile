.PHONY: help setup start stop restart logs build clean test validate

# Colors for output
GREEN  := \033[0;32m
YELLOW := \033[1;33m
RED    := \033[0;31m
NC     := \033[0m # No Color

##@ General

help: ## Display this help
	@echo "$(GREEN)VMS - Video Management System$(NC)"
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*##"; printf "\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(GREEN)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Setup

setup: ## Initial setup (copy .env, create directories, verify system)
	@echo "$(GREEN)Setting up VMS environment...$(NC)"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(YELLOW)Created .env file. Please edit with your values!$(NC)"; \
	else \
		echo "$(YELLOW).env already exists$(NC)"; \
	fi
	@mkdir -p data/recordings logs
	@touch data/recordings/.gitkeep
	@echo "$(GREEN)✓ Directories created$(NC)"
	@echo "$(YELLOW)Verifying system requirements...$(NC)"
	@command -v docker >/dev/null 2>&1 || { echo "$(RED)✗ Docker not found. Please install Docker first.$(NC)"; exit 1; }
	@docker compose version >/dev/null 2>&1 || { echo "$(RED)✗ Docker Compose not found.$(NC)"; exit 1; }
	@echo "$(GREEN)✓ Docker and Docker Compose installed$(NC)"
	@echo "$(GREEN)Setup complete! Run 'make start' to begin.$(NC)"

verify-qsv: ## Verify Intel QuickSync support
	@echo "$(YELLOW)Checking Intel QuickSync support...$(NC)"
	@command -v vainfo >/dev/null 2>&1 || { \
		echo "$(RED)vainfo not found. Installing...$(NC)"; \
		sudo apt-get update && sudo apt-get install -y vainfo intel-gpu-tools; \
	}
	@vainfo || echo "$(RED)QuickSync not available. Check BIOS settings or CPU model.$(NC)"

##@ Docker Operations

start: ## Start all services
	@echo "$(GREEN)Starting VMS services...$(NC)"
	@docker compose up -d
	@echo "$(GREEN)✓ Services started$(NC)"
	@make status

start-testing: ## Start services with RTSP simulator for testing
	@echo "$(GREEN)Starting VMS with test cameras...$(NC)"
	@docker compose --profile testing up -d
	@make status

stop: ## Stop all services
	@echo "$(YELLOW)Stopping VMS services...$(NC)"
	@docker compose down
	@echo "$(GREEN)✓ Services stopped$(NC)"

restart: ## Restart all services
	@echo "$(YELLOW)Restarting VMS services...$(NC)"
	@docker compose restart
	@echo "$(GREEN)✓ Services restarted$(NC)"

status: ## Show service status
	@echo "$(GREEN)Service Status:$(NC)"
	@docker compose ps

##@ Development

logs: ## Follow all logs
	@docker compose logs -f

logs-api: ## Follow API logs
	@docker compose logs -f api

logs-recorder: ## Follow recorder logs
	@docker compose logs -f recorder

logs-db: ## Follow database logs
	@docker compose logs -f postgres

shell-api: ## Open shell in API container
	@docker compose exec api sh

shell-recorder: ## Open shell in recorder container
	@docker compose exec recorder bash

shell-db: ## Open PostgreSQL shell
	@docker compose exec postgres psql -U vms_user -d vms

##@ Build

build: ## Build all services
	@echo "$(GREEN)Building VMS services...$(NC)"
	@docker compose build
	@echo "$(GREEN)✓ Build complete$(NC)"

build-no-cache: ## Build all services without cache
	@echo "$(GREEN)Building VMS services (no cache)...$(NC)"
	@docker compose build --no-cache
	@echo "$(GREEN)✓ Build complete$(NC)"

rebuild: ## Rebuild and restart services
	@make build
	@make restart

##@ Database

db-init: ## Initialize database (run migrations)
	@echo "$(GREEN)Initializing database...$(NC)"
	@docker compose exec postgres psql -U vms_user -d vms -f /docker-entrypoint-initdb.d/init.sql
	@echo "$(GREEN)✓ Database initialized$(NC)"

db-reset: ## Reset database (WARNING: deletes all data)
	@echo "$(RED)WARNING: This will delete all data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose down -v; \
		docker compose up -d postgres; \
		sleep 5; \
		make db-init; \
	fi

db-backup: ## Backup database
	@echo "$(GREEN)Backing up database...$(NC)"
	@mkdir -p backups
	@docker compose exec postgres pg_dump -U vms_user vms > backups/vms_backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✓ Backup saved to backups/$(NC)"

db-restore: ## Restore database from backup (set BACKUP_FILE=path)
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "$(RED)Please specify BACKUP_FILE=path$(NC)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)Restoring from $(BACKUP_FILE)...$(NC)"
	@docker compose exec -T postgres psql -U vms_user -d vms < $(BACKUP_FILE)
	@echo "$(GREEN)✓ Database restored$(NC)"

##@ Testing

test: ## Run tests
	@echo "$(GREEN)Running tests...$(NC)"
	@docker compose exec api npm test
	@echo "$(GREEN)✓ Tests complete$(NC)"

test-coverage: ## Run tests with coverage
	@docker compose exec api npm run test:cov

##@ Monitoring

stats: ## Show Docker resource usage
	@docker stats --no-stream

health: ## Check service health
	@echo "$(GREEN)Service Health:$(NC)"
	@curl -s http://localhost:3000/health | jq . || echo "$(RED)API not responding$(NC)"
	@docker compose ps

watch: ## Watch service logs in real-time
	@watch -n 2 'docker compose ps; echo; docker stats --no-stream'

##@ Cleanup

clean: ## Remove stopped containers and unused images
	@echo "$(YELLOW)Cleaning up Docker resources...$(NC)"
	@docker compose down
	@docker system prune -f
	@echo "$(GREEN)✓ Cleanup complete$(NC)"

clean-all: ## Remove all containers, volumes, and images (WARNING: deletes data)
	@echo "$(RED)WARNING: This will delete all data and images!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose down -v; \
		docker system prune -af; \
		rm -rf data/recordings/*; \
		echo "$(GREEN)✓ Complete cleanup done$(NC)"; \
	fi

clean-logs: ## Clear log files
	@echo "$(YELLOW)Clearing logs...$(NC)"
	@rm -rf logs/*.log
	@echo "$(GREEN)✓ Logs cleared$(NC)"

clean-recordings: ## Delete all recordings (WARNING: deletes video data)
	@echo "$(RED)WARNING: This will delete all recordings!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		rm -rf data/recordings/*; \
		touch data/recordings/.gitkeep; \
		echo "$(GREEN)✓ Recordings deleted$(NC)"; \
	fi

##@ Production

prod-build: ## Build production images
	@echo "$(GREEN)Building production images...$(NC)"
	@NODE_ENV=production BUILD_TARGET=production docker compose build --no-cache
	@echo "$(GREEN)✓ Production build complete$(NC)"

prod-start: ## Start production stack
	@echo "$(GREEN)Starting production stack...$(NC)"
	@docker compose up -d --remove-orphans
	@echo "$(GREEN)✓ Production services started$(NC)"
	@make status

##@ Information

version: ## Show versions
	@echo "$(GREEN)VMS Version Information:$(NC)"
	@echo "Docker: $$(docker --version)"
	@echo "Docker Compose: $$(docker compose version)"
	@echo "Node: $$(docker compose exec api node --version 2>/dev/null || echo 'Not running')"
	@echo "PostgreSQL: $$(docker compose exec postgres psql --version 2>/dev/null || echo 'Not running')"

info: ## Show system information
	@echo "$(GREEN)System Information:$(NC)"
	@echo "CPU: $$(lscpu | grep 'Model name' | cut -d ':' -f 2 | xargs)"
	@echo "Cores: $$(nproc)"
	@echo "RAM: $$(free -h | awk '/^Mem:/ {print $$2}')"
	@echo "Disk: $$(df -h /home | awk 'NR==2 {print $$4 " available"}')"
	@echo ""
	@echo "$(GREEN)QuickSync Support:$(NC)"
	@lspci | grep -i vga || echo "No GPU info"

ports: ## Show exposed ports
	@echo "$(GREEN)Service Endpoints:$(NC)"
	@echo "API:       http://localhost:3000"
	@echo "Frontend:  http://localhost:8080"
	@echo "Database:  localhost:5432"
	@echo "Redis:     localhost:6379"
	@echo "RTSP Sim:  rtsp://localhost:8554 (testing profile)"

##@ Quick Actions

dev: setup start logs ## Setup and start development environment with logs

quick-test: start-testing ## Quick start with test cameras
	@echo "$(GREEN)Test environment ready!$(NC)"
	@echo "$(YELLOW)RTSP streams available at:$(NC)"
	@echo "  rtsp://localhost:8554/stream1"
	@echo "  rtsp://localhost:8554/stream2"
	@make ports

full-restart: stop clean build start ## Complete restart (stop, clean, rebuild, start)
	@echo "$(GREEN)✓ Full restart complete$(NC)"

.DEFAULT_GOAL := help
