package health

import (
	"net/http"

	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

// RegisterHealthRoutes builds this feature's dependency chain and mounts it,
// the same one call SetUpRoutes makes for every feature.
func RegisterHealthRoutes(api huma.API, params *types.ServiceParams) {
	RegisterHealthService(api, NewHealthService(params.Config))
}

// RegisterHealthService mounts an already-built service, which is how the test
// in ./test registers one over a fixed configuration.
func RegisterHealthService(api huma.API, service HealthService) {
	huma.Register(api, huma.Operation{
		OperationID: "healthcheck",
		Method:      http.MethodGet,
		Path:        "/healthcheck",
		Summary:     "Report the running app",
		Tags:        []string{"System"},
	}, service.CheckHealth)
}
