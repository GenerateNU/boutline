---
paths:
  - "backend/**"
---

# Backend conventions (Go)

Standard library first. Add a dependency only when the stdlib answer is genuinely
worse, and pin it explicitly.

## Layout

- `cmd/<binary>/main.go` — config, wiring, and shutdown only.
- `internal/<domain>/` — one package per domain concept, with its handler, service,
  and store in separate files.
- No `pkg/`, no `utils`, no packages named after a layer (`models`, `helpers`).
- Define interfaces in the package that consumes them, holding only the methods that
  consumer actually calls.

## Conventions

- `context.Context` is the first parameter of anything doing I/O, and it is honored:
  thread it through every call. No `context.Background()` below `main`.
- Wrap errors with `fmt.Errorf("verb noun: %w", err)`; compare with `errors.Is` /
  `errors.As`. Never discard an error with `_`. Never both log and return the same
  error.
- Structured logging via `log/slog`. No `fmt.Println` outside `main`.
- No `init()` and no package-level mutable state. Dependencies are struct fields set
  by a constructor.
- Handlers stay thin: decode, validate, call the service, encode. Logic lives in the
  service.

## Concurrency

Every goroutine has an owner, an exit path, and a context that cancels it. Guard
shared state with a mutex or a channel, not both for the same data. Anything talking
to a network or an external API must be safe to retry and safe to run concurrently
with itself — assume responses arrive out of order and that any request may be
delivered twice.

## Tests

- Table-driven, subtests named for the case, `t.Parallel()` in unit tests.
- Assert returned values, status codes, and stored rows — not call counts or
  internals.
- `go test ./...` and `go vet ./...` must pass. Add `-race` for anything concurrent.
