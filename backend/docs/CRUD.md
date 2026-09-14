# Adding a CRUD endpoint

A feature is a folder under `internal/features` holding five files and its
tests. Dependencies point one way: `routes → service → repository`. The
repository is the only layer that does not know it is serving HTTP.

This walks through `example`, the feature on the `EXAMPLES` branch, in the order
you would build it. Every snippet below is that feature's real code. 

## What you touch

```
internal/features/example/
  model.go          the gorm model and its domain types, aka WHAT IS THE DATA?
  repository.go     queries to the db only, gorm errors translated to errs sentinels, aka HOW DO YOU GET THE DATA FROM DB?
  types.go          the Huma request and response types, aka WHAT DOES THE API SPEAK?
  service.go        business logic, the only layer that decides anything, aka ARE YOU ALLOWED TO HAVE THIS DATA?
  routes.go         builds repository -> service, registers operations, aka HOW DO YOU GET THE DATA FROM THE SERVER?
  test/
    fakes.go        in-memory repository the unit tests run against
    service_test.go the rules, called directly
    routes_test.go  the registered operations, over humatest

internal/server/routers/routers.go        one registration line
cmd/atlasloader/main.go                   one line so Atlas can see the model
migrations/<timestamp>_create_examples.sql   generated, committed
```

## 1. model.go

The persistence shape and its domain types. 

```go
// Status is an enum of type Example Status, defined here 
type ExampleStatus string

const (
	ExampleStatusActive   ExampleStatus = "active"
	ExampleStatusArchived ExampleStatus = "archived"
)

// These are the actual content of example. 
// Every model will have an ID, other fields are tailored to the model and up to YOU!
// the gorm string next to each type defines how it exists in the db; type, nullablility, default value, name
type Example struct {
	ID        uuid.UUID     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name      string        `gorm:"type:text;not null;uniqueIndex:idx_examples_name,where:deleted_at IS NULL"`
	Status    ExampleStatus `gorm:"type:text;not null;index"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

// Validators for the enum type
func (s ExampleStatus) IsValid() bool {
	return s == ExampleStatusActive || s == ExampleStatusArchived
}

func (Example) TableName() string {
	return "examples"
}
```

`DeletedAt` makes every query soft-deleting. A plain `uniqueIndex` would then
count deleted rows against the constraint, so scope it with
`where:deleted_at IS NULL`. Enum validity lives on the type, next to the values.

## 2. repository.go

Queries to the db. The interface is the seam the service is tested
against; the gorm implementation sits under it in the same file.

```go

// create an interface of the db interactions for testing purposes! 
type ExampleRepository interface {
	CreateExample(ctx context.Context, example *Example) error
	GetExampleByID(ctx context.Context, id uuid.UUID) (*Example, error)
	ListExamples(ctx context.Context, filter ExampleListFilter) ([]Example, int64, error)
	UpdateExampleByID(ctx context.Context, id uuid.UUID, update ExampleUpdate) error
	DeleteExample(ctx context.Context, id uuid.UUID) error
}

// create a new repository that each method is called on
func NewExampleRepository(db *gorm.DB) ExampleRepository {
	return &exampleRepository{db: db}
}
```

**Translate driver errors into sentinels** so nothing raw reaches a client
(`TranslateError` is already on in `internal/database`, which is what turns a
unique violation into `gorm.ErrDuplicatedKey`):

```go
func (r *exampleRepository) GetExampleByID(ctx context.Context, id uuid.UUID) (*Example, error) {
	var example Example

	err := r.db.WithContext(ctx).
		Select("id", "name", "status", "created_at", "updated_at").
		First(&example, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("select example %s: %w", id, errs.ErrNotFound)
		}
		return nil, fmt.Errorf("select example %s: %w", id, err)
	}

	return &example, nil
}
```

**Select the columns you need**, never `SELECT *`. **Every list is paginated and
returns a total**, counted before the page is fetched so one filter serves both:

```go
query := r.db.WithContext(ctx).Model(&Example{})
if filter.Status != "" {
	query = query.Where("status = ?", filter.Status)
}

var total int64
if err := query.Count(&total).Error; err != nil {
	return nil, 0, fmt.Errorf("count examples: %w", err)
}

examples := make([]Example, 0, filter.Limit)
err := query.
	Select("id", "name", "status", "created_at", "updated_at").
	Order("created_at DESC").
	Limit(filter.Limit).
	Offset(filter.Offset).
	Find(&examples).Error
```

Delete reports a missing row rather than silently succeeding:

```go
result := r.db.WithContext(ctx).Delete(&Example{}, "id = ?", id)
if result.RowsAffected == 0 {
	return fmt.Errorf("soft delete example %s: %w", id, errs.ErrNotFound)
}
```

## 3. types.go

The wire format, kept apart from the logic so the API contract reads as one
file. Huma builds the OpenAPI schema from these struct tags and rejects a bad
request *before* the service runs.

```go
type ExampleResponse struct {
	ID        string        `json:"id" format:"uuid"`
	Name      string        `json:"name"`
	Status    ExampleStatus `json:"status" enum:"active,archived"`
	CreatedAt time.Time     `json:"createdAt"`
	UpdatedAt time.Time     `json:"updatedAt"`
}

type ExampleCreateBody struct {
	Name   string        `json:"name" minLength:"1" maxLength:"120" doc:"Human-readable name, unique among live examples"`
	Status ExampleStatus `json:"status,omitempty" enum:"active,archived" doc:"Defaults to active"`
}

type ExampleCreateInput struct{ Body ExampleCreateBody }

// ExampleIDInput is shared by every route with an /{id} path.
type ExampleIDInput struct {
	ID string `path:"id" format:"uuid" doc:"Example ID"`
}

type ExampleListInput struct {
	Status ExampleStatus `query:"status" enum:"active,archived" doc:"Filter by status"`
	Limit  int           `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset int           `query:"offset" default:"0" minimum:"0"`
}

// A patch: every field is a pointer, so nil means "leave it alone".
type ExampleUpdateBody struct {
	Name   *string        `json:"name,omitempty" minLength:"1" maxLength:"120"`
	Status *ExampleStatus `json:"status,omitempty" enum:"active,archived"`
}

type ExampleUpdateInput struct {
	ID   string `path:"id" format:"uuid"`
	Body ExampleUpdateBody
}

type ExampleOutput     struct{ Body ExampleResponse }
type ExampleListOutput struct{ Body ExampleListBody }
```

A body field is **required unless its json tag has `omitempty`** — a missing
`name` comes back as `422 expected required property name to be present`, while
a missing `status` is fine. Query params are optional by default.

`newExampleResponse` lives here too: it turns a model into an `ExampleResponse`,
which is the only place the two shapes meet.

## 4. service.go

Where the rules live, and what Huma actually calls. Each method takes a request
type from `types.go` and returns a response type, so by the time one runs Huma
has already rejected anything the schema could describe — what is left are the
rules a schema cannot express.

```go
const (
	ExampleDefaultPageSize = 20
	ExampleMaxPageSize     = 100
)

type ExampleService interface {
	CreateExample(ctx context.Context, input *ExampleCreateInput) (*ExampleOutput, error)
	GetExampleByID(ctx context.Context, input *ExampleIDInput) (*ExampleOutput, error)
	ListExamples(ctx context.Context, input *ExampleListInput) (*ExampleListOutput, error)
	UpdateExampleByID(ctx context.Context, input *ExampleUpdateInput) (*ExampleOutput, error)
	DeleteExample(ctx context.Context, input *ExampleIDInput) (*struct{}, error)
}
```

Normalise input, default what can be defaulted, reject what cannot. Errors leave
through `errs.HumaError`, which picks the status and decides what the client is
allowed to read:

```go
name := strings.TrimSpace(input.Body.Name)
if name == "" {
	return nil, errs.HumaError(errs.Public("name must not be blank", errs.ErrInvalidInput))
}

status := input.Body.Status
if status == "" {
	status = ExampleStatusActive
}
if !status.IsValid() {
	return nil, errs.HumaError(
		errs.Public(fmt.Sprintf("unknown status %q", status), errs.ErrInvalidInput))
}
```

Clamp the page size even though Huma already enforces `maximum:"100"` on the
query param — a job calling the method directly never went through a schema.
The response reports the clamped values, so the caller can tell which page it
actually got:

```go
limit := input.Limit
switch {
case limit <= 0:
	limit = ExampleDefaultPageSize
case limit > ExampleMaxPageSize:
	limit = ExampleMaxPageSize
}

offset := max(input.Offset, 0)
```

Wrap a repository error with what you were doing. The chain is for the log — a
client reads `errs.ClientMessage`, which is the sentinel's generic text unless
you mark a message public with `errs.Public`:

```go
if err := s.repo.CreateExample(ctx, example); err != nil {
	// The client can act on a name collision, so it gets the detail; the
	// rest of the chain stays in the log.
	if errors.Is(err, errs.ErrDuplicate) {
		return nil, errs.HumaError(fmt.Errorf("create example: %w",
			errs.Public(fmt.Sprintf("an example named %q already exists", name), err)))
	}

	return nil, errs.HumaError(fmt.Errorf("create example: %w", err))
}

return &ExampleOutput{Body: newExampleResponse(*example)}, nil
```

Delete returns `(*struct{}, error)` and `nil, nil` on success, paired with
`DefaultStatus: http.StatusNoContent` on its operation.

## 5. routes.go

The only file that knows how the layers fit together. Keep the two-function
split — the tests register a service over a fake repository through the second
one.

```go
const exampleBasePath = "/api/v1/examples"

func RegisterExampleRoutes(api huma.API, params *types.ServiceParams) {
	RegisterExampleService(api, NewExampleService(NewExampleRepository(params.DB)))
}

func RegisterExampleService(api huma.API, service ExampleService) {
	huma.Register(api, huma.Operation{
		OperationID:   "createExample",
		Method:        http.MethodPost,
		Path:          exampleBasePath,
		Summary:       "Create an example",
		Tags:          []string{"Examples"},
		DefaultStatus: http.StatusCreated,
	}, service.CreateExample)

	huma.Register(api, huma.Operation{
		OperationID: "listExamples",
		Method:      http.MethodGet,
		Path:        exampleBasePath,
		Summary:     "List examples",
		Tags:        []string{"Examples"},
	}, service.ListExamples)

	// getExampleByID, updateExampleByID and deleteExample follow the same
	// shape on exampleBasePath + "/{id}".
}
```

`OperationID` is global across the API and becomes the method name in any
generated client, so keep it `verbNoun`.

## 6. Register the feature

One line in `internal/server/routers/routers.go`:

```go
func SetUpRoutes(app *fiber.App, routeParams types.RouteParams) {
	health.RegisterHealthRoutes(routeParams.API, routeParams.ServiceParams)
	example.RegisterExampleRoutes(routeParams.API, routeParams.ServiceParams)

	setUpNotFoundHandler(app)
}
```

## 7. Migration

Atlas derives the schema from the models, so a model it cannot see is a table
that never gets migrated. Register it in `cmd/atlasloader/main.go`:

```go
stmts, err := gormschema.New("postgres").Load(
	&example.Example{},
)
```

Then generate and read the SQL:

```sh
make migrate-new NAME=create_examples
```

This needs the Atlas CLI (`brew install ariga/tap/atlas`) and Docker — Atlas
spins up a throwaway Postgres to normalise the schema before diffing. The result
is an ordinary file in `migrations/`; read it before committing, and correct it
if the diff is not what you meant. For the model above it produces:

```sql
CREATE TABLE "public"."examples" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  ...
);
CREATE UNIQUE INDEX "idx_examples_name" ON "public"."examples" ("name") WHERE (deleted_at IS NULL);
```

`make dev-up` applies migrations before the api container starts.

## 8. Tests

Feature unit tests live in the feature's own `test/` folder, in `package test`,
which means they only see the exported surface. Integration and end-to-end tests
stay in `internal/tests`.

`fakes.go` holds an in-memory repository returning the same sentinels as the
real one — including the duplicate conflict, so every service branch is
reachable without a database:

```go
var _ example.ExampleRepository = (*FakeExampleRepository)(nil)

type FakeExampleRepository struct {
	Examples map[uuid.UUID]example.Example
	Err      error // when set, every method fails with it
}
```

`service_test.go` covers the rules, table-driven, asserting behavior rather than
calls — the response body on success, the status and detail a client would read
on failure, and what ended up in the fake:

```go
repo := NewFakeExampleRepository(tt.seed...)
out, err := example.NewExampleService(repo).CreateExample(t.Context(), createInput("  taken  ", ""))

code, detail := apiError(t, err)   // the status and message a client would get
```

`routes_test.go` drives the registered operations through `humatest`, giving
real status codes and JSON with no database and no Fiber. It is the only place
Huma's schema validation runs, so it owns the 422 cases a direct call cannot
reach:

```go
func newTestAPI(t *testing.T, seed ...example.Example) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	example.RegisterExampleService(api, example.NewExampleService(NewFakeExampleRepository(seed...)))

	return api
}

resp := newTestAPI(t, seeded("taken", example.ExampleStatusActive)).
	Post("/api/v1/examples", map[string]any{"name": "taken"})

require.Equal(t, http.StatusConflict, resp.Code)
```

Cover the edges: empty input, invalid ids, duplicates, an unknown filter value,
and a repository failure staying a 500 rather than leaking as a client error.

```sh
make test-pkg PKG=./internal/features/example/test
```

## 9. Run it

```sh
make migrate-new NAME=create_examples
make dev-up
open http://localhost:8000/docs      # your operations, with Try it out
curl -X POST localhost:8000/api/v1/examples \
  -H 'Content-Type: application/json' -d '{"name":"first"}'
```

## Naming

**Every exported name in a feature starts with the feature's name** —
`ExampleHandler`, `ExampleResponse`, `NewExampleService`, `ExampleMaxPageSize`.
This is not style. Huma keys its schema registry by the bare Go type name, so a
second feature declaring a `Response` panics the app at registration:

```
panic: duplicate name: Response, new type: example.Response, existing type: health.Response
```

Methods keep short names where the receiver already carries the feature
(`ExampleStatus.IsValid`, `Example.TableName`). Everything else gets the prefix,
and the CRUD verbs read the same at every layer: `CreateExample`,
`GetExampleByID`, `ListExamples`, `UpdateExampleByID`, `DeleteExample`.

This is the single most common thing to get wrong when copying the template —
a missed rename compiles fine and dies at startup.

## Gotchas

- **Validation lives in two places on purpose.** Huma rejects anything the
  schema can describe (missing field, bad enum, malformed uuid, `limit=500`) with
  a 422 before your service method runs. The service re-checks what a caller that
  never went through a request could get wrong. Neither is redundant.
- **`main` has no models registered with Atlas**, but
  `migrations/20260912065155_create_examples.sql` is still there from the example
  feature. Until you register your first model, `make migrate-new` will helpfully
  generate `DROP TABLE "public"."examples"`. Register the model first, and read
  the generated SQL before committing it.
- **A feature with no state collapses the template.** `internal/features/health`
  is a handler and its routes — there is nothing to store and nothing to decide,
  so it has no model, repository, or types file.
- **The catch-all 404 is Fiber-shaped**, not Huma-shaped — an unrouted path
  returns `{"error":"Route not found"}` while everything else returns
  `{"title","status","detail"}`.
- **Response bodies carry a `$schema` field.** That is Huma linking the JSON
  Schema; it is additive and safe to ignore.

## Checklist

- [ ] Five files under `internal/features/<name>/`, each doing its one job
- [ ] Every exported name carries the feature prefix
- [ ] Repository translates gorm errors into `errs` sentinels
- [ ] List endpoint is paginated and returns a total
- [ ] Service clamps the page size and validates what a schema cannot
- [ ] Client-actionable errors use `errs.Public`; nothing else leaks the chain
- [ ] Registered in `routers.go` and in `cmd/atlasloader/main.go`
- [ ] Migration generated, read, and committed
- [ ] `test/` covers the rules, the operations, and the error paths
- [ ] `make lint` and `make test` pass
