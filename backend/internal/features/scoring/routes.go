package scoring

import (
	"net/http"

	"boutline/internal/cache"
	"boutline/internal/features/bout"
	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

const (
	scoringBasePath    = "/api/v1/scoring"
	scoringByMatchPath = scoringBasePath + "/match/{bout_id}"
)

func RegisterScoringRoutes(api huma.API, params *types.ServiceParams) {
	repo := NewScoringRepository(params.DB)
	// nil in the shared test app, which builds routes without a real Redis connection.
	if params.Redis != nil {
		repo = NewCachedScoringRepository(repo, cache.NewRedisCache(params.Redis))
	}

	RegisterScoringService(api, NewScoringService(repo, bout.NewBoutRepository(params.DB)))
}

func RegisterScoringService(api huma.API, service ScoringService) {
	huma.Register(api, huma.Operation{
		OperationID:   "createScoring",
		Method:        http.MethodPost,
		Path:          scoringBasePath,
		Summary:       "Create a scoring",
		Description:   "Create a new scoring entry.",
		Tags:          []string{"Scoring"},
		DefaultStatus: http.StatusCreated,
	}, service.CreateScoring)

	huma.Register(api, huma.Operation{
		OperationID: "getScoringByID",
		Method:      http.MethodGet,
		Path:        scoringBasePath + "/{id}",
		Summary:     "Get a scoring by ID",
		Tags:        []string{"Scoring"},
	}, service.GetScoringByID)

	huma.Register(api, huma.Operation{
		OperationID: "revokeScoring",
		Method:      http.MethodPost,
		Path:        scoringBasePath + "/{id}/revoke",
		Summary:     "Revoke a scoring",
		Tags:        []string{"Scoring"},
	}, service.RevokeScoring)

	huma.Register(api, huma.Operation{
		OperationID: "listScoring",
		Method:      http.MethodGet,
		Path:        scoringByMatchPath,

		Summary:     "List scoring for a match",
		Description: "Returns a match's scores in the order they were recorded. Revoked scores are excluded unless include_revoked is true.",
		Tags:        []string{"Scoring"},
	}, service.ListScoring)

	huma.Register(api, huma.Operation{
		OperationID: "updateScoringByID",
		Method:      http.MethodPatch,
		Path:        scoringBasePath + "/{id}",
		Summary:     "Update a scoring",
		Description: "A scoring that has been revoked cannot be edited.",
		Tags:        []string{"Scoring"},
	}, service.UpdateScoringByID)

	huma.Register(api, huma.Operation{
		OperationID: "getScoringHistory",
		Method:      http.MethodGet,
		Path:        scoringByMatchPath + "/history",
		Summary:     "List a match's score history",
		Description: "Returns all of a match's scores newest first by created_at, ties broken by id, undone ones included and marked with revoked_at, each with both competitors' running scores. Not paginated: a bout's scores are bounded by its points_to_win.",
		Tags:        []string{"Scoring"},
	}, service.GetScoringHistory)
}
