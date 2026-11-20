package poolresult

import (
	"net/http"

	"boutline/internal/features/event"
	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

const poolResultPath = "/api/v1/events/{id}/pool-results"

func RegisterPoolResultRoutes(api huma.API, params *types.ServiceParams) {
	RegisterPoolResultService(api, NewPoolResultService(
		NewPoolResultRepository(params.DB),
		event.NewEventRepository(params.DB),
	))
}

func RegisterPoolResultService(api huma.API, service PoolResultService) {
	huma.Register(api, huma.Operation{
		OperationID: "listPoolResults",
		Method:      http.MethodGet,
		Path:        poolResultPath,
		Summary:     "List an event's pool results",
		Description: "Ranks every fencer of the event's latest pool stage across all its pools, " +
			"counting ended bouts only, so results update live while pools are fenced. Empty when the event has no pool stage.",
		Tags: []string{"Events"},
	}, service.ListPoolResults)
}
