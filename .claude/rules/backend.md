---
paths:
  - "backend/**"
---

# Backend conventions (Go)

Go + Fiber in a layered architecture, following the pattern used across Generate
projects. `backend/README.md` has the commands and the current directory map.

## Layers

Everything below lives under `backend/internal/`:

```
config/              loaded and validated once at startup
database/            the gorm/postgres pool
features/<name>/     one folder per feature, one file per layer
utils/               shared helpers: request validation, custom tags, clamp
errs/                the shared error vocabulary
types/               RouteParams / ServiceParams
server/app.go        builds the Fiber app, the Huma API, and the wiring
server/middlewares/  cross-cutting concerns
server/routers/      mounts each feature with one call
tests/               integration and end-to-end tests
tests/testkit/       request builder and assertions for those tests
```

The layers are the files inside a feature folder, not top-level packages:

```
features/trips/types.go       the wire format Huma builds the schema from
features/trips/model.go       the gorm model and its domain types
features/trips/repository.go  database access
features/trips/service.go     business logic, registered with Huma by routes.go
features/trips/routes.go      route registration, one file per feature
features/trips/test/          that feature's unit tests and their fakes
```

Boundaries are one-directional and absolute:

- The service is the top layer: it takes the input type, decides, and returns
  the output type. Nothing else holds business logic.
- `model.go` and `repository.go` never mention a wire type. No `*fiber.Ctx`
  anywhere below `routes.go`.
- Repositories hold no business logic — queries only.

Create a feature's file when the first real code needs it, not as an empty
placeholder — `features/health` is its types, a service, and its routes, since
there is nothing to store and nothing to decide. One file per domain concept,
never a `utils.go` or `helpers.go` grab bag.

## Dependency injection

Dependencies are explicit constructor arguments held as struct fields:

```go
func NewTripService(repo TripRepository, publisher EventPublisher) *TripService
```

No globals, no `init()`, no package-level mutable state. `internal/types` carries
`RouteParams` and `ServiceParams` from `server.CreateApp` down to the routers;
each router constructs its own service from them.

Define interfaces for repositories, services, and anything external — they are
the seam that makes a layer testable.

## Errors

All error types and the Fiber `ErrorHandler` live in `internal/errs`, which is
the only place that maps an error to a status code.

- Services return sentinels (`errs.ErrNotFound`, `errs.ErrDuplicate`,
  `errs.ErrInvalidInput`), wrapped with `fmt.Errorf("verb noun: %w", err)`.
- A service returns `errs.NewAPIError(status, err)` when it needs a specific
  status; otherwise it returns the sentinel unchanged and `errs.HumaError` maps
  it.
- Never return a raw database or driver error to a client. Anything unrecognised
  becomes a 500 with a generic message — the detail goes to the log only.
- Compare with `errors.Is` / `errors.As`. Never discard an error with `_`, and
  never both log and return the same error.

## Conventions

- `context.Context` is the first parameter of anything doing I/O, threaded all
  the way through. No `context.Background()` below `main`.
- No hard-coded values. Ports, limits, timeouts, and URLs come from
  `internal/config` or a named constant.
- Structured logging via `log/slog`. No `fmt.Println` outside `main`.
- Explicit names: `CreateTrip`, `FindTripByID`. Not `Handle`, `Process`, `DoThing`.
- Functions do one thing; extract a helper before one grows past ~40 lines.
- Pin dependencies to exact versions in `go.mod`. Prefer the standard library
  when it is not clearly worse.

## Routing

Routes are versioned and grouped by feature: `/api/v1/trips`, `/api/v1/users`.
A feature owns its `routes.go`, which is the only place that knows how its
layers fit together; `SetUpRoutes` in `internal/server/routers` mounts it with
one call. Auth, logging, CORS, and rate limiting belong in middleware, not in a
feature.

## Database

- Select only the columns you need; no `SELECT *`.
- Join and filter on indexed columns. Watch for N+1 queries.
- Every list endpoint is paginated. Never return an unbounded list.

## Concurrency

Every goroutine has an owner, an exit path, and a context that cancels it. Guard
shared state with a mutex or a channel, not both for the same data. Anything
talking to a network or an external API must be safe to retry and safe to run
concurrently with itself — assume responses arrive out of order and that any
request may be delivered twice.

## Tests

- A feature's unit tests live in `internal/features/<name>/test`, running that
  feature's layers over a fake repository. Package-local tests sit beside the
  code they cover when they test that package alone (`config/app_test.go`).
  Integration tests live in `internal/tests` and go through the `testkit`
  builder against the real app.
- Table-driven, subtests named for the case, `t.Parallel()` where the test does
  not mutate process state (`t.Setenv` rules it out).
- Assert observable behavior — status codes, response fields, stored rows — not
  call counts or internals.
- Cover the error paths and the edges: empty input, invalid IDs, duplicates.
- Extend the testkit with new assertions rather than hand-rolling requests.
- `make test` and `make lint` must pass before a PR.
