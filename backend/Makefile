BINARY_NAME := boutline
MAIN_FILE := cmd/main.go
COVERAGE_FILE := coverage.out

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

vet:
	go vet ./...

lint:
	golangci-lint run ./...

format:
	gofmt -s -w .

tidy:
	go mod tidy

.PHONY: build run clean test test-cover vet lint format tidy
