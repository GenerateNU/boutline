package poolstageresult

import (
	"net/http"

	"boutline/internal/features/event"
	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

const poolStageResultPath = "/api/v1/events/{id}/pool-stage-results"

func RegisterPoolStageResultRoutes(api huma.API, params *types.ServiceParams) {
	RegisterPoolStageResultService(api, NewPoolStageResultService(
		NewPoolStageResultRepository(params.DB),
		event.NewEventRepository(params.DB),
	))
}

func RegisterPoolStageResultService(api huma.API, service PoolStageResultService) {
	huma.Register(api, huma.Operation{
		OperationID: "listPoolStageResults",
		Method:      http.MethodGet,
		Path:        poolStageResultPath,
		Summary:     "List an event's pool stage results",
		Description: "Ranks every fencer of the event's latest pool stage across all its pools, " +
			"counting ended bouts only, so results update live while pools are fenced. Empty when the event has no pool stage.",
		Tags: []string{"Events"},
	}, service.ListPoolStageResults)
}
