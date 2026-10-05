package directelimination

import (
	"net/http"

	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

const directEliminationBasePath = "/api/v1/direct-eliminations"

func RegisterDirectEliminationRoutes(api huma.API, params *types.ServiceParams) {
	RegisterDirectEliminationService(api, NewDirectEliminationService(NewDirectEliminationRepository(params.DB)))
}

func RegisterDirectEliminationService(api huma.API, service DirectEliminationService) {
	huma.Register(api, huma.Operation{
		OperationID:   "createDirectElimination",
		Method:        http.MethodPost,
		Path:          directEliminationBasePath,
		Summary:       "Create a direct elimination round",
		Description:   "New rounds always start as upcoming. Use the start endpoint to begin one.",
		Tags:          []string{"Direct Eliminations"},
		DefaultStatus: http.StatusCreated,
	}, service.CreateDirectElimination)

	huma.Register(api, huma.Operation{
		OperationID: "listDirectEliminations",
		Method:      http.MethodGet,
		Path:        directEliminationBasePath,
		Summary:     "List direct elimination rounds",
		Description: "Optionally filter by event_id and status.",
		Tags:        []string{"Direct Eliminations"},
	}, service.ListDirectElimination)

	huma.Register(api, huma.Operation{
		OperationID: "getDirectEliminationByID",
		Method:      http.MethodGet,
		Path:        directEliminationBasePath + "/{id}",
		Summary:     "Get a direct elimination round by ID",
		Tags:        []string{"Direct Eliminations"},
	}, service.GetDirectEliminationByID)

	huma.Register(api, huma.Operation{
		OperationID: "updateDirectEliminationByID",
		Method:      http.MethodPatch,
		Path:        directEliminationBasePath + "/{id}",
		Summary:     "Update a direct elimination round",
		Description: "A round that has ended cannot be edited.",
		Tags:        []string{"Direct Eliminations"},
	}, service.UpdateDirectEliminationByID)

	huma.Register(api, huma.Operation{
		OperationID:   "deleteDirectEliminationByID",
		Method:        http.MethodDelete,
		Path:          directEliminationBasePath + "/{id}",
		Summary:       "Delete a direct elimination round",
		Tags:          []string{"Direct Eliminations"},
		DefaultStatus: http.StatusNoContent,
	}, service.DeleteDirectEliminationByID)

	huma.Register(api, huma.Operation{
		OperationID: "startDirectElimination",
		Method:      http.MethodPost,
		Path:        directEliminationBasePath + "/{id}/start",
		Summary:     "Start a direct elimination round",
		Description: "Moves an upcoming round to active and records started_at.",
		Tags:        []string{"Direct Eliminations"},
	}, service.StartDirectElimination)

	huma.Register(api, huma.Operation{
		OperationID: "completeDirectElimination",
		Method:      http.MethodPost,
		Path:        directEliminationBasePath + "/{id}/complete",
		Summary:     "Complete a direct elimination round",
		Description: "Moves an active round to end and records completed_at. The round becomes immutable.",
		Tags:        []string{"Direct Eliminations"},
	}, service.CompleteDirectElimination)
}
