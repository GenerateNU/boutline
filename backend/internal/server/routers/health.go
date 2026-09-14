package routers

import (
	"net/http"

	"boutline/internal/controllers"
	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

func HealthRoutes(api huma.API, params *types.ServiceParams) {
	RegisterHealthController(api, controllers.NewHealthController(params.Config))
}

// RegisterHealthController mounts an already-built controller so a test can
// register one over a fixed configuration.
func RegisterHealthController(api huma.API, controller *controllers.HealthController) {
	huma.Register(api, huma.Operation{
		OperationID: "healthcheck",
		Method:      http.MethodGet,
		Path:        "/healthcheck",
		Summary:     "Report the running app",
		Tags:        []string{"System"},
	}, controller.CheckHealth)
}
