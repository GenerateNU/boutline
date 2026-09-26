package match

import (
	"net/http"

	"boutline/internal/features/tournament"
	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

const matchBasePath = "/api/v1/matches"

func RegisterMatchRoutes(api huma.API, params *types.ServiceParams) {
	RegisterMatchService(api, NewMatchService(NewMatchRepository(params.DB), tournament.NewTournamentRepository(params.DB)))
}

func RegisterMatchService(api huma.API, service MatchService) {
	huma.Register(api, huma.Operation{
		OperationID:   "createMatch",
		Method:        http.MethodPost,
		Path:          matchBasePath,
		Summary:       "Create a match",
		Tags:          []string{"Matches"},
		DefaultStatus: http.StatusCreated,
	}, service.CreateMatch)

	huma.Register(api, huma.Operation{
		OperationID: "listMatches",
		Method:      http.MethodGet,
		Path:        matchBasePath,
		Summary:     "List matches",
		Tags:        []string{"Matches"},
	}, service.ListMatches)

	huma.Register(api, huma.Operation{
		OperationID: "getMatchByID",
		Method:      http.MethodGet,
		Path:        matchBasePath + "/{id}",
		Summary:     "Get a match by ID",
		Tags:        []string{"Matches"},
	}, service.GetMatchByID)

	huma.Register(api, huma.Operation{
		OperationID: "updateMatchByID",
		Method:      http.MethodPatch,
		Path:        matchBasePath + "/{id}",
		Summary:     "Update a match",
		Description: "Only pending matches can be edited.",
		Tags:        []string{"Matches"},
	}, service.UpdateMatchByID)

	huma.Register(api, huma.Operation{
		OperationID: "startMatch",
		Method:      http.MethodPost,
		Path:        matchBasePath + "/{id}/start",
		Summary:     "Start a match",
		Description: "Moves a pending match to active and records its start time; the tournament must be active.",
		Tags:        []string{"Matches"},
	}, service.StartMatch)

	huma.Register(api, huma.Operation{
		OperationID: "endMatch",
		Method:      http.MethodPost,
		Path:        matchBasePath + "/{id}/end",
		Summary:     "End a match",
		Description: "Moves an active match to end.",
		Tags:        []string{"Matches"},
	}, service.EndMatch)

	huma.Register(api, huma.Operation{
		OperationID:   "deleteMatchByID",
		Method:        http.MethodDelete,
		Path:          matchBasePath + "/{id}",
		Summary:       "Delete a match",
		Description:   "Only pending or ended matches can be deleted; an active match must be ended first.",
		Tags:          []string{"Matches"},
		DefaultStatus: http.StatusNoContent,
	}, service.DeleteMatchByID)
}
