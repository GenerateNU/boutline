package example

import (
	"net/http"

	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

const exampleBasePath = "/api/v1/examples"

// RegisterExampleRoutes builds this feature's dependency chain and mounts it.
// It is the only place that knows how the layers fit together; SetUpRoutes just
// calls it once with the params CreateApp built.
func RegisterExampleRoutes(api huma.API, params *types.ServiceParams) {
	RegisterExampleService(api, NewExampleService(NewExampleRepository(params.DB)))
}

// RegisterExampleService mounts an already-built service, which is how the unit
// tests in ./test register one backed by a fake repository instead of a
// database.
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

	huma.Register(api, huma.Operation{
		OperationID: "getExampleByID",
		Method:      http.MethodGet,
		Path:        exampleBasePath + "/{id}",
		Summary:     "Get an example by ID",
		Tags:        []string{"Examples"},
	}, service.GetExampleByID)

	huma.Register(api, huma.Operation{
		OperationID: "updateExampleByID",
		Method:      http.MethodPatch,
		Path:        exampleBasePath + "/{id}",
		Summary:     "Update an example",
		Description: "Fields left out of the body are left as they are.",
		Tags:        []string{"Examples"},
	}, service.UpdateExampleByID)

	huma.Register(api, huma.Operation{
		OperationID:   "deleteExample",
		Method:        http.MethodDelete,
		Path:          exampleBasePath + "/{id}",
		Summary:       "Delete an example",
		Tags:          []string{"Examples"},
		DefaultStatus: http.StatusNoContent,
	}, service.DeleteExample)
}
