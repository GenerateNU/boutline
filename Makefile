FRONTEND := frontend
BACKEND := backend
BE := $(MAKE) --no-print-directory -C $(BACKEND)

ifeq ($(shell uname),Darwin)
DOCKER_LAUNCH := open -a Docker
else
DOCKER_LAUNCH := sudo systemctl start docker
endif

.DEFAULT_GOAL := help
.PHONY: help setup dev test check docker-up \
	fe-install fe-dev fe-build fe-lint fe-typecheck fe-test fe-check \
	be-deps be-up be-down be-logs be-build be-test be-lint be-check \
	db-shell db-reset migrate-new migrate-status

help: ## List available commands
	@awk 'BEGIN {FS = ":.*## "} \
		/^##@/ {printf "\n\033[1m%s\033[0m\n", substr($$0, 5)} \
		/^[a-z][a-z0-9-]*:.*## / {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""

##@ Everyday

setup: fe-install be-deps ## Install dependencies for both stacks
	@echo "Ready. Run 'make dev'."

dev: be-up ## Start the API and database, then the frontend dev server
	@$(MAKE) --no-print-directory fe-dev

test: fe-test be-test ## Run both test suites

check: fe-check be-check ## Run everything CI would run

##@ Frontend

fe-dev: ## Frontend dev server on http://localhost:3000
	cd $(FRONTEND) && bun run dev

fe-build: ## Production build of the frontend
	cd $(FRONTEND) && bun run build

fe-lint: ## ESLint
	cd $(FRONTEND) && bun run lint

fe-typecheck: ## Generate route types, then tsc --noEmit
	cd $(FRONTEND) && bun run typecheck

fe-test: ## Jest
	cd $(FRONTEND) && bun run test --passWithNoTests

fe-check: ## Everything frontend CI runs
	cd $(FRONTEND) && bun run lint && bun run typecheck && bun run test:ci && bun run build

##@ Backend

be-up: docker-up ## Start API + database in Docker, applying migrations first
	@$(BE) dev-up

be-down: docker-up ## Stop the stack, keeping the data
	@$(BE) dev-down

be-logs: docker-up ## Follow the API container's logs
	@$(BE) dev-logs

be-build: ## Compile the API to backend/boutline
	@$(BE) build

be-test: ## Go tests with the race detector
	@$(BE) test

be-lint: ## golangci-lint, which includes go vet
	@$(BE) lint

be-check: ## Backend lint and tests
	@$(BE) lint && $(BE) test

##@ Database

db-shell: docker-up ## Open a psql shell on the dev database
	@$(BE) dev-psql

db-reset: docker-up ## Wipe the database and bring it back up, migrations applied
	@printf "This deletes every row in the dev database. Continue? [y/N] "; \
	read ans; \
	if [ "$$ans" != "y" ]; then echo "aborted"; exit 0; fi; \
	$(BE) dev-reset && $(BE) dev-up

migrate-new: docker-up ## Write the next migration from the models: make migrate-new NAME=create_x
	@$(BE) migrate-new NAME=$(NAME)

migrate-status: docker-up ## Show which migrations the database has applied
	@$(BE) migrate-status

fe-install:
	cd $(FRONTEND) && bun install

be-deps:
	cd $(BACKEND) && go mod download

# Docker Desktop accepts connections well after the app itself launches, so start
# it and poll instead of letting the first compose call fail.
docker-up:
	@docker info >/dev/null 2>&1 && exit 0; \
	echo "Docker is not running — starting it..."; \
	$(DOCKER_LAUNCH) || { echo "could not start Docker; is Docker Desktop installed?"; exit 1; }; \
	for i in $$(seq 1 90); do \
		docker info >/dev/null 2>&1 && { echo "Docker is ready."; exit 0; }; \
		sleep 1; \
	done; \
	echo "Docker did not accept connections within 90s."; exit 1
