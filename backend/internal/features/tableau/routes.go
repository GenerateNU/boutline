package tableau

import (
	"net/http"

	"boutline/internal/features/event"
	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

const tableauPath = "/api/v1/events/{id}/tableau"

func RegisterTableauRoutes(api huma.API, params *types.ServiceParams) {
	RegisterTableauService(api, NewTableauService(
		NewTableauRepository(params.DB),
		event.NewEventRepository(params.DB),
	))
}

func RegisterTableauService(api huma.API, service TableauService) {
	// Deliberately unpaginated: a tableau is a bounded aggregate, not a list.
	huma.Register(api, huma.Operation{
		OperationID: "getTableauByEventID",
		Method:      http.MethodGet,
		Path:        tableauPath,
		Summary:     "Get an event's direct elimination tableau",
		Description: "Empty rounds until a tableau is drawn. Scores are null until a bout starts.",
		Tags:        []string{"Events"},
	}, service.GetTableau)
}
