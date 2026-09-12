BINARY_NAME := boutline
MAIN_FILE := cmd/main.go
COVERAGE_FILE := coverage.out
COMPOSE := docker compose

build:
	go build -o $(BINARY_NAME) $(MAIN_FILE)

run:
	go run $(MAIN_FILE)

clean:
	rm -f $(BINARY_NAME) $(COVERAGE_FILE)

test:
	go test ./... -race

test-cover:
	go test ./... -race -coverprofile=$(COVERAGE_FILE) -covermode=atomic
	go tool cover -func=$(COVERAGE_FILE) | tail -n 1

# Unit tests for one package, optionally one test:
#   make test-pkg PKG=./internal/features/example/test
#   make test-pkg PKG=./internal/config RUN=TestLoadAppConfig
test-pkg:
	@test -n "$(PKG)" || { echo "PKG is required, e.g. make test-pkg PKG=./internal/features/example/test"; exit 1; }
	go test $(PKG) -race -v $(if $(RUN),-run '$(RUN)',)

# Everything except internal/tests: the feature test folders and the unit tests
# that sit beside their package.
test-unit:
	go test $$(go list ./... | grep -v '/internal/tests') -race

test-integration:
	go test ./internal/tests/... -race

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

vet:
	go vet ./...

lint:
	golangci-lint run ./...

format:
	gofmt -s -w .

tidy:
	go mod tidy

.PHONY: build run clean test test-cover test-pkg test-unit test-integration \
	dev-up dev-down dev-reset dev-logs dev-psql vet lint format tidy
