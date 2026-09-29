package tournamentuser

import (
	"net/http"

	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

const (
	tournamentUserBasePath = "/api/v1/tournaments/{id}/users"
	userTournamentBasePath = "/api/v1/users/{id}/tournaments"
)

func RegisterTournamentUserRoutes(api huma.API, params *types.ServiceParams) {
	RegisterTournamentUserService(api, NewTournamentUserService(NewTournamentUserRepository(params.DB)))
}

func RegisterTournamentUserService(api huma.API, service TournamentUserService) {
	huma.Register(api, huma.Operation{
		OperationID:   "addTournamentUser",
		Method:        http.MethodPost,
		Path:          tournamentUserBasePath,
		Summary:       "Add a user to a tournament",
		Description:   "The role decides what the member is: a referee or an admin.",
		Tags:          []string{"Tournament Users"},
		DefaultStatus: http.StatusCreated,
	}, service.AddTournamentUser)

	huma.Register(api, huma.Operation{
		OperationID: "listTournamentUsers",
		Method:      http.MethodGet,
		Path:        tournamentUserBasePath,
		Summary:     "List the users in a tournament",
		Tags:        []string{"Tournament Users"},
	}, service.ListTournamentUsers)

	huma.Register(api, huma.Operation{
		OperationID: "updateTournamentUserRole",
		Method:      http.MethodPatch,
		Path:        tournamentUserBasePath + "/{user_id}",
		Summary:     "Change a member's role",
		Tags:        []string{"Tournament Users"},
	}, service.UpdateTournamentUserRole)

	huma.Register(api, huma.Operation{
		OperationID:   "removeTournamentUser",
		Method:        http.MethodDelete,
		Path:          tournamentUserBasePath + "/{user_id}",
		Summary:       "Remove a user from a tournament",
		Tags:          []string{"Tournament Users"},
		DefaultStatus: http.StatusNoContent,
	}, service.RemoveTournamentUser)

	huma.Register(api, huma.Operation{
		OperationID: "listTournamentsByUser",
		Method:      http.MethodGet,
		Path:        userTournamentBasePath,
		Summary:     "List the tournaments a user belongs to",
		Tags:        []string{"Tournament Users"},
	}, service.ListTournamentsByUser)
}
