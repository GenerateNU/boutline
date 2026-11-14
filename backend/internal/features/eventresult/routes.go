package eventresult

import (
	"net/http"

	"boutline/internal/features/event"
	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

const eventResultPath = "/api/v1/events/{id}/results"

func RegisterEventResultRoutes(api huma.API, params *types.ServiceParams) {
	RegisterEventResultService(api, NewEventResultService(
		NewEventResultRepository(params.DB),
		event.NewEventRepository(params.DB),
	))
}

func RegisterEventResultService(api huma.API, service EventResultService) {
	huma.Register(api, huma.Operation{
		OperationID: "listEventResults",
		Method:      http.MethodGet,
		Path:        eventResultPath,
		Summary:     "List an event's final classification",
		Description: "Built from the stages that have ended; empty until one has.",
		Tags:        []string{"Events"},
	}, service.ListEventResults)
}
