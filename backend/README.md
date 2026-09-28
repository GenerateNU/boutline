# boutline backend

Go + Fiber API, following the layered architecture used across Generate projects
(see `.claude/rules/backend.md` for the conventions).

## Running

The whole dev stack — the image from `./Dockerfile` plus Postgres — comes up
with one command:

```sh
make dev-up      # build and start api + db, detached
make dev-logs    # follow the api container
make dev-psql    # psql into the db container
make dev-down    # stop, keep the data
make dev-reset   # stop and drop the database volume
```

The database port is not published, so a Postgres already running on `:5432`
does not clash. Against your own Postgres, run the server directly instead:

```sh
make run      # go run cmd/main.go
make build    # compile to ./boutline
```

Either way the server listens on `:8000` and needs a reachable database — it
pings on startup and exits if there is none. `make dev-up` applies migrations
before the api container starts, so a fresh volume comes up with the schema
already in place. Every route, healthcheck included, is a Huma operation, so the
generated spec is at `/openapi.json` and Swagger UI at `/docs`.

## Checks

```sh
make test              # go test ./... -race
make test-unit         # everything except internal/tests
make test-integration  # internal/tests only
make test-cover        # every package, with a coverage summary
make vet
make lint              # golangci-lint
make format            # gofmt -s -w .
make format-check      # fails instead of rewriting; what CI runs
make tidy-check        # fails if go.mod/go.sum are not tidy
make vuln              # govulncheck
```

One package at a time, optionally one test, with verbose output:

```sh
make test-pkg PKG=./internal/features/health/test
make test-pkg PKG=./internal/config RUN=TestLoadAppConfig
```

## Migrations

Atlas owns the schema and the gorm models own Atlas. `cmd/atlasloader` prints
the DDL for every registered model, and `atlas migrate diff` writes whatever is
missing from `./migrations` as the next versioned file.

```sh
make migrate-new NAME=create_examples  # write the next migration
make migrate-status                    # what the dev database has applied
make migrate-apply                     # apply out of band; dev-up already does
```

Adding or changing a model goes:

1. edit the model, and add it to the `Load` call in `cmd/atlasloader/main.go`
   if the feature is new — a model Atlas cannot see is a table that never gets
   migrated
2. `make migrate-new NAME=what_changed`
3. read the generated SQL; it is an ordinary file, so correct it if the diff is
   not what you meant
4. `make dev-up`

`make migrate-new` needs the Atlas CLI (`brew install ariga/tap/atlas`) and
Docker: Atlas starts a throwaway Postgres to normalise the schema before
diffing, configured as `dev` in `atlas.hcl`. Migrations are committed, and
`migrations/atlas.sum` is a checksum over the directory — if you hand-edit a
file, re-sign it with `atlas migrate hash`.

Run `make lint` and `make test` before opening a PR, or `make be-check` from
the repo root for everything [Backend CI](../.github/workflows/backend-ci.yml)
gates on. CI additionally builds the Docker image and re-diffs the models against
`./migrations` so a model change without a migration cannot merge.

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

| Variable               | Default     | Purpose                          |
| ---------------------- | ----------- | -------------------------------- |
| `DB_HOST`              | `localhost` | Postgres host                    |
| `DB_PORT`              | `5432`      | Postgres port                    |
| `DB_NAME`              | `boutline`  | Database name                    |
| `DB_USER`              | `postgres`  | Role to connect as               |
| `DB_PASSWORD`          | `postgres`  | Password for that role           |
| `DB_SSL_MODE`          | `disable`   | libpq sslmode                    |
| `DB_MAX_OPEN_CONNS`    | `25`        | Pool ceiling                     |
| `DB_MAX_IDLE_CONNS`    | `5`         | Idle connections kept open       |
| `DB_CONN_MAX_LIFETIME` | `1h`        | Recycle age, any Go duration     |

Config is loaded and validated once at startup in `internal/config`; nothing
below `main` reads the environment directly.

## Layout

```
cmd/main.go                  config load, db connect, signals, graceful shutdown
cmd/atlasloader/             prints the gorm schema for Atlas to diff against
migrations/                  versioned SQL, generated, committed
atlas.hcl                    how Atlas finds the models and the migrations
internal/config/             one file per config group, validated on load
internal/database/           the gorm/postgres pool
internal/features/           one folder per feature, one file per layer
internal/server/app.go       builds the Fiber app, the Huma API, and the wiring
internal/server/middlewares/ cross-cutting concerns
internal/server/routers/     mounts each feature with one call
internal/utils/              shared helpers: the validator, uuid parsing, clamp
internal/errs/               the error vocabulary, Fiber's ErrorHandler, HumaError
internal/types/              RouteParams / ServiceParams
internal/tests/              integration and end-to-end tests
internal/tests/testkit/      request builder and assertions for those tests
```

A feature's file is created when the first real code needs it rather than as an
empty placeholder. `health` is the only feature so far and it stores nothing, so
there is no model and no repository in the tree today.

## Features

A feature is a folder under `internal/features`, one file per layer:

```
types.go       the Huma input/output structs — the wire format, nothing else
model.go       the gorm model and its domain types — no HTTP, no JSON
repository.go  queries only, gorm errors translated to errs sentinels
service.go     business logic, the layer routes.go registers with Huma
routes.go      builds repository -> service, registers the operations
test/          this feature's unit tests and the fakes they run against
```

Dependencies point one way: `routes -> service -> repository`, and nothing below
`service.go` knows it is serving HTTP. A full working copy of the template lives
on the `EXAMPLES` branch under `internal/features/example` — read it before
starting a new feature, and copy it rather than inventing a layout. Register the
new feature with one call in `internal/server/routers/routers.go`.

A feature with no state collapses the template — `internal/features/health`, the
only feature in this tree, is its types, a service, and its routes, since there
is nothing to store and nothing to decide.

Huma validates the request against the schema it builds from the struct tags in
`types.go`, so a bad body or query never reaches the service. Service errors
come back as `errs` sentinels and `errs.HumaError` is the single place that
turns them into status codes.

The chain a service builds on the way up (`create example: insert example: ...`)
is for the log only — a client reads the sentinel's own text, and an
unrecognised error reads `internal server error`. When the caller genuinely
needs to know why, say so explicitly:

```go
return nil, fmt.Errorf("create example: %w",
    errs.Public(fmt.Sprintf("an example named %q already exists", name), err))
```

Every route, healthcheck included, is a Huma operation, so error responses share
one shape (`{"title","status","detail"}`). The exception is the catch-all 404 for
an unrouted path, which Fiber still answers in `routers.go`.

Every exported name in a feature starts with the feature's own name —
`ExampleResponse`, `ExampleOutput`, `NewExampleService`, `HealthResponse`. Huma
keys its schema registry by the bare Go type name, so two features that both
declared a `Response` would panic at registration. Keep the prefix when you copy
the template.

A new feature's model also has to be added to the `Load` call in
`cmd/atlasloader/main.go`, or Atlas will never generate a migration for it. See
Migrations.

## Testing

| Kind                     | Lives in                         | Runs against                                 |
| ------------------------ | -------------------------------- | -------------------------------------------- |
| Feature unit tests       | `internal/features/<name>/test/` | that feature's layers over a fake repository  |
| Package-local unit tests | beside the code they cover       | that package (`internal/config/app_test.go`)  |
| Integration and e2e      | `internal/tests/`                | the whole app through the testkit             |

`internal/features/health/test/routes_test.go` is the shape of the first row: it
registers the service through `humatest` for real status codes and JSON, with no
database and no Fiber in the way. A feature with rules to test also tests them
directly, over a fake repository that enforces the same unique-key and not-found
semantics Postgres would, so the error paths are reachable without a database —
the `EXAMPLES` branch has both halves in `internal/features/example/test`
(`fakes.go`, `service_test.go`, `routes_test.go`). A feature test imports its own
package and nothing else from the server.

Integration tests live in `internal/tests` and drive the real app through the
testkit builder — `internal/tests/healthcheck_test.go` covers the healthcheck and
the catch-all 404 this way:

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
