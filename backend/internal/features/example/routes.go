package example

import (
	"net/http"

	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

const exampleBasePath = "/api/v1/examples"

// RegisterExampleRoutes builds this feature's dependency chain and mounts it.
// It is the only place that knows how the four layers fit together; SetUpRoutes
// just calls it once with the params CreateApp built.
func RegisterExampleRoutes(api huma.API, params *types.ServiceParams) {
	RegisterExampleHandler(api, NewExampleHandler(NewExampleService(NewExampleRepository(params.DB))))
}

// RegisterExampleHandler mounts an already-built handler, which is how the unit
// tests in ./test register one backed by a fake repository instead of a
// database.
func RegisterExampleHandler(api huma.API, handler *ExampleHandler) {
	huma.Register(api, huma.Operation{
		OperationID:   "createExample",
		Method:        http.MethodPost,
		Path:          exampleBasePath,
		Summary:       "Create an example",
		Tags:          []string{"Examples"},
		DefaultStatus: http.StatusCreated,
	}, handler.CreateExample)

	huma.Register(api, huma.Operation{
		OperationID: "listExamples",
		Method:      http.MethodGet,
		Path:        exampleBasePath,
		Summary:     "List examples",
		Tags:        []string{"Examples"},
	}, handler.ListExamples)

	huma.Register(api, huma.Operation{
		OperationID: "findExampleByID",
		Method:      http.MethodGet,
		Path:        exampleBasePath + "/{id}",
		Summary:     "Find an example by ID",
		Tags:        []string{"Examples"},
	}, handler.FindExampleByID)

	huma.Register(api, huma.Operation{
		OperationID:   "deleteExample",
		Method:        http.MethodDelete,
		Path:          exampleBasePath + "/{id}",
		Summary:       "Delete an example",
		Tags:          []string{"Examples"},
		DefaultStatus: http.StatusNoContent,
	}, handler.DeleteExample)
}
