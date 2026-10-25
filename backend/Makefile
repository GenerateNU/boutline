BINARY_NAME := boutline
MAIN_FILE := cmd/main.go
COVERAGE_FILE := coverage.out
COMPOSE := docker compose

build:
	go build -o $(BINARY_NAME) $(MAIN_FILE)

run:
	APP_ENVIRONMENT=$${APP_ENVIRONMENT:-dev} go run $(MAIN_FILE)

clean:
	rm -f $(BINARY_NAME) $(COVERAGE_FILE)

test:
	go test ./... -race

test-cover:
	go test ./... -race -coverprofile=$(COVERAGE_FILE) -covermode=atomic
	go tool cover -func=$(COVERAGE_FILE) | tail -n 1

# Unit tests for one package, optionally one test:
#   make test-pkg PKG=./internal/features/health/test
#   make test-pkg PKG=./internal/config RUN=TestLoadAppConfig
test-pkg:
	@test -n "$(PKG)" || { echo "PKG is required, e.g. make test-pkg PKG=./internal/features/health/test"; exit 1; }
	go test $(PKG) -race -v $(if $(RUN),-run '$(RUN)',)

# Everything except internal/tests: the feature test folders and the unit tests
# that sit beside their package.
test-unit:
	go test $$(go list ./... | grep -v '/internal/tests') -race

test-integration:
	go test ./internal/tests/... -race

# Runs the integration suite against a real, migrated, seeded Postgres instead
# of the fakes test-integration uses. Needs dev-up and dev-seed first; the test
# service builds and runs on the same compose network as the db it reads.
test-integration-db:
	$(COMPOSE) run --rm --build test

# Write the next versioned migration by diffing the gorm models against
# ./migrations. Needs the atlas CLI and Docker, and should be run before
# dev-up so the stack has a schema to apply.
migrate-new:
	@test -n "$(NAME)" || { echo "NAME is required, e.g. make migrate-new NAME=create_examples"; exit 1; }
	@command -v atlas >/dev/null || { echo "atlas CLI not found: brew install ariga/tap/atlas"; exit 1; }
	docker build --tag postgres:17-trgm atlas/dev-db
	atlas migrate diff $(NAME) --env local

# dev-up applies migrations on its own; these are for doing it out of band.
migrate-apply:
	$(COMPOSE) run --rm migrate

migrate-status:
	$(COMPOSE) run --rm migrate 'atlas migrate status --dir file:///migrations --url "$$ATLAS_URL"'

# Rewrite the Mermaid ER diagram between the schema-diagram markers in the root
# README from ./migrations rather than the models, so column order matches the
# deployed tables. The README is only replaced if a start marker was closed by
# an end marker, so a missing or misordered marker can't truncate it.
schema-diagram:
	@command -v atlas >/dev/null || { echo "atlas CLI not found: brew install ariga/tap/atlas"; exit 1; }
	docker build --tag postgres:17-trgm atlas/dev-db
	@diagram=$$(atlas schema inspect --env local --url file://migrations --format '{{ mermaid . }}') && \
	DIAGRAM="$$diagram" awk ' \
		/<!-- schema-diagram:end -->/ { if (skip) replaced = 1; skip = 0 } \
		!skip { print } \
		/<!-- schema-diagram:start -->/ { d = ENVIRON["DIAGRAM"]; sub(/[[:space:]]+$$/, "", d); print "```mermaid"; print d; print "```"; skip = 1 } \
		END { exit skip || !replaced } \
	' ../README.md > ../README.md.tmp && mv ../README.md.tmp ../README.md || { rm -f ../README.md.tmp; exit 1; }

# Build the image from ./Dockerfile and run it against a Postgres container.
dev-up:
	$(COMPOSE) up --build --detach

dev-down:
	$(COMPOSE) down

# Same as dev-down but drops the database volume.
dev-reset:
	$(COMPOSE) down --volumes

dev-logs:
	$(COMPOSE) logs --follow api

dev-psql:
	$(COMPOSE) exec db psql -U postgres -d boutline

# Rows already present are skipped, so this is safe to rerun.
dev-seed:
	$(COMPOSE) exec -T db psql -U postgres -d boutline -q -v ON_ERROR_STOP=1 < seeds/seed.sql

vet:
	go vet ./...

lint:
	golangci-lint run ./...

format:
	gofmt -s -w .

# The CI-side halves of format and tidy: report instead of rewriting.
format-check:
	@unformatted=$$(gofmt -s -l .); \
	test -z "$$unformatted" || { echo "gofmt -s needed:"; echo "$$unformatted"; exit 1; }

tidy-check:
	go mod tidy -diff

tidy:
	go mod tidy

vuln:
	go run golang.org/x/vuln/cmd/govulncheck@v1.1.4 ./...

.PHONY: build run clean test test-cover test-pkg test-unit test-integration \
	migrate-new migrate-apply migrate-status schema-diagram \
	dev-up dev-down dev-reset dev-logs dev-psql dev-seed vet lint format format-check \
	tidy-check tidy vuln
