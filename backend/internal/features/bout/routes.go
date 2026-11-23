package bout

import (
	"net/http"

	"boutline/internal/features/pool"
	"boutline/internal/features/tournament"
	"boutline/internal/features/tournamentuser"
	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

const boutBasePath = "/api/v1/bouts"

func RegisterBoutRoutes(api huma.API, params *types.ServiceParams) {
	RegisterBoutService(api, NewBoutService(
		NewBoutRepository(params.DB),
		tournament.NewTournamentRepository(params.DB),
		pool.NewPoolRepository(params.DB),
		tournamentuser.NewTournamentUserRepository(params.DB),
	))
}

func RegisterBoutService(api huma.API, service BoutService) {
	huma.Register(api, huma.Operation{
		OperationID:   "createBout",
		Method:        http.MethodPost,
		Path:          boutBasePath,
		Summary:       "Create a bout",
		Tags:          []string{"Bouts"},
		DefaultStatus: http.StatusCreated,
	}, service.CreateBout)

	huma.Register(api, huma.Operation{
		OperationID: "listBouts",
		Method:      http.MethodGet,
		Path:        boutBasePath,
		Summary:     "List bouts",
		Tags:        []string{"Bouts"},
	}, service.ListBouts)

	// Unpaginated: one fencer's pool and tableau bouts are a small, bounded set.
	huma.Register(api, huma.Operation{
		OperationID: "listCompetitorBouts",
		Method:      http.MethodGet,
		Path:        "/api/v1/competitors/{id}/bouts",
		Summary:     "List a competitor's pool and tableau bouts",
		Description: "Each bout is seen from the competitor's side. Scores are null until a bout starts.",
		Tags:        []string{"Bouts"},
	}, service.ListCompetitorBouts)

	huma.Register(api, huma.Operation{
		OperationID: "getBoutByID",
		Method:      http.MethodGet,
		Path:        boutBasePath + "/{id}",
		Summary:     "Get a bout by ID",
		Tags:        []string{"Bouts"},
	}, service.GetBoutByID)

	huma.Register(api, huma.Operation{
		OperationID: "updateBoutByID",
		Method:      http.MethodPatch,
		Path:        boutBasePath + "/{id}",
		Summary:     "Update a bout",
		Description: "Only upcoming bouts can be edited.",
		Tags:        []string{"Bouts"},
	}, service.UpdateBoutByID)

	huma.Register(api, huma.Operation{
		OperationID: "claimBout",
		Method:      http.MethodPost,
		Path:        boutBasePath + "/{id}/claim",
		Summary:     "Claim a bout as its referee",
		Description: "Sets referee_id to the caller. The caller needs the referee role in the bout's tournament; the bout must be upcoming and unassigned or already the caller's.",
		Tags:        []string{"Bouts"},
	}, service.ClaimBout)

	huma.Register(api, huma.Operation{
		OperationID: "startBout",
		Method:      http.MethodPost,
		Path:        boutBasePath + "/{id}/start",
		Summary:     "Start a bout",
		Description: "Moves an upcoming bout to active and records started_at. The tournament must be active and the bout must have a referee.",
		Tags:        []string{"Bouts"},
	}, service.StartBout)

	huma.Register(api, huma.Operation{
		OperationID: "endBout",
		Method:      http.MethodPost,
		Path:        boutBasePath + "/{id}/end",
		Summary:     "End a bout",
		Description: "Moves an active bout to end and records completed_at.",
		Tags:        []string{"Bouts"},
	}, service.EndBout)

	huma.Register(api, huma.Operation{
		OperationID:   "deleteBoutByID",
		Method:        http.MethodDelete,
		Path:          boutBasePath + "/{id}",
		Summary:       "Delete a bout",
		Description:   "Only upcoming or ended bouts can be deleted; an active bout must be ended first.",
		Tags:          []string{"Bouts"},
		DefaultStatus: http.StatusNoContent,
	}, service.DeleteBoutByID)
}
