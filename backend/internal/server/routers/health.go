package routers

import (
	"net/http"

	"boutline/internal/controllers"
	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

func HealthRoutes(api huma.API, params *types.ServiceParams) {
	handler := controllers.NewHealthHandler(params.Config)

	huma.Register(api, huma.Operation{
		OperationID: "healthcheck",
		Method:      http.MethodGet,
		Path:        "/healthcheck",
		Summary:     "Report the running app",
		Tags:        []string{"System"},
	}, handler.CheckHealth)
}
