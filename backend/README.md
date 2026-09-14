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
```

One package at a time, optionally one test, with verbose output:

```sh
make test-pkg PKG=./internal/tests RUN=TestCreateUser
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

1. edit the model, and register it in `cmd/atlasloader/main.go` if the feature
   is new — a model Atlas cannot see is a table that never gets migrated
2. `make migrate-new NAME=what_changed`
3. read the generated SQL; it is an ordinary file, so correct it if the diff is
   not what you meant
4. `make dev-up`

`make migrate-new` needs the Atlas CLI (`brew install ariga/tap/atlas`) and
Docker: Atlas starts a throwaway Postgres to normalise the schema before
diffing, configured as `dev` in `atlas.hcl`. Migrations are committed, and
`migrations/atlas.sum` is a checksum over the directory — if you hand-edit a
file, re-sign it with `atlas migrate hash`.

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
internal/models/             gorm models and their request types
internal/repository/         queries only, one file per domain + repository.go
internal/services/           business logic
internal/controllers/        Huma input/output types and the transport mapping
internal/server/app.go       builds the Fiber app, the Huma API, and the wiring
internal/server/middlewares/ cross-cutting concerns
internal/server/routers/     one file per feature, mounted from routers.go
internal/validators/         the shared validator and its custom tags
internal/errs/               the error vocabulary, Fiber's ErrorHandler, HumaError
internal/types/              RouteParams / ServiceParams
internal/tests/              unit, integration, and end-to-end tests
internal/tests/mocks/        in-memory stand-ins for the repository interfaces
internal/tests/testkit/      request builder and assertions for those tests
```

## Features

Layers are packages, not folders per feature. A feature named `thing` is one
file in each layer it needs:

```
models/thing.go            the gorm model and its request types — no HTTP
repository/thing.go        queries only, gorm errors translated to errs sentinels
services/thing.go          business logic, the only layer that decides anything
controllers/thing.go       Huma input/output types and the transport mapping
server/routers/thing.go    builds repository -> service -> controller, registers it
tests/thing_test.go        that feature's tests
```

Dependencies point one way: `routers -> controllers -> services -> repository`,
and nothing below `controllers` knows it is serving HTTP. Create a layer's file
when the first real code needs it — `health` has only a controller and a router,
since there is nothing to store and nothing to decide.

Add the repository to `repository.Repository` so it is constructed once at
startup, then register the feature with one call in `server/routers/routers.go`.

Huma validates the request against the schema it builds from the struct tags in
the controller, so a bad body or query never reaches it. Service errors come
back as `errs` sentinels and `errs.HumaError` is the single place that turns
them into status codes.

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

Controller types are prefixed with the feature's own name — `HealthResponse`,
`UserResponse`, not a bare `Response`. Huma keys its schema registry by the bare
Go type name, so two features that both declared a `Response` would panic at
registration. Layers are separate packages, so this only binds the types Huma
sees; `services.NewUserService` does not need the stutter.

A new model also has to be registered in `cmd/atlasloader/main.go`, or Atlas
will never generate a migration for it. See Migrations.

## Testing

| Kind                     | Lives in                        | Runs against                                 |
| ------------------------ | ------------------------------- | -------------------------------------------- |
| Feature unit tests       | `internal/tests/<name>_test.go` | the service over `internal/tests/mocks`      |
| Package-local unit tests | beside the code they cover      | that package (`internal/config/app_test.go`) |
| Integration and e2e      | `internal/tests/`               | the whole app through the testkit            |

`internal/tests/user_test.go` is the template for the first row: it drives
`services.UserService` over `mocks.NewMockUserRepository`, which enforces the
same unique-email and not-found semantics Postgres would, so the service's error
paths are reachable with no database. `internal/tests/health_test.go` shows the
other half — registering a controller through `humatest` for real status codes
and JSON with no database and no Fiber in the way.

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
