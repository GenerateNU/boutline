package health

import (
	"net/http"

	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

func RegisterHealthRoutes(api huma.API, params *types.ServiceParams) {
	RegisterHealthHandler(api, NewHealthHandler(params.Config))
}

// RegisterHealthHandler mounts an already-built handler so a test can register
// one over a fixed configuration.
func RegisterHealthHandler(api huma.API, handler *HealthHandler) {
	huma.Register(api, huma.Operation{
		OperationID: "healthcheck",
		Method:      http.MethodGet,
		Path:        "/healthcheck",
		Summary:     "Report the running app",
		Tags:        []string{"System"},
	}, handler.CheckHealth)
}
