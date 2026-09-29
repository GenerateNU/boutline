package scoring

import (
	"net/http"

	"boutline/internal/types"

	"github.com/danielgtaylor/huma/v2"
)

const (
	scoringBasePath      = "/api/v1/scoring"
	scoringByMatchPath   = scoringBasePath + "/match/{match_id}"
)

func RegisterScoringRoutes(api huma.API, params *types.ServiceParams) {
	RegisterScoringService(api, NewScoringService(NewScoringRepository(params.DB)))
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
}
