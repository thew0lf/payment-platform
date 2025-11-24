.PHONY: help setup start stop restart logs clean test lint format db-migrate db-seed

help: ## Show this help message
	@echo "Payment Platform Development Commands:"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Setup Commands
setup: ## Initial project setup
	@echo "🚀 Setting up Payment Platform..."
	@docker-compose up -d postgres redis
	@echo "⏳ Waiting for databases to be ready..."
	@sleep 10
	@echo "✅ Setup complete!"
	@echo ""
	@echo "🌐 Services will be available at:"
	@echo "   - API: http://localhost:3001"
	@echo "   - Admin Dashboard: http://localhost:3002"
	@echo "   - Company Portal: http://localhost:3003"
	@echo "   - PgAdmin: http://localhost:5050"
	@echo "   - Redis Commander: http://localhost:8081"

##@ Development Commands
start: ## Start all services
	@docker-compose up -d
	@echo "✅ All services started"

stop: ## Stop all services
	@docker-compose down
	@echo "✅ All services stopped"

restart: ## Restart all services
	@docker-compose down
	@docker-compose up -d
	@echo "✅ All services restarted"

logs: ## Follow logs for all services
	@docker-compose logs -f

logs-api: ## Follow API logs only
	@docker-compose logs -f api

status: ## Show service status
	@echo "📊 Service Status:"
	@docker-compose ps

##@ Database Commands
db-setup: ## Setup database (when API is ready)
	@echo "🗄️  Setting up database..."
	@echo "Note: Run this after API service is built"

clean: ## Clean up containers and volumes
	@docker-compose down -v
	@docker system prune -f
	@echo "✅ Cleaned up containers and volumes"
