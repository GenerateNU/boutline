# boutline backend

Go + Fiber API, following the layered architecture used across Generate projects
(see `.claude/rules/backend.md` for the conventions).

## Running

```sh
make run      # go run cmd/main.go
make build    # compile to ./boutline
```

The server listens on `:8000` by default and exposes `GET /healthcheck`.

## Checks

```sh
make test        # go test ./... -race
make test-cover  # same, with a coverage summary
make vet
make lint        # golangci-lint
make format      # gofmt -s -w .
```

Run `make lint` and `make test` before opening a PR.

## Configuration

Every value has a default, so the server runs with no environment set. Override
by exporting these variables:

| Variable              | Default    | Purpose                             |
| --------------------- | ---------- | ----------------------------------- |
| `APP_NAME`            | `boutline` | Server header and Fiber app name    |
| `APP_VERSION`         | `dev`      | Reported by `/healthcheck`          |
| `APP_PORT`            | `8000`     | Listen port                         |
| `APP_ALLOWED_ORIGINS` | `*`        | CORS allow-list                     |
| `APP_ENVIRONMENT`     | `dev`      | Environment label                   |

Config is loaded and validated once at startup in `internal/config`; nothing
below `main` reads the environment directly.

## Layout

```
cmd/main.go                  config load, signal handling, graceful shutdown
internal/config/             one file per config group, validated on load
internal/server/app.go       builds the Fiber app and wires dependencies
internal/server/middlewares/ cross-cutting concerns
internal/server/routers/     one file per feature, mounts controllers
internal/controllers/        HTTP request/response only
internal/services/           business logic (added with the first feature)
internal/repository/         database access (added with the first feature)
internal/validators/         the shared validator and its custom tags
internal/errs/               the error vocabulary and Fiber's ErrorHandler
internal/types/              RouteParams / ServiceParams
internal/tests/              integration tests
internal/tests/testkit/      request builder and assertions for those tests
```

`internal/services` and `internal/repository` do not exist yet — there is no
database and no business logic to put in them. Create them with the first
feature rather than as empty placeholders.

## Testing

Unit tests sit next to the code they cover (`internal/config/app_test.go`).
Integration tests live in `internal/tests` and drive the real app through the
testkit builder:

```go
testkit.New(t).
    Request(testkit.Request{
        App:    fakes.GetSharedTestApp(),
        Route:  "/healthcheck",
        Method: testkit.GET,
    }).
    AssertStatus(http.StatusOK).
    AssertField("status", "ok")
```

`fakes.GetSharedTestApp()` builds the same app as production — same middlewares,
routes, and error handler — from a fixed configuration, so tests do not depend
on the developer's shell. Add assertions to the builder as you need them.
